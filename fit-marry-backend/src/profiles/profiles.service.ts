import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReferralsService } from "../referrals/referrals.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UploadAvatarDto } from "./dto/upload-avatar.dto";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary internally if environment variables exist
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referralsService: ReferralsService,
  ) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
        throw new NotFoundException("Profile not found");
    }

    const profile = user.profile ?? await this.createEmptyProfile(userId);

    return {
        ...profile,
        subscriptionTier: user.subscriptionTier,
        email: user.email,
        phone: user.phone
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.profileRequiresRepayment) {
      throw new BadRequestException("Profile locked until repayment");
    }

    // Update gender on User model if provided
    const userUpdates: Record<string, any> = {};
    if (dto.gender) {
      userUpdates.gender = dto.gender;
    }

    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    const data = this.normalizeProfile(dto);

    const profile = existingProfile
      ? await this.prisma.userProfile.update({
          where: { userId },
          data,
        })
      : await this.prisma.userProfile.create({
          data: {
            userId,
            ...data,
          },
        });

    // Check if profile has required fields → mark profileCompleted
    const hasRequiredFields = !!(
      profile.nickname &&
      profile.age &&
      profile.residenceCountry &&
      (dto.gender || user.gender)
    );
    if (hasRequiredFields && !user.profileCompleted) {
      userUpdates.profileCompleted = true;
    }

    // Logic for Edit Limits / Fees
    if (user.subscriptionTier === "PREMIUM") {
      // Premium users edit freely
      if (Object.keys(userUpdates).length > 0) {
        await this.prisma.user.update({ where: { id: userId }, data: userUpdates });
      }
      return { profile, profileCompleted: hasRequiredFields, profileRequiresRepayment: false };
    }

    if (user.profileEditCount === 0) {
      // First edit is free
      await this.prisma.user.update({
        where: { id: userId },
        data: { profileEditCount: 1, ...userUpdates },
      });
      return { profile, profileCompleted: hasRequiredFields, profileRequiresRepayment: false };
    }

    // Subsequent edits require repayment (Fee)
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileRequiresRepayment: true, ...userUpdates },
    });

    // Verify any pending referral (profile now has data)
    this.referralsService.verifyReferral(userId).catch(() => {});

    return {
      profile,
      profileCompleted: hasRequiredFields,
      profileRequiresRepayment: true,
    };
  }

  async uploadAvatar(userId: string, dto: UploadAvatarDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (!["image/jpeg", "image/png", "image/jpg"].includes(dto.mimeType)) {
      throw new BadRequestException("Invalid image format");
    }

    const buffer = Buffer.from(dto.base64, "base64");
    if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
      throw new BadRequestException("Image too large");
    }

    let avatarUrl: string;

    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const result = await cloudinary.uploader.upload(
          `data:${dto.mimeType};base64,${dto.base64}`,
          { folder: 'fit-marry/avatars', public_id: userId }
        );
        avatarUrl = result.secure_url;
      } catch (error) {
        throw new BadRequestException("Cloudinary upload failed");
      }
    } else {
      const uploadsDir = path.join(process.cwd(), "uploads", "avatars");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = dto.mimeType.split("/")[1];
      const filename = `${userId}-${uuidv4()}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, buffer);

      avatarUrl = `/uploads/avatars/${filename}`; // Relative URL served by ServeStatic
    }

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: { avatarUrl },
      create: { 
        userId, 
        avatarUrl,
        nationalities: [],
        interests: []
      },
    });

    return { avatarUrl };
  }

  async activateBoost(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.subscriptionTier !== 'PREMIUM') throw new BadRequestException('Boost is a premium feature');

    const boostExpiresAt = new Date();
    boostExpiresAt.setHours(boostExpiresAt.getHours() + 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: { boostExpiresAt },
    });
    return { success: true, boostExpiresAt };
  }

  async claimAdReward(userId: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: { adRewardExpiresAt: expiresAt },
    });

    return { success: true, expiresAt };
  }

  async updateTravelMode(userId: string, travelCountry: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) throw new NotFoundException("User not found");

    if (travelCountry && user.subscriptionTier !== "PREMIUM") {
      // Allow if they have active ad reward? Maybe. The business plan says yes
      const hasAdReward = user.adRewardExpiresAt && user.adRewardExpiresAt > new Date();
      if (!hasAdReward) {
        throw new BadRequestException("Travel Mode requires Premium subscription or active ad reward.");
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { travelCountry },
    });

    return { success: true, travelCountry };
  }

  async getPublicProfile(viewerId: string | null, profileUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: profileUserId },
      include: { profile: { include: { photos: { orderBy: { order: 'asc' } } } } },
    });

    if (!user || !user.profile) {
      throw new NotFoundException("Profile not found");
    }

    if (viewerId && viewerId !== profileUserId) {
      await this.recordProfileVisit(viewerId, profileUserId);
    }

    if (user.marriageType === "MISYAR") {
      return {
        userId: user.id,
        marriageType: user.marriageType,
        nickname: user.profile.nickname,
        avatarUrl: user.profile.avatarUrl,
        nationality: user.profile.nationalityPrimary,
        residenceCountry: user.profile.residenceCountry,
        guardianAvailable: !!(user.profile.guardianName || user.profile.guardianRelation || user.profile.guardianContact),
        guardianRelation: user.profile.guardianRelation,
      };
    }

    const { guardianName, guardianContact, ...publicProfile } = user.profile;

    return {
      userId: user.id,
      marriageType: user.marriageType,
      guardianAvailable: !!(guardianName || user.profile.guardianRelation || guardianContact),
      guardianRelation: user.profile.guardianRelation,
      profile: publicProfile,
    };
  }

  async recordProfileVisit(viewerUserId: string, viewedUserId: string) {
    if (viewerUserId === viewedUserId) {
      return { success: true };
    }

    const [viewer, viewed] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: viewerUserId }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { id: viewedUserId }, select: { id: true } }),
    ]);

    if (!viewer || !viewed) {
      throw new NotFoundException("Profile not found");
    }

    return this.prisma.profileVisit.upsert({
      where: {
        viewerUserId_viewedUserId: {
          viewerUserId,
          viewedUserId,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        viewerUserId,
        viewedUserId,
      },
    });
  }

  async getMyVisitors(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const visitors = await this.prisma.profileVisit.findMany({
      where: { viewedUserId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        viewerUser: {
          select: {
            id: true,
            subscriptionTier: true,
            profile: {
              select: {
                nickname: true,
                avatarUrl: true,
                age: true,
                residenceCountry: true,
              },
            },
          },
        },
      },
    });

    const isPremium = user.subscriptionTier === 'PREMIUM';
    const visibleVisitors = isPremium ? visitors : visitors.slice(0, 3);

    return {
      total: visitors.length,
      lockedCount: Math.max(visitors.length - visibleVisitors.length, 0),
      premiumRequired: !isPremium && visitors.length > visibleVisitors.length,
      items: visibleVisitors.map((visit) => ({
        id: visit.id,
        visitedAt: visit.updatedAt,
        viewer: {
          userId: visit.viewerUser.id,
          subscriptionTier: visit.viewerUser.subscriptionTier,
          profile: visit.viewerUser.profile,
        },
      })),
    };
  }

  private normalizeProfile(dto: UpdateProfileDto) {
    const { gender, ...profileFields } = dto;
    return {
      ...profileFields,
      nationalities: dto.nationalities ?? undefined,
      interests: dto.interests ?? undefined,
    };
  }

  private async createEmptyProfile(userId: string) {
    return this.prisma.userProfile.create({
      data: {
        userId,
        nationalities: [],
        interests: [],
      },
    });
  }

  /** Upload a photo to the user's gallery (max 6 photos) */
  async uploadPhoto(userId: string, dto: UploadAvatarDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, adRewardExpiresAt: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Profile not found");

    const existingPhotos = await this.prisma.userPhoto.count({ where: { profileId: profile.id } });
    if (existingPhotos >= 6) {
      throw new BadRequestException("Maximum 6 photos allowed");
    }

    if (existingPhotos >= 1 && user.subscriptionTier !== "PREMIUM") {
      const hasAdReward = user.adRewardExpiresAt && user.adRewardExpiresAt > new Date();
      if (!hasAdReward) {
        throw new BadRequestException("Additional gallery photos require Premium subscription or active ad reward.");
      }
    }

    if (!["image/jpeg", "image/png", "image/jpg"].includes(dto.mimeType)) {
      throw new BadRequestException("Invalid image format");
    }

    const buffer = Buffer.from(dto.base64, "base64");
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException("Image too large");
    }

    let photoUrl: string;

    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(
        `data:${dto.mimeType};base64,${dto.base64}`,
        { folder: `fit-marry/photos/${userId}` }
      );
      photoUrl = result.secure_url;
    } else {
      const uploadsDir = path.join(process.cwd(), "uploads", "photos");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const ext = dto.mimeType.split("/")[1];
      const filename = `${userId}-${uuidv4()}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      photoUrl = `/uploads/photos/${filename}`;
    }

    const photo = await this.prisma.userPhoto.create({
      data: {
        profileId: profile.id,
        url: photoUrl,
        order: existingPhotos,
        isAvatar: existingPhotos === 0,
      },
    });

    // If first photo, set as avatar
    if (existingPhotos === 0) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: { avatarUrl: photoUrl },
      });
    }

    return photo;
  }

  /** Get all photos for a user */
  async getPhotos(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) return [];
    return this.prisma.userPhoto.findMany({
      where: { profileId: profile.id },
      orderBy: { order: 'asc' },
    });
  }

  /** Delete a photo */
  async deletePhoto(userId: string, photoId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Profile not found");

    const photo = await this.prisma.userPhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!photo) throw new NotFoundException("Photo not found");

    await this.prisma.userPhoto.delete({ where: { id: photoId } });

    // If deleted photo was avatar, set next photo or clear
    if (photo.isAvatar) {
      const nextPhoto = await this.prisma.userPhoto.findFirst({
        where: { profileId: profile.id },
        orderBy: { order: 'asc' },
      });
      await this.prisma.userProfile.update({
        where: { userId },
        data: { avatarUrl: nextPhoto?.url || null },
      });
      if (nextPhoto) {
        await this.prisma.userPhoto.update({
          where: { id: nextPhoto.id },
          data: { isAvatar: true },
        });
      }
    }

    return { success: true };
  }

  /** Set a photo as the main avatar */
  async setAvatarPhoto(userId: string, photoId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Profile not found");

    const photo = await this.prisma.userPhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!photo) throw new NotFoundException("Photo not found");

    // Unset current avatar
    await this.prisma.userPhoto.updateMany({
      where: { profileId: profile.id, isAvatar: true },
      data: { isAvatar: false },
    });

    // Set new avatar
    await this.prisma.userPhoto.update({
      where: { id: photoId },
      data: { isAvatar: true },
    });

    await this.prisma.userProfile.update({
      where: { userId },
      data: { avatarUrl: photo.url },
    });

    return { success: true, avatarUrl: photo.url };
  }
}
