import { Injectable, Logger, ForbiddenException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { CompatibilityService } from "./compatibility.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class DailyMatchService {
  private readonly logger = new Logger(DailyMatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly compatibilityService: CompatibilityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Get today's AI-suggested matches for user (requires aiMatchmaker package feature) */
  async getDailyMatches(userId: string) {
    // Check if user has the feature
    const hasFeature = await this.hasAiMatchmakerFeature(userId);
    if (!hasFeature) {
      throw new ForbiddenException("ميزة الخاطبة الذكية متاحة فقط ضمن الباقات التي تدعمها");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matches = await this.prisma.dailyMatch.findMany({
      where: {
        userId,
        sentAt: { gte: today },
      },
      include: {
        matchedUser: {
          select: {
            id: true,
            marriageType: true,
            verificationStatus: true,
            reputationScore: true,
            profile: true,
          },
        },
      },
      orderBy: { score: "desc" },
    });

    return matches.map(m => ({
      id: m.id,
      matchedUser: {
        userId: m.matchedUser.id,
        marriageType: m.matchedUser.marriageType,
        isVerified: m.matchedUser.verificationStatus === "VERIFIED",
        reputationScore: m.matchedUser.reputationScore,
        profile: m.matchedUser.profile,
      },
      compatibilityScore: Math.round(m.score),
      status: m.status,
    }));
  }

  /** Mark a daily match as viewed/liked/skipped */
  async updateMatchStatus(userId: string, matchId: string, status: 'VIEWED' | 'LIKED' | 'SKIPPED') {
    const match = await this.prisma.dailyMatch.findUnique({ where: { id: matchId } });
    if (!match || match.userId !== userId) {
      throw new ForbiddenException("Match not found");
    }

    await this.prisma.dailyMatch.update({
      where: { id: matchId },
      data: {
        status: status as any,
        ...(status === 'VIEWED' ? { viewedAt: new Date() } : {}),
        ...(status === 'LIKED' || status === 'SKIPPED' ? { actionAt: new Date() } : {}),
      },
    });

    return { success: true };
  }

  /** Daily cron: generate matches for all users with AI matchmaker feature */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async generateDailyMatches() {
    this.logger.log("Generating daily AI matches...");

    // Find users with active subscriptions that have aiMatchmaker
    const subscribers = await this.prisma.userSubscription.findMany({
      where: {
        isActive: true,
        endsAt: { gt: new Date() },
      },
      include: { package: true, user: { select: { id: true, status: true, marriageType: true } } },
    });

    const eligibleUsers = subscribers.filter(s => {
      const features = (s.package.features as Record<string, any>) || {};
      return features.aiMatchmaker === true && s.user.status === "ACTIVE";
    });

    let totalGenerated = 0;

    for (const sub of eligibleUsers) {
      try {
        const count = await this.generateForUser(sub.user.id);
        totalGenerated += count;
      } catch (e) {
        this.logger.error(`Failed to generate matches for user ${sub.user.id}`, e);
      }
    }

    this.logger.log(`Generated ${totalGenerated} daily matches for ${eligibleUsers.length} users`);
  }

  private async generateForUser(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user?.profile) return 0;

    // Get excluded IDs (blocked, dismissed, already matched today)
    const [blocks, dismissals] = await Promise.all([
      this.prisma.userBlock.findMany({
        where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
        select: { blockerUserId: true, blockedUserId: true },
      }),
      this.prisma.userDismiss.findMany({
        where: { dismisserUserId: userId },
        select: { dismissedUserId: true },
      }),
    ]);

    const excludeIds = new Set([
      userId,
      ...blocks.map(b => b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId),
      ...dismissals.map(d => d.dismissedUserId),
    ]);

    // Get potential candidates
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        status: "ACTIVE",
        marriageType: user.marriageType,
        profile: { isNot: null },
      },
      include: { profile: true },
      take: 100, // Score top 100 candidates
    });

    // Calculate scores
    const scored = candidates
      .filter(c => c.profile)
      .map(c => ({
        userId: c.id,
        score: this.compatibilityService.computeScore(user.profile as any, c.profile as any),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3 matches per day

    if (scored.length === 0) return 0;

    // Create daily match records
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const match of scored) {
      await this.prisma.dailyMatch.upsert({
        where: {
          userId_matchedUserId_sentAt: {
            userId,
            matchedUserId: match.userId,
            sentAt: today,
          },
        },
        update: { score: match.score },
        create: {
          userId,
          matchedUserId: match.userId,
          score: match.score,
          sentAt: today,
        },
      });
    }

    // Send notification
    await this.notificationsService.notifyUser(userId, {
      type: "DAILY_MATCHES",
      payload: { count: scored.length },
    }, {
      title: "اقتراحات الخاطبة الذكية 🤖",
      body: `لديك ${scored.length} اقتراحات جديدة اليوم. اكتشفها الآن!`,
    });

    return scored.length;
  }

  private async hasAiMatchmakerFeature(userId: string): Promise<boolean> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, isActive: true, endsAt: { gt: new Date() } },
      include: { package: true },
    });
    if (!sub?.package?.features) return false;
    const features = sub.package.features as Record<string, any>;
    return features.aiMatchmaker === true;
  }
}
