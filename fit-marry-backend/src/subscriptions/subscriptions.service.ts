import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../common/services/payment.service';
import { EmailService } from '../common/services/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptions() {
    this.logger.log('Starting daily check for expired subscriptions...');
    
    const expired = await this.prisma.userSubscription.findMany({
      where: {
        isActive: true,
        endsAt: { lt: new Date() },
      },
    });

    for (const sub of expired) {
      await this.prisma.$transaction([
        this.prisma.userSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        }),
        this.prisma.user.update({
          where: { id: sub.userId },
          data: { subscriptionTier: 'FREE' },
        }),
      ]);
      this.logger.log(`Expired subscription ${sub.id} for user ${sub.userId}`);
    }

    this.logger.log(`Finished daily check. Expired ${expired.length} subscriptions.`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyExpiringSubscriptions() {
    // Notify users whose subscription expires in 3 days
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const expiring = await this.prisma.userSubscription.findMany({
      where: {
        isActive: true,
        endsAt: { gte: twoDaysFromNow, lte: threeDaysFromNow },
      },
      include: { user: true },
    });

    for (const sub of expiring) {
      const daysLeft = Math.ceil((sub.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      if (sub.user.email) {
        await this.emailService.sendSubscriptionExpiring(sub.user.email, daysLeft);
      }

      await this.notificationsService.notifyUser(sub.userId, {
        type: 'SUBSCRIPTION_EXPIRING',
        payload: { daysLeft },
      }, {
        title: 'اشتراكك سينتهي قريباً ⏰',
        body: `متبقي ${daysLeft} أيام على انتهاء اشتراكك المميز`,
      });
    }

    if (expiring.length > 0) {
      this.logger.log(`Notified ${expiring.length} users about expiring subscriptions`);
    }
  }

  async onModuleInit() {
    const count = await this.prisma.subscriptionPackage.count();
    if (count === 0) {
      await this.prisma.subscriptionPackage.createMany({
        data: [
          {
            name: 'FitMarry Plus',
            nameAr: 'فت ماري بلس',
            description: 'Get more out of FitMarry with enhanced features',
            descriptionAr: 'استمتع بمزايا إضافية مع فت ماري بلس',
            badgeText: null,
            badgeTextAr: null,
            color: '#FF6B6B',
            sortOrder: 1,
            price: 49.99,
            durationDays: 30,
            features: {
              unlimitedLikes: true,
              seeWhoLikesYou: false,
              superLikesPerDay: 3,
              boostsPerMonth: 1,
              travelMode: true,
              advancedFilters: true,
              noAds: true,
              priorityLikes: false,
              messageBeforeMatch: false,
              profileBoost: false,
              undoLike: true,
              dailyMatchesLimit: 10,
              chatLimit: 5,
              readReceipts: false,
              aiMatchmaker: false,
            },
          },
          {
            name: 'FitMarry Gold',
            nameAr: 'فت ماري ذهبي',
            description: 'See who likes you and get priority in discovery',
            descriptionAr: 'شاهد من أعجب بك واحصل على أولوية في الاستكشاف',
            badgeText: 'Most Popular',
            badgeTextAr: 'الأكثر شعبية',
            color: '#FFD700',
            sortOrder: 2,
            price: 99.99,
            durationDays: 30,
            features: {
              unlimitedLikes: true,
              seeWhoLikesYou: true,
              superLikesPerDay: 5,
              boostsPerMonth: 3,
              travelMode: true,
              advancedFilters: true,
              noAds: true,
              priorityLikes: true,
              messageBeforeMatch: false,
              profileBoost: true,
              undoLike: true,
              dailyMatchesLimit: -1,
              chatLimit: 10,
              readReceipts: true,
              aiMatchmaker: false,
            },
          },
          {
            name: 'FitMarry Platinum',
            nameAr: 'فت ماري بلاتينيوم',
            description: 'The ultimate experience with AI matchmaking and message before match',
            descriptionAr: 'التجربة المطلقة مع الخاطبة الذكية والتواصل قبل التوافق',
            badgeText: 'Best Value',
            badgeTextAr: 'أفضل قيمة',
            color: '#B76EF0',
            sortOrder: 3,
            price: 199.99,
            durationDays: 30,
            features: {
              unlimitedLikes: true,
              seeWhoLikesYou: true,
              superLikesPerDay: 10,
              boostsPerMonth: 5,
              travelMode: true,
              advancedFilters: true,
              noAds: true,
              priorityLikes: true,
              messageBeforeMatch: true,
              profileBoost: true,
              undoLike: true,
              dailyMatchesLimit: -1,
              chatLimit: -1,
              readReceipts: true,
              aiMatchmaker: true,
            },
          },
        ],
      });
      console.log('Seeded default subscription packages (Plus / Gold / Platinum)');
    }
  }

  async getPackages() {
    return this.prisma.subscriptionPackage.findMany({
      where: { isActive: true },
    });
  }

  async subscribe(userId: string, dto: CreateSubscriptionDto) {
    const pkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: dto.packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Subscription package not found');
    }

    // Check if already subscribed
    const existingSub = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        isActive: true,
        endsAt: { gt: new Date() },
      },
    });

    if (existingSub) {
        throw new BadRequestException('You already have an active subscription');
    }

    const autoRenew = (dto as any).autoRenew ?? false;

    // If Stripe is configured and auto-renew requested, create a Stripe subscription
    if (this.paymentService.isConfigured && autoRenew) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        const customerId = await this.paymentService.createOrGetCustomer(user.email, userId);
        const result = await this.paymentService.createSubscription({
          customerId,
          priceAmount: Number(pkg.price),
          currency: 'usd',
          intervalDays: pkg.durationDays,
          userId,
          packageId: pkg.id,
        });

        if ('subscriptionId' in result) {
          return {
            subscriptionId: result.subscriptionId,
            clientSecret: result.clientSecret,
            packageId: pkg.id,
            autoRenew: true,
            requiresPayment: true,
          };
        }
      }
    }

    // If Stripe is configured, create a payment intent (one-time)
    if (this.paymentService.isConfigured) {
      const payment = await this.paymentService.createPaymentIntent({
        amount: Number(pkg.price),
        currency: 'usd',
        userId,
        packageId: pkg.id,
        packageName: pkg.name,
      });

      if ('clientSecret' in payment) {
        return {
          clientSecret: payment.clientSecret,
          paymentIntentId: payment.paymentIntentId,
          packageId: pkg.id,
          requiresPayment: true,
        };
      }
    }

    // Mock payment flow (when Stripe is not configured)
    return this.activateSubscription(userId, pkg.id, autoRenew);
  }

  async activateSubscription(userId: string, packageId: string, autoRenew = false, stripeSubscriptionId?: string) {
    const pkg = await this.prisma.subscriptionPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const now = new Date();
    const endsAt = new Date();
    endsAt.setDate(now.getDate() + pkg.durationDays);

    // Transaction: Create Subscription record and Update User Tier
    const result = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.userSubscription.create({
        data: {
          userId,
          packageId: pkg.id,
          startsAt: now,
          endsAt,
          isActive: true,
          autoRenew,
          stripeSubscriptionId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'PREMIUM',
        },
      });

      return sub;
    });

    // Send subscription confirmation email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await this.emailService.sendSubscriptionConfirmation(user.email, pkg.name, endsAt);
    }

    // Send push notification
    await this.notificationsService.notifyUser(userId, {
      type: 'SUBSCRIPTION_ACTIVATED',
      payload: { packageName: pkg.name, endsAt: endsAt.toISOString() },
    }, {
      title: 'تم تفعيل اشتراكك! 🌟',
      body: `باقة ${pkg.name} مفعّلة حتى ${endsAt.toLocaleDateString('ar-SA')}`,
    });

    return result;
  }

  async confirmPayment(userId: string, paymentIntentId: string, packageId: string) {
    const verification = await this.paymentService.verifyPayment(paymentIntentId);
    if (!verification.success) {
      throw new BadRequestException('Payment not completed');
    }
    return this.activateSubscription(userId, packageId, false);
  }

  async getMySubscription(userId: string) {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, isActive: true, endsAt: { gt: new Date() } },
      include: { package: true },
      orderBy: { endsAt: 'desc' },
    });

    if (!sub) {
      return { active: false };
    }

    return {
      active: true,
      id: sub.id,
      packageName: sub.package.name,
      packageNameAr: (sub.package as any).nameAr ?? null,
      price: Number(sub.package.price),
      features: sub.package.features,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt,
      autoRenew: sub.autoRenew,
      daysLeft: Math.ceil((sub.endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    };
  }
  
  async unsubscribe(userId: string) {
      const activeSub = await this.prisma.userSubscription.findFirst({
        where: { userId, isActive: true },
      });

      // Cancel Stripe subscription if exists
      if (activeSub?.stripeSubscriptionId) {
        await this.paymentService.cancelSubscription(activeSub.stripeSubscriptionId);
      }

      await this.prisma.$transaction(async (tx) => {
          await tx.userSubscription.updateMany({
              where: { userId, isActive: true },
              data: { isActive: false, autoRenew: false }
          });
          
          await tx.user.update({
              where: { id: userId },
              data: { subscriptionTier: 'FREE' }
          });
      });
      
      return { message: 'Unsubscribed successfully' };
  }

  async refundSubscription(subscriptionId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { package: true },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    // Cancel Stripe if applicable
    if (sub.stripeSubscriptionId) {
      await this.paymentService.cancelSubscription(sub.stripeSubscriptionId);
    }

    // Issue refund if payment was made
    if (sub.paymentIntentId) {
      await this.paymentService.issueRefund(sub.paymentIntentId);
    }

    // Deactivate subscription
    await this.prisma.$transaction(async (tx) => {
      await tx.userSubscription.update({
        where: { id: subscriptionId },
        data: { isActive: false, autoRenew: false },
      });

      // Check if user has other active subs
      const otherSubs = await tx.userSubscription.count({
        where: { userId: sub.userId, isActive: true, id: { not: subscriptionId } },
      });

      if (otherSubs === 0) {
        await tx.user.update({
          where: { id: sub.userId },
          data: { subscriptionTier: 'FREE' },
        });
      }
    });

    return { success: true, message: 'Subscription refunded successfully' };
  }
}
