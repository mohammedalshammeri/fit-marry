import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLikeDto } from "./dto/create-like.dto";
import { AccessControlService } from "../access-control/access-control.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createLike(userId: string, dto: CreateLikeDto) {
    await this.accessControl.ensureAccess(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (dto.toUserId === userId) {
      throw new BadRequestException("Cannot like yourself");
    }

    // Check if target is dismissed
    const dismissed = await this.prisma.userDismiss.findUnique({
      where: { dismisserUserId_dismissedUserId: { dismisserUserId: userId, dismissedUserId: dto.toUserId } },
    });
    if (dismissed) {
      throw new BadRequestException("User has been dismissed");
    }

    // Check like limits
    await this.checkLikePermission(user, !!dto.isSuperLike);

    const target = await this.prisma.user.findUnique({ where: { id: dto.toUserId } });
    if (!target) {
      throw new NotFoundException("User not found");
    }

    if (user.marriageType !== "PERMANENT" || target.marriageType !== "PERMANENT") {
      throw new BadRequestException("Likes are only available for permanent matches");
    }

    // Check Inbound Limits for Target
    const maxInboundLikes = await this.getSettingNumber("maxInboundLikes", 9);
    const inboundLikesCount = await this.prisma.like.count({
      where: { toUserId: dto.toUserId, status: "PENDING" },
    });

    if (inboundLikesCount >= maxInboundLikes) {
      throw new BadRequestException("User has reached inbound likes limit");
    }

    const existing = await this.prisma.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId: userId, toUserId: dto.toUserId } },
    });

    if (existing) {
      throw new BadRequestException("Like already exists");
    }

    // Record SuperLike separately if applicable
    if (dto.isSuperLike) {
      await this.prisma.superLike.upsert({
        where: { fromUserId_toUserId: { fromUserId: userId, toUserId: dto.toUserId } },
        update: {},
        create: { fromUserId: userId, toUserId: dto.toUserId },
      });
    }

    const reciprocal = await this.prisma.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId: dto.toUserId, toUserId: userId } },
    });

    if (reciprocal && reciprocal.status !== "PENDING") {
      throw new BadRequestException("Like already processed by other user");
    }

    if (reciprocal?.status === "PENDING") {
      // Auto-match: create conversation
      await this.checkConversationLimit(userId, user);
      await this.checkConversationLimit(target.id, target);

      const result = await this.prisma.$transaction(async (tx: any) => {
        await tx.like.update({
          where: { id: reciprocal.id },
          data: { status: "ACCEPTED" },
        });

        const newLike = await tx.like.create({
          data: {
            fromUserId: userId,
            toUserId: dto.toUserId,
            status: "ACCEPTED",
            isSuperLike: !!dto.isSuperLike,
          },
        });

        const conversation = await tx.conversation.create({
          data: {
            participants: {
              create: [{ userId }, { userId: dto.toUserId }],
            },
          },
        });

        return {
          like: newLike,
          conversationId: conversation.id,
          matched: true,
        };
      });

      await this.notificationsService.notifyUser(dto.toUserId, {
        type: "MATCH_CREATED",
        payload: {
          conversationId: result.conversationId,
          matchedUserId: userId,
        },
      }, {
        title: "تطابق جديد!",
        body: "أصبح بإمكانك بدء المحادثة الآن.",
        data: { conversationId: result.conversationId },
      });

      return result;
    }

    // No reciprocal — create pending like
    const like = await this.prisma.like.create({
      data: {
        fromUserId: userId,
        toUserId: dto.toUserId,
        isSuperLike: !!dto.isSuperLike,
      },
    });

    const notifBody = dto.isSuperLike
      ? "شخص ما أرسل لك سوبر لايك! ⭐ افتح التطبيق لمراجعة الطلب."
      : "شخص ما أعجب بك. افتح التطبيق لمراجعة الطلب.";

    await this.notificationsService.notifyUser(dto.toUserId, {
      type: dto.isSuperLike ? "SUPER_LIKE" : "NEW_LIKE",
      payload: { likeId: like.id, fromUserId: userId, isSuperLike: !!dto.isSuperLike },
    }, {
      title: dto.isSuperLike ? "سوبر لايك جديد ⭐" : "إعجاب جديد",
      body: notifBody,
      data: { likeId: like.id },
    });

    return { like, matched: false };
  }

  async getInbox(userId: string) {
    return this.prisma.like.findMany({
      where: { toUserId: userId, status: "PENDING" },
      include: {
        fromUser: { include: { profile: true } },
      },
      orderBy: [
        { isSuperLike: "desc" }, // Super likes first
        { createdAt: "desc" },
      ],
    });
  }

  async acceptLike(userId: string, likeId: string) {
    await this.accessControl.ensureAccess(userId);
    
    const like = await this.prisma.like.findUnique({ where: { id: likeId } });
    if (!like || like.toUserId !== userId) {
      throw new NotFoundException("Like not found");
    }
    if (like.status !== "PENDING") {
      throw new BadRequestException("Like already processed");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const target = await this.prisma.user.findUnique({ where: { id: like.fromUserId } });

    if (!user || !target) {
      throw new NotFoundException("User not found");
    }

    await this.checkConversationLimit(userId, user);
    await this.checkConversationLimit(target.id, target);

    const result = await this.prisma.$transaction(async (tx: any) => {
      await tx.like.update({ where: { id: likeId }, data: { status: "ACCEPTED" } });

      const conversation = await tx.conversation.create({
        data: {
          participants: {
            create: [{ userId }, { userId: like.fromUserId }],
          },
        },
      });

      return { conversationId: conversation.id };
    });

    await this.notificationsService.notifyUser(like.fromUserId, {
      type: "MATCH_ACCEPTED",
      payload: {
        conversationId: result.conversationId,
        acceptedByUserId: userId,
      },
    }, {
      title: "تم قبول إعجابك",
      body: "حدث تطابق جديد ويمكنك بدء المحادثة الآن.",
      data: { conversationId: result.conversationId },
    });

    return result;
  }

  async rejectLike(userId: string, likeId: string) {
    const like = await this.prisma.like.findUnique({ where: { id: likeId } });
    if (!like || like.toUserId !== userId) {
      throw new NotFoundException("Like not found");
    }
    if (like.status !== "PENDING") {
      throw new BadRequestException("Like already processed");
    }

    await this.prisma.like.update({
      where: { id: likeId },
      data: { status: "REJECTED" },
    });

    return { success: true };
  }

  // --- Logic Helpers ---

  private async checkLikePermission(user: any, isSuperLike: boolean) {
    if (user.subscriptionTier === "PREMIUM") return true;

    if (user.adRewardExpiresAt && new Date(user.adRewardExpiresAt) > new Date()) {
      return true;
    }

    // Super likes require premium
    if (isSuperLike) {
      throw new BadRequestException("Super Like is a premium feature. Subscribe to use it.");
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.like.count({
      where: {
        fromUserId: user.id,
        createdAt: { gte: startOfDay },
      },
    });

    if (count >= 15) {
      throw new BadRequestException("Daily free likes limit reached (15). Subscribe for unlimited.");
    }
    
    return true;
  }

  private async checkConversationLimit(userId: string, user: any) {
    const isTempPremium = user.adRewardExpiresAt && new Date(user.adRewardExpiresAt) > new Date();
    const limit = (user.subscriptionTier === "PREMIUM" || isTempPremium) ? 5 : 3;

    const count = await this.prisma.conversation.count({
      where: {
        status: "ACTIVE",
        participants: { some: { userId, isActive: true } },
      },
    });

    if (count >= limit) {
      throw new BadRequestException(`User has reached the maximum of ${limit} active conversations.`);
    }
  }

  private async getSettingNumber(key: string, fallback: number) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) return fallback;
    const value = setting.value as { value?: number } | number;
    if (typeof value === "number") return value;
    if (typeof value === "object" && typeof value.value === "number") return value.value;
    return fallback;
  }
}
