import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface NotificationPayload {
  type: string;
  payload: Record<string, unknown>;
}

export interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
    return { success: true };
  }

  async createNotification(userId: string, data: NotificationPayload) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        payload: data.payload as any,
      },
    });
  }

  async sendPush(userId: string, payload: PushMessagePayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (!user?.pushToken) {
      return { delivered: false, reason: "missing_push_token" };
    }

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: user.pushToken,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: "default",
        }),
      });

      return { delivered: response.ok, status: response.status };
    } catch (error) {
      this.logger.error(`Push send failed for ${userId}`, error);
      return { delivered: false, reason: "send_error" };
    }
  }

  private async sendPushBatch(tokens: string[], payload: PushMessagePayload) {
    const BATCH_SIZE = 100;
    let totalSent = 0;

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE).map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: "default" as const,
      }));

      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(batch),
        });
        if (response.ok) totalSent += batch.length;
      } catch (error) {
        this.logger.error(`Batch push failed at offset ${i}`, error);
      }
    }

    return totalSent;
  }

  async notifyUser(userId: string, data: NotificationPayload, push?: PushMessagePayload) {
    const notification = await this.createNotification(userId, data);
    if (push) {
      await this.sendPush(userId, push);
    }
    return notification;
  }

  async listNotifications(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, page, limit };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, status: "QUEUED" },
    });
    return { unreadCount: count };
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: "READ", readAt: new Date() },
    });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, status: { not: "READ" } },
      data: { status: "READ", readAt: new Date() },
    });
    return { success: true };
  }

  async deleteNotification(userId: string, notificationId: string) {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return { success: true };
  }

  // ─── Admin Broadcast ──────────────────────────────────────

  async createBroadcast(adminId: string, dto: {
    title: string;
    titleEn?: string;
    body: string;
    bodyEn?: string;
    type?: string;
    targetGroup?: string;
    imageUrl?: string;
    actionUrl?: string;
  }) {
    const where: any = { status: "ACTIVE" };

    if (dto.targetGroup === "PREMIUM") {
      where.subscriptions = { some: { status: "ACTIVE" } };
    } else if (dto.targetGroup === "FREE") {
      where.subscriptions = { none: { status: "ACTIVE" } };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, pushToken: true },
    });

    const broadcast = await this.prisma.adminBroadcast.create({
      data: {
        adminId,
        title: dto.title,
        titleEn: dto.titleEn,
        body: dto.body,
        bodyEn: dto.bodyEn,
        type: dto.type || "PROMO",
        targetGroup: dto.targetGroup || "ALL",
        imageUrl: dto.imageUrl,
        actionUrl: dto.actionUrl,
        sentCount: users.length,
      },
    });

    // Create in-app notifications for all targeted users
    if (users.length > 0) {
      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: "ADMIN_BROADCAST",
          payload: {
            broadcastId: broadcast.id,
            title: dto.title,
            titleEn: dto.titleEn,
            body: dto.body,
            bodyEn: dto.bodyEn,
            imageUrl: dto.imageUrl,
            actionUrl: dto.actionUrl,
            broadcastType: dto.type || "PROMO",
          } as any,
        })),
      });

      // Send push notifications in batches
      const tokens = users.map((u) => u.pushToken).filter(Boolean) as string[];
      if (tokens.length > 0) {
        await this.sendPushBatch(tokens, {
          title: dto.title,
          body: dto.body,
          data: {
            type: "ADMIN_BROADCAST",
            broadcastId: broadcast.id,
            actionUrl: dto.actionUrl,
          },
        });
      }
    }

    return { ...broadcast, recipientCount: users.length };
  }

  async listBroadcasts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.adminBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.adminBroadcast.count(),
    ]);
    return { items, total, page, limit };
  }

  async deleteBroadcast(id: string) {
    await this.prisma.adminBroadcast.delete({ where: { id } });
    return { success: true };
  }
}
