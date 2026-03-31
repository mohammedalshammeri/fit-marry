import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rate a user after a conversation ends */
  async rateUser(
    raterUserId: string,
    dto: {
      ratedUserId: string;
      conversationId: string;
      respect: number;
      seriousness: number;
      honesty: number;
      comment?: string;
    },
  ) {
    if (raterUserId === dto.ratedUserId) {
      throw new BadRequestException("Cannot rate yourself");
    }

    // Validate scores are 1-5
    for (const field of ['respect', 'seriousness', 'honesty'] as const) {
      const val = dto[field];
      if (val < 1 || val > 5 || !Number.isInteger(val)) {
        throw new BadRequestException(`${field} must be an integer between 1 and 5`);
      }
    }

    // Verify both are participants in the conversation
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: dto.conversationId },
      select: { userId: true },
    });
    const participantIds = participants.map(p => p.userId);
    if (!participantIds.includes(raterUserId) || !participantIds.includes(dto.ratedUserId)) {
      throw new BadRequestException("Both users must be participants in the conversation");
    }

    // Check if already rated in this conversation
    const existing = await this.prisma.userRating.findUnique({
      where: { raterUserId_conversationId: { raterUserId, conversationId: dto.conversationId } },
    });
    if (existing) {
      throw new BadRequestException("You have already rated this user for this conversation");
    }

    const rating = await this.prisma.userRating.create({
      data: {
        ratedUserId: dto.ratedUserId,
        raterUserId,
        conversationId: dto.conversationId,
        respect: dto.respect,
        seriousness: dto.seriousness,
        honesty: dto.honesty,
        comment: dto.comment,
      },
    });

    // Update user's reputation score
    await this.recalculateReputation(dto.ratedUserId);

    return rating;
  }

  /** Get a user's public reputation */
  async getReputation(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { reputationScore: true, totalRatings: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const ratings = await this.prisma.userRating.findMany({
      where: { ratedUserId: userId },
      select: { respect: true, seriousness: true, honesty: true },
    });

    const avgRespect = ratings.length ? ratings.reduce((s, r) => s + r.respect, 0) / ratings.length : 0;
    const avgSeriousness = ratings.length ? ratings.reduce((s, r) => s + r.seriousness, 0) / ratings.length : 0;
    const avgHonesty = ratings.length ? ratings.reduce((s, r) => s + r.honesty, 0) / ratings.length : 0;

    return {
      overallScore: user.reputationScore,
      totalRatings: user.totalRatings,
      breakdown: {
        respect: Math.round(avgRespect * 10) / 10,
        seriousness: Math.round(avgSeriousness * 10) / 10,
        honesty: Math.round(avgHonesty * 10) / 10,
      },
    };
  }

  private async recalculateReputation(userId: string) {
    const ratings = await this.prisma.userRating.findMany({
      where: { ratedUserId: userId },
      select: { respect: true, seriousness: true, honesty: true },
    });

    if (ratings.length === 0) return;

    const totalScore = ratings.reduce((sum, r) => {
      return sum + (r.respect + r.seriousness + r.honesty) / 3;
    }, 0);
    const avgScore = totalScore / ratings.length;
    // Normalize to 0-5 scale
    const reputationScore = Math.round(avgScore * 10) / 10;

    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationScore, totalRatings: ratings.length },
    });
  }
}
