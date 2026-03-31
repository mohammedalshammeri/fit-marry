import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if the user is allowed to perform restricted actions (Chat, Call, Like).
   * Logic:
   * 1. Free for first 3 days since registration.
   * 2. Active ad reward grants temporary VIP access.
   * 3. After 3 days, requires active subscription.
   */
  async ensureAccess(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: {
            isActive: true,
            endsAt: { gt: new Date() },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // 1. Check 3-day free period
    const now = new Date();
    const createdAt = new Date(user.createdAt);
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays <= 3) {
      return; // Free period active
    }

    // 2. Check active ad reward (temporary VIP from watching ads)
    if (user.adRewardExpiresAt && user.adRewardExpiresAt > now) {
      return; // Ad reward VIP active
    }

    // 3. Check Subscription
    if (user.subscriptions && user.subscriptions.length > 0) {
      return; // Active subscription found
    }

    throw new ForbiddenException("Free trial ended. Please subscribe to continue.");
  }
}
