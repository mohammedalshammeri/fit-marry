import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Create a new story (expires in 24 hours) */
  async createStory(userId: string, dto: {
    mediaUrl?: string;
    mediaType: 'IMAGE' | 'VIDEO' | 'TEXT';
    caption?: string;
  }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (dto.mediaType !== 'TEXT' && !dto.mediaUrl) {
      throw new BadRequestException("Media URL is required for image/video stories");
    }
    if (dto.mediaType === 'TEXT' && !dto.caption) {
      throw new BadRequestException("Caption is required for text stories");
    }

    const story = await this.prisma.story.create({
      data: {
        userId,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType as any,
        caption: dto.caption,
        expiresAt,
      },
    });

    return story;
  }

  async uploadStoryMedia(userId: string, dto: { base64: string; mimeType: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
        "video/mp4",
        "video/quicktime",
        "video/webm",
      ].includes(dto.mimeType)
    ) {
      throw new BadRequestException("Invalid media format");
    }

    const buffer = Buffer.from(dto.base64, "base64");
    if (buffer.length > 20 * 1024 * 1024) {
      throw new BadRequestException("Media too large");
    }

    let mediaUrl: string;

    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(`data:${dto.mimeType};base64,${dto.base64}`, {
        folder: `fit-marry/stories/${userId}`,
        resource_type: dto.mimeType.startsWith("video/") ? "video" : "image",
      });
      mediaUrl = result.secure_url;
    } else {
      const uploadsDir = path.join(process.cwd(), "uploads", "stories");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = dto.mimeType.split("/")[1] || "jpg";
      const fileName = `${userId}-${uuidv4()}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      mediaUrl = `/uploads/stories/${fileName}`;
    }

    return { mediaUrl };
  }

  /** Get active stories feed (own + others) */
  async getStoriesFeed(userId: string) {
    const now = new Date();

    // Get blocked users
    const blocks = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
      select: { blockerUserId: true, blockedUserId: true },
    });
    const blockedIds = blocks.map(b => b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId);

    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: now },
        userId: { notIn: blockedIds },
      },
      include: {
        user: {
          select: {
            id: true,
            verificationStatus: true,
            profile: { select: { nickname: true, avatarUrl: true } },
          },
        },
        views: {
          where: { viewerId: userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by user
    const userStories = new Map<string, any>();
    for (const story of stories) {
      const uid = story.userId;
      if (!userStories.has(uid)) {
        userStories.set(uid, {
          userId: uid,
          nickname: story.user.profile?.nickname,
          avatarUrl: story.user.profile?.avatarUrl,
          isVerified: story.user.verificationStatus === "VERIFIED",
          isOwn: uid === userId,
          stories: [],
        });
      }
      userStories.get(uid)!.stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        viewCount: story.viewCount,
        hasViewed: story.views.length > 0,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
      });
    }

    // Return own stories first, then others
    const result = Array.from(userStories.values());
    result.sort((a, b) => {
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      return 0;
    });

    return result;
  }

  /** View a story - increment view count */
  async viewStory(viewerId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException("Story not found");
    if (story.expiresAt < new Date()) throw new BadRequestException("Story has expired");

    // Don't count self-views
    if (viewerId === story.userId) return { viewed: true };

    const existing = await this.prisma.storyView.findUnique({
      where: { storyId_viewerId: { storyId, viewerId } },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.storyView.create({ data: { storyId, viewerId } }),
        this.prisma.story.update({
          where: { id: storyId },
          data: { viewCount: { increment: 1 } },
        }),
      ]);
    }

    return { viewed: true };
  }

  /** Contact story poster — requires premium package with storyContact feature */
  async contactStoryPoster(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { user: true },
    });
    if (!story) throw new NotFoundException("Story not found");
    if (story.userId === userId) throw new BadRequestException("Cannot contact yourself");

    // Check if user has active subscription with storyContact
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, isActive: true, endsAt: { gt: new Date() } },
      include: { package: true },
    });

    if (!sub) {
      throw new ForbiddenException("يجب الاشتراك في باقة للتواصل مع صاحب القصة");
    }

    const features = (sub.package.features as Record<string, any>) || {};
    if (features.storyContact === false) {
      throw new ForbiddenException("باقتك الحالية لا تتضمن ميزة التواصل عبر القصص");
    }

    // Create a like to initiate the match flow
    const existingLike = await this.prisma.like.findUnique({
      where: { fromUserId_toUserId: { fromUserId: userId, toUserId: story.userId } },
    });

    if (existingLike) {
      return { alreadyLiked: true, likeId: existingLike.id };
    }

    // Send notification to story poster
    await this.notificationsService.notifyUser(story.userId, {
      type: "STORY_CONTACT",
      payload: { storyId, fromUserId: userId },
    }, {
      title: "شخص يريد التواصل معك",
      body: "شخص أعجب بقصتك ويريد التواصل. افتح التطبيق لمراجعة الطلب.",
    });

    return { contactRequested: true, storyId };
  }

  /** Get viewers of own story */
  async getStoryViewers(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== userId) {
      throw new NotFoundException("Story not found");
    }

    const views = await this.prisma.storyView.findMany({
      where: { storyId },
      include: {
        viewer: {
          select: {
            id: true,
            verificationStatus: true,
            profile: { select: { nickname: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return views.map(v => ({
      userId: v.viewer.id,
      nickname: v.viewer.profile?.nickname,
      avatarUrl: v.viewer.profile?.avatarUrl,
      isVerified: v.viewer.verificationStatus === "VERIFIED",
      viewedAt: v.createdAt,
    }));
  }

  /** Delete own story */
  async deleteStory(userId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.userId !== userId) {
      throw new NotFoundException("Story not found");
    }

    await this.prisma.storyView.deleteMany({ where: { storyId } });
    await this.prisma.story.delete({ where: { id: storyId } });

    return { success: true };
  }

  /** Cleanup expired stories every hour */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredStories() {
    const expired = await this.prisma.story.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true },
    });

    if (expired.length > 0) {
      const ids = expired.map(s => s.id);
      await this.prisma.storyView.deleteMany({ where: { storyId: { in: ids } } });
      await this.prisma.story.deleteMany({ where: { id: { in: ids } } });
    }
  }
}
