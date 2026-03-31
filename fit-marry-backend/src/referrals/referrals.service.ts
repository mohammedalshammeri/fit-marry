import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCode(userId: string) {
    let referral = await this.prisma.referral.findUnique({ where: { userId } });
    
    // Automatically create a referral record if it doesn't exist, using the user's base referral code
    if (!referral) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException("User not found");
      }
      referral = await this.prisma.referral.create({
        data: {
          code: user.referralCode,
          userId: user.id
        }
      });
    }
    return referral;
  }

  async invite(userId: string, code: string) {
    const codeObj = code.trim().toUpperCase();
    const referral = await this.prisma.referral.findUnique({ where: { code: codeObj } });
    
    // Fallback: If referral table doesn't have it, check User natively and initialize Referral if needed
    let finalReferral = referral;
    if (!finalReferral) {
      const parentUser = await this.prisma.user.findUnique({ where: { referralCode: codeObj } });
      if (!parentUser) {
        throw new NotFoundException("Referral code not found");
      }
      // Create the Referral object for the parent user
      finalReferral = await this.prisma.referral.create({
        data: {
          code: parentUser.referralCode,
          userId: parentUser.id
        }
      });
    }

    if (finalReferral.userId === userId) {
      throw new BadRequestException("Self referral not allowed");
    }

    const existing = await this.prisma.referralEvent.findUnique({
      where: { referralId_referredUserId: { referralId: finalReferral.id, referredUserId: userId } },
    });
    
    if (existing) {
      throw new BadRequestException("Referral already applied");
    }

    // Create referral event with PENDING status - needs verification
    const newEvent = await this.prisma.referralEvent.create({
      data: {
        referralId: finalReferral.id,
        referredUserId: userId,
        status: "PENDING"
      },
    });

    return newEvent;
  }

  /** Verify a pending referral and reward the referrer (called after referred user completes profile) */
  async verifyReferral(referredUserId: string) {
    const events = await this.prisma.referralEvent.findMany({
      where: { referredUserId, status: "PENDING" },
      include: { referral: true },
    });

    for (const event of events) {
      // Check that the referred user has a completed profile (basic verification)
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId: referredUserId },
      });

      if (!profile?.nickname) continue; // Not yet completed profile

      // Mark as VERIFIED and reward the referrer
      await this.prisma.referralEvent.update({
        where: { id: event.id },
        data: { status: "REWARDED" },
      });

      // Reward: 3 days VIP for the referrer
      const currentExpiry = (await this.prisma.user.findUnique({ where: { id: event.referral.userId } }))?.adRewardExpiresAt;
      const base = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(base.getTime() + 3 * 24 * 60 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: event.referral.userId },
        data: { adRewardExpiresAt: newExpiry },
      });
    }
  }

  async getStatus(userId: string) {
    const referral = await this.getCode(userId); // Ensure it's generated
    
    const events = await this.prisma.referralEvent.findMany({
      where: { referralId: referral.id }
    });

    const verifiedCount = events.filter((event: any) => event.status === "VERIFIED" || event.status === "REWARDED").length;
    const pendingCount = events.filter((event: any) => event.status === "PENDING").length;
    return {
      code: referral.code,
      totalInvites: events.length,
      verifiedInvites: verifiedCount,
      pendingInvites: pendingCount,
      eligibleForFeeWaiver: verifiedCount >= 3,
    };
  }
}
