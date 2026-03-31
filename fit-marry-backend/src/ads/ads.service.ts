import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AdsService {
  // In-memory reward token store (short-lived, 5 min TTL)
  private rewardTokens = new Map<string, { userId: string; type: string; createdAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /** Generate a one-time reward token that the client must obtain before claiming */
  generateRewardToken(userId: string, rewardType: string) {
    const token = crypto.randomBytes(24).toString('hex');
    this.rewardTokens.set(token, { userId, type: rewardType, createdAt: Date.now() });

    // Cleanup tokens older than 5 min
    const fiveMin = 5 * 60 * 1000;
    for (const [k, v] of this.rewardTokens.entries()) {
      if (Date.now() - v.createdAt > fiveMin) this.rewardTokens.delete(k);
    }

    return { token, expiresInSeconds: 300 };
  }

  async processReward(userId: string, rewardType: string, rewardToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // Verify reward token if provided (production flow)
    if (rewardToken) {
      const stored = this.rewardTokens.get(rewardToken);
      if (!stored) throw new BadRequestException('Invalid or expired reward token');
      if (stored.userId !== userId) throw new BadRequestException('Token does not belong to this user');
      if (stored.type !== rewardType) throw new BadRequestException('Token type mismatch');
      if (Date.now() - stored.createdAt > 5 * 60 * 1000) {
        this.rewardTokens.delete(rewardToken);
        throw new BadRequestException('Reward token expired');
      }
      this.rewardTokens.delete(rewardToken); // One-time use
    } else if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Reward token is required');
    }
    // In development, allow without token for testing

    if (rewardType === 'TEMP_VIP') {
      const thirtyMinsFromNow = new Date(Date.now() + 30 * 60 * 1000);
      await this.prisma.user.update({
        where: { id: userId },
        data: { adRewardExpiresAt: thirtyMinsFromNow }
      });
      return { message: '30 minutes VIP granted' };
    }
    if (rewardType === 'FREE_LIKES') {
      await this.prisma.wallet.update({
        where: { userId },
        data: { balanceCredits: { increment: 5 } }
      });
      return { message: '5 free likes granted' };
    }
    throw new BadRequestException('Invalid reward type');
  }
}

