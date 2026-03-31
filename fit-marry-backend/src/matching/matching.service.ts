import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DiscoveryQueryDto } from "./dto/discovery-query.dto";

const DEFAULT_LIMIT = 20;

const PREMIUM_FILTER_KEYS = [
  'religion', 'sect', 'nationality', 'educationLevel',
  'maritalStatus', 'smoking', 'heightMin', 'heightMax',
  'wantChildren', 'jobStatus', 'skinColor', 'verifiedOnly',
] as const;

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDiscovery(userId: string, query: DiscoveryQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return { items: [], nextCursor: null };
    }

    // Get blocked + dismissed user IDs
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
    const excludedIds = [
      ...blocks.map(b => b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId),
      ...dismissals.map(d => d.dismissedUserId),
    ];

    // Check conversation limit
    const isTempPremium = user.adRewardExpiresAt && new Date(user.adRewardExpiresAt) > new Date();
    const isPremium = user.subscriptionTier === "PREMIUM" || isTempPremium;
    const myConversationLimit = isPremium ? 5 : 3;
    const myActiveConvs = await this.prisma.conversation.count({
      where: {
        status: "ACTIVE",
        participants: { some: { userId: user.id, isActive: true } },
      },
    });

    if (myActiveConvs >= myConversationLimit) {
      throw new ForbiddenException(`لقد وصلت للحد الأقصى للمحادثات (${myConversationLimit}). قم بإنهاء أو حظر إحدى المحادثات للعودة لقسم الاستكشاف.`);
    }

    const maxInboundLikes = await this.getSettingNumber("maxInboundLikes", 9);
    const inactivityDays = await this.getSettingNumber("inactivityThresholdDays", 30);
    const inactiveBefore = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);

    const limit = query.limit ?? DEFAULT_LIMIT;

    // Build profile where clause
    const profileWhere: any = {};

    if (query.city) {
      profileWhere.region = { contains: query.city, mode: "insensitive" };
    }
    if (query.ageMin !== undefined || query.ageMax !== undefined) {
      profileWhere.age = {};
      if (query.ageMin !== undefined) profileWhere.age.gte = query.ageMin;
      if (query.ageMax !== undefined) profileWhere.age.lte = query.ageMax;
    }

    // Premium filters — only apply if user has active package with the feature
    if (isPremium) {
      const activeFeatures = await this.getActivePackageFeatures(userId);

      if (query.religion && activeFeatures.advancedFilters) {
        profileWhere.religion = { equals: query.religion, mode: "insensitive" };
      }
      if (query.sect && activeFeatures.advancedFilters) {
        profileWhere.sect = { equals: query.sect, mode: "insensitive" };
      }
      if (query.nationality && activeFeatures.advancedFilters) {
        profileWhere.nationalityPrimary = { equals: query.nationality, mode: "insensitive" };
      }
      if (query.educationLevel && activeFeatures.advancedFilters) {
        profileWhere.educationLevel = { equals: query.educationLevel, mode: "insensitive" };
      }
      if (query.maritalStatus && activeFeatures.advancedFilters) {
        profileWhere.maritalStatus = { equals: query.maritalStatus, mode: "insensitive" };
      }
      if (query.smoking && activeFeatures.advancedFilters) {
        profileWhere.smoking = { equals: query.smoking, mode: "insensitive" };
      }
      if (query.jobStatus && activeFeatures.advancedFilters) {
        profileWhere.jobStatus = { equals: query.jobStatus, mode: "insensitive" };
      }
      if (query.skinColor && activeFeatures.advancedFilters) {
        profileWhere.skinColor = { equals: query.skinColor, mode: "insensitive" };
      }
      if (query.wantChildren !== undefined && activeFeatures.advancedFilters) {
        profileWhere.wantChildren = query.wantChildren;
      }
      if ((query.heightMin !== undefined || query.heightMax !== undefined) && activeFeatures.advancedFilters) {
        profileWhere.height = {};
        if (query.heightMin !== undefined) profileWhere.height.gte = query.heightMin;
        if (query.heightMax !== undefined) profileWhere.height.lte = query.heightMax;
      }
    }

    // Country logic
    let searchCountry = query.country;
    if (!searchCountry) {
      if (user.travelCountry && isPremium) {
        searchCountry = user.travelCountry;
      } else if (user.profile?.residenceCountry) {
        searchCountry = user.profile.residenceCountry;
      }
    } else {
      if (!isPremium && searchCountry !== user.profile?.residenceCountry) {
        throw new ForbiddenException("Travel Mode is available for Premium users only.");
      }
    }

    const andConditions: any[] = [];
    andConditions.push({
      OR: [{ lastSeenAt: null }, { lastSeenAt: { gte: inactiveBefore } }]
    });

    if (searchCountry) {
      andConditions.push({
        OR: [
          { profile: { residenceCountry: { equals: searchCountry, mode: "insensitive" } } },
          { travelCountry: { equals: searchCountry, mode: "insensitive" } }
        ]
      });
    }

    // Verified only filter
    if (query.verifiedOnly && isPremium) {
      andConditions.push({ verificationStatus: "VERIFIED" });
    }

    const candidates = await this.prisma.user.findMany({
      where: {
        id: { not: userId, notIn: excludedIds },
        status: "ACTIVE",
        ...(query.marriageType ? (
          query.marriageType.includes(',')
            ? { marriageType: { in: query.marriageType.split(',') as any } }
            : { marriageType: query.marriageType as any }
        ) : {}),
        ...(Object.keys(profileWhere).length > 0 ? { profile: profileWhere } : {}),
        AND: andConditions,
      },
      include: { profile: true },
      orderBy: [
        { boostExpiresAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
        { id: "asc" }
      ],
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor ? { cursor: { id: query.cursor } } : {}),
    });

    const filtered = [] as typeof candidates;

    // Batch-load conversation counts + like counts (N+1 fix)
    const candidateIds = candidates.filter(c => c.profile).map(c => c.id);

    const conversationCounts = await this.prisma.conversationParticipant.groupBy({
      by: ['userId'],
      where: {
        userId: { in: candidateIds },
        isActive: true,
        conversation: { status: 'ACTIVE' },
      },
      _count: { userId: true },
    });
    const convCountMap = new Map(conversationCounts.map(c => [c.userId, c._count.userId]));

    let likeCountMap = new Map<string, number>();
    if (user.marriageType === 'PERMANENT') {
      const likeCounts = await this.prisma.like.groupBy({
        by: ['toUserId'],
        where: {
          toUserId: { in: candidateIds },
          status: 'PENDING',
        },
        _count: { toUserId: true },
      });
      likeCountMap = new Map(likeCounts.map(l => [l.toUserId, l._count.toUserId]));
    }

    for (const candidate of candidates) {
      if (!candidate.profile) continue;

      const conversationLimit = candidate.subscriptionTier === 'PREMIUM' ? 5 : 3;
      const activeConvs = convCountMap.get(candidate.id) || 0;
      if (activeConvs >= conversationLimit) continue;

      if (user.marriageType === 'PERMANENT') {
        const inboundLikesCount = likeCountMap.get(candidate.id) || 0;
        if (inboundLikesCount >= maxInboundLikes) continue;
      }

      filtered.push(candidate);
      if (filtered.length === limit) break;
    }

    const nextCursor = candidates.length > limit ? candidates[limit]?.id ?? null : null;

    return {
      items: filtered.map((candidate: any) => this.toDiscoveryItem(candidate, user)),
      nextCursor,
    };
  }

  /** Dismiss a user permanently (X button) */
  async dismissUser(userId: string, dismissedUserId: string) {
    if (userId === dismissedUserId) return { success: true };
    await this.prisma.userDismiss.upsert({
      where: { dismisserUserId_dismissedUserId: { dismisserUserId: userId, dismissedUserId } },
      update: {},
      create: { dismisserUserId: userId, dismissedUserId },
    });
    return { success: true };
  }

  /** Get active package features for a user */
  private async getActivePackageFeatures(userId: string): Promise<Record<string, boolean>> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, isActive: true, endsAt: { gt: new Date() } },
      include: { package: true },
      orderBy: { endsAt: 'desc' },
    });
    if (!sub?.package?.features) return {};
    const features = sub.package.features as Record<string, any>;
    return {
      advancedFilters: features.advancedFilters ?? true, // default true for premium
      travelMode: features.travelMode ?? true,
      unlimitedLikes: features.unlimitedLikes ?? true,
      superLike: features.superLike ?? true,
      aiMatchmaker: features.aiMatchmaker ?? false,
      storyContact: features.storyContact ?? true,
      ...features,
    };
  }

  private async getSettingNumber(key: string, fallback: number) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) return fallback;
    const value = setting.value as { value?: number } | number;
    if (typeof value === "number") return value;
    if (typeof value === "object" && typeof value.value === "number") return value.value;
    return fallback;
  }

  private toDiscoveryItem(candidate: { id: string; marriageType: string; verificationStatus: string; reputationScore: number; profile: any }, viewer: any) {
    const base = {
      userId: candidate.id,
      marriageType: candidate.marriageType,
      isVerified: candidate.verificationStatus === "VERIFIED",
      reputationScore: candidate.reputationScore,
    };

    if (candidate.marriageType === "MISYAR") {
      return {
        ...base,
        nickname: candidate.profile.nickname,
        avatarUrl: candidate.profile.avatarUrl,
        nationality: candidate.profile.nationalityPrimary,
        residenceCountry: candidate.profile.residenceCountry,
      };
    }

    return {
      ...base,
      profile: candidate.profile,
    };
  }
}
