-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StoryMediaType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT');

-- CreateEnum
CREATE TYPE "DailyMatchStatus" AS ENUM ('PENDING', 'VIEWED', 'LIKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ContactExchangeStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MarriageType" ADD VALUE 'MUTAA';
ALTER TYPE "MarriageType" ADD VALUE 'URFI';
ALTER TYPE "MarriageType" ADD VALUE 'TRAVEL_MARRIAGE';

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "twoFaSecret" TEXT;

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "isSuperLike" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SubscriptionPackage" ADD COLUMN     "badgeText" TEXT,
ADD COLUMN     "badgeTextAr" TEXT,
ADD COLUMN     "color" TEXT DEFAULT '#E91E63',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "nameAr" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "boostExpiresAt" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalRatings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "fitnessLevel" TEXT,
ADD COLUMN     "guardianContact" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianRelation" TEXT,
ADD COLUMN     "halalFood" TEXT,
ADD COLUMN     "hijabBeard" TEXT,
ADD COLUMN     "income" TEXT,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "livingArrangement" TEXT,
ADD COLUMN     "marriageTimeline" TEXT,
ADD COLUMN     "prayerLevel" TEXT,
ADD COLUMN     "religiosity" TEXT,
ADD COLUMN     "tribe" TEXT,
ADD COLUMN     "willingToRelocate" BOOLEAN;

-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "PhotoAccess" (
    "id" TEXT NOT NULL,
    "granterUserId" TEXT NOT NULL,
    "granteeUserId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPhoto" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isAvatar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileVisit" (
    "id" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "viewedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDismiss" (
    "id" TEXT NOT NULL,
    "dismisserUserId" TEXT NOT NULL,
    "dismissedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDismiss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperLike" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selfieUrl" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "id" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "raterUserId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "respect" INTEGER NOT NULL,
    "seriousness" INTEGER NOT NULL,
    "honesty" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" "StoryMediaType" NOT NULL,
    "caption" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchedUserId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" "DailyMatchStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "actionAt" TIMESTAMP(3),

    CONSTRAINT "DailyMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibleMatch" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "user1ContactInfo" TEXT,
    "user2ContactInfo" TEXT,
    "contactExchangeStatus" "ContactExchangeStatus" NOT NULL DEFAULT 'NONE',
    "contactExchangeRequestedById" TEXT,
    "contactExchangeRequestedAt" TIMESTAMP(3),
    "contactExchangeRespondedAt" TIMESTAMP(3),
    "contactExchangeExpiresAt" TIMESTAMP(3),
    "user1Confirmed" BOOLEAN NOT NULL DEFAULT false,
    "user2Confirmed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatibleMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "city" TEXT,
    "marriageType" TEXT,
    "displayApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminBroadcast" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "body" TEXT NOT NULL,
    "bodyEn" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PROMO',
    "targetGroup" TEXT NOT NULL DEFAULT 'ALL',
    "imageUrl" TEXT,
    "actionUrl" TEXT,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoAccess_conversationId_idx" ON "PhotoAccess"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoAccess_granterUserId_granteeUserId_key" ON "PhotoAccess"("granterUserId", "granteeUserId");

-- CreateIndex
CREATE INDEX "UserPhoto_profileId_order_idx" ON "UserPhoto"("profileId", "order");

-- CreateIndex
CREATE INDEX "ProfileVisit_viewedUserId_updatedAt_idx" ON "ProfileVisit"("viewedUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "ProfileVisit_viewerUserId_updatedAt_idx" ON "ProfileVisit"("viewerUserId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileVisit_viewerUserId_viewedUserId_key" ON "ProfileVisit"("viewerUserId", "viewedUserId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedUserId_idx" ON "UserBlock"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerUserId_blockedUserId_key" ON "UserBlock"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "UserDismiss_dismissedUserId_idx" ON "UserDismiss"("dismissedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDismiss_dismisserUserId_dismissedUserId_key" ON "UserDismiss"("dismisserUserId", "dismissedUserId");

-- CreateIndex
CREATE INDEX "SuperLike_toUserId_idx" ON "SuperLike"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SuperLike_fromUserId_toUserId_key" ON "SuperLike"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");

-- CreateIndex
CREATE INDEX "UserRating_ratedUserId_idx" ON "UserRating"("ratedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRating_raterUserId_conversationId_key" ON "UserRating"("raterUserId", "conversationId");

-- CreateIndex
CREATE INDEX "Story_userId_expiresAt_idx" ON "Story"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryView_storyId_viewerId_key" ON "StoryView"("storyId", "viewerId");

-- CreateIndex
CREATE INDEX "DailyMatch_userId_sentAt_idx" ON "DailyMatch"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMatch_userId_matchedUserId_sentAt_key" ON "DailyMatch"("userId", "matchedUserId", "sentAt");

-- CreateIndex
CREATE INDEX "CompatibleMatch_conversationId_idx" ON "CompatibleMatch"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibleMatch_user1Id_user2Id_key" ON "CompatibleMatch"("user1Id", "user2Id");

-- CreateIndex
CREATE UNIQUE INDEX "SuccessStory_user1Id_user2Id_key" ON "SuccessStory"("user1Id", "user2Id");

-- CreateIndex
CREATE INDEX "AdminBroadcast_createdAt_idx" ON "AdminBroadcast"("createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionPackage_isActive_sortOrder_idx" ON "SubscriptionPackage"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "PhotoAccess" ADD CONSTRAINT "PhotoAccess_granterUserId_fkey" FOREIGN KEY ("granterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAccess" ADD CONSTRAINT "PhotoAccess_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAccess" ADD CONSTRAINT "PhotoAccess_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPhoto" ADD CONSTRAINT "UserPhoto_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVisit" ADD CONSTRAINT "ProfileVisit_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileVisit" ADD CONSTRAINT "ProfileVisit_viewedUserId_fkey" FOREIGN KEY ("viewedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDismiss" ADD CONSTRAINT "UserDismiss_dismisserUserId_fkey" FOREIGN KEY ("dismisserUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDismiss" ADD CONSTRAINT "UserDismiss_dismissedUserId_fkey" FOREIGN KEY ("dismissedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperLike" ADD CONSTRAINT "SuperLike_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperLike" ADD CONSTRAINT "SuperLike_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_raterUserId_fkey" FOREIGN KEY ("raterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMatch" ADD CONSTRAINT "DailyMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMatch" ADD CONSTRAINT "DailyMatch_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibleMatch" ADD CONSTRAINT "CompatibleMatch_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibleMatch" ADD CONSTRAINT "CompatibleMatch_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessStory" ADD CONSTRAINT "SuccessStory_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
