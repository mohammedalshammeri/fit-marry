import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvoice(subscriptionId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        package: true,
      },
    });

    if (!sub) {
      throw new Error('Subscription not found');
    }

    const invoice = {
      invoiceNumber: `INV-${sub.id.slice(0, 8).toUpperCase()}`,
      date: sub.createdAt.toISOString(),
      dueDate: sub.startsAt.toISOString(),
      status: sub.isActive ? 'PAID' : 'CANCELED',
      customer: {
        userId: sub.user.id,
        email: sub.user.email,
        phone: sub.user.phone,
      },
      items: [
        {
          description: sub.package.name,
          durationDays: sub.package.durationDays,
          price: Number(sub.package.price),
          quantity: 1,
          total: Number(sub.package.price),
        },
      ],
      subtotal: Number(sub.package.price),
      tax: 0,
      total: Number(sub.package.price),
      currency: 'USD',
      period: {
        from: sub.startsAt.toISOString(),
        to: sub.endsAt.toISOString(),
      },
      paymentMethod: sub.stripeSubscriptionId ? 'Stripe' : sub.paymentIntentId ? 'Stripe One-Time' : 'System',
      autoRenew: sub.autoRenew,
    };

    return invoice;
  }

  async getInvoicesForUser(userId: string) {
    const subs = await this.prisma.userSubscription.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });

    return subs.map((sub) => ({
      invoiceNumber: `INV-${sub.id.slice(0, 8).toUpperCase()}`,
      subscriptionId: sub.id,
      packageName: sub.package.name,
      amount: Number(sub.package.price),
      currency: 'USD',
      date: sub.createdAt,
      status: sub.isActive ? 'PAID' : 'CANCELED',
      period: { from: sub.startsAt, to: sub.endsAt },
    }));
  }
}
