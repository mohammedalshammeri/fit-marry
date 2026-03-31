-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');
CREATE TYPE "MarriageType" AS ENUM ('PERMANENT', 'MISYAR');
CREATE TYPE "OTPChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "OTPPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'VERIFY_EMAIL', 'VERIFY_PHONE');
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN');
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');
CREATE TYPE "LikeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "LeaveReason" AS ENUM ('NOT_COMPATIBLE', 'BLOCK');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VOICE');
CREATE TYPE "CallStatus" AS ENUM ('STARTED', 'ENDED', 'MISSED', 'FAILED');
CREATE TYPE "TransactionType" AS ENUM ('TOPUP', 'REGISTRATION_FEE', 'PROFILE_CHANGE_FEE', 'MINUTES_DEDUCT', 'REFERRAL_REWARD', 'ADJUSTMENT');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'VERIFIED', 'REWARDED', 'REJECTED');
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTION_TAKEN', 'CLOSED');
CREATE TYPE "ComplaintActionType" AS ENUM ('WARN', 'SUSPEND', 'BAN', 'MESSAGE_DELETE', 'CONVERSATION_CLOSE');
CREATE TYPE "BannerStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');

-- Core tables
CREATE TABLE "Admin" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "passwordHash" text NOT NULL,
  "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
  "twoFaEnabled" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Role" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "type" "RoleType" NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Permission" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "description" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Conversation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" timestamptz NOT NULL DEFAULT now(),
  "endedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text UNIQUE,
  "phone" text UNIQUE,
  "emailVerifiedAt" timestamptz,
  "phoneVerifiedAt" timestamptz,
  "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "marriageType" "MarriageType" NOT NULL,
  "ageConfirmed" boolean NOT NULL DEFAULT false,
  "lastSeenAt" timestamptz,
  "activeConversationId" uuid UNIQUE,
  "profileRequiresRepayment" boolean NOT NULL DEFAULT false,
  "referralCode" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "User_activeConversationId_fkey" FOREIGN KEY ("activeConversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "User_status_lastSeenAt_idx" ON "User"("status", "lastSeenAt");

CREATE TABLE "UserProfile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL UNIQUE,
  "religion" text,
  "sect" text,
  "nationalities" text[] NOT NULL,
  "nationalityPrimary" text,
  "residenceCountry" text,
  "region" text,
  "age" int,
  "height" int,
  "weight" int,
  "skinColor" text,
  "eyeColor" text,
  "hairColor" text,
  "educationLevel" text,
  "jobStatus" text,
  "maritalStatus" text,
  "childrenCount" int,
  "custodyInfo" text,
  "smoking" text,
  "alcohol" text,
  "healthStatus" text,
  "healthCondition" text,
  "wantChildren" boolean,
  "womenWorkStudy" text,
  "interests" text[] NOT NULL,
  "aboutMe" text,
  "partnerPrefs" text,
  "mahrMin" int,
  "mahrMax" int,
  "dowryMin" int,
  "dowryMax" int,
  "showMeTo" text,
  "preferences" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserProfile_residenceCountry_idx" ON "UserProfile"("residenceCountry");
CREATE INDEX "UserProfile_religion_idx" ON "UserProfile"("religion");
CREATE INDEX "UserProfile_sect_idx" ON "UserProfile"("sect");
CREATE INDEX "UserProfile_nationalityPrimary_idx" ON "UserProfile"("nationalityPrimary");

CREATE TABLE "Device" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "deviceIdHash" text NOT NULL UNIQUE,
  "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING',
  "approvedByAdminId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Device_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Device_userId_idx" ON "Device"("userId");

CREATE TABLE "Session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "refreshTokenHash" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "revokedAt" timestamptz,
  "deviceId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "OTP" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "channel" "OTPChannel" NOT NULL,
  "purpose" "OTPPurpose" NOT NULL,
  "otpHash" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "attempts" int NOT NULL DEFAULT 0,
  "lastSentAt" timestamptz,
  "userId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "OTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "OTP_identifier_channel_purpose_idx" ON "OTP"("identifier", "channel", "purpose");
CREATE INDEX "OTP_expiresAt_idx" ON "OTP"("expiresAt");

CREATE TABLE "RolePermission" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "roleId" uuid NOT NULL,
  "permissionId" uuid NOT NULL,
  CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

CREATE TABLE "AdminRole" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" uuid NOT NULL,
  "roleId" uuid NOT NULL,
  CONSTRAINT "AdminRole_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AdminRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AdminRole_adminId_roleId_key" ON "AdminRole"("adminId", "roleId");

CREATE TABLE "Like" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fromUserId" uuid NOT NULL,
  "toUserId" uuid NOT NULL,
  "status" "LikeStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Like_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Like_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Like_fromUserId_toUserId_key" ON "Like"("fromUserId", "toUserId");
CREATE INDEX "Like_toUserId_status_idx" ON "Like"("toUserId", "status");

CREATE TABLE "ConversationParticipant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "leftAt" timestamptz,
  "leaveReason" "LeaveReason",
  CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_isActive_idx" ON "ConversationParticipant"("userId", "isActive");

CREATE TABLE "Message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" uuid NOT NULL,
  "senderId" uuid NOT NULL,
  "type" "MessageType" NOT NULL,
  "text" text,
  "mediaId" text,
  "mediaUrl" text,
  "mediaResourceType" text,
  "mediaBytes" int,
  "viewOnce" boolean NOT NULL DEFAULT false,
  "sensitive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

CREATE TABLE "MessageView" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "messageId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "viewedAt" timestamptz,
  "consumedAt" timestamptz,
  CONSTRAINT "MessageView_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MessageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MessageView_messageId_userId_key" ON "MessageView"("messageId", "userId");

CREATE TABLE "CallSession" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" uuid NOT NULL,
  "status" "CallStatus" NOT NULL DEFAULT 'STARTED',
  "startedAt" timestamptz NOT NULL DEFAULT now(),
  "endedAt" timestamptz,
  "minutesUsed" int NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CallSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CallSession_conversationId_status_idx" ON "CallSession"("conversationId", "status");

CREATE TABLE "Wallet" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL UNIQUE,
  "balanceMinutes" int NOT NULL DEFAULT 0,
  "balanceCredits" int NOT NULL DEFAULT 0,
  "usedMinutes" int NOT NULL DEFAULT 0,
  "remainingMinutes" int NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'USD',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Transaction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId" uuid NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" numeric(10,2),
  "currency" text NOT NULL,
  "minutes" int,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "providerRef" text,
  "metadata" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");

CREATE TABLE "Referral" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "userId" uuid NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Referral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReferralEvent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referralId" uuid NOT NULL,
  "referredUserId" uuid NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ReferralEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReferralEvent_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralEvent_referralId_referredUserId_key" ON "ReferralEvent"("referralId", "referredUserId");
CREATE INDEX "ReferralEvent_referredUserId_idx" ON "ReferralEvent"("referredUserId");

CREATE TABLE "Complaint" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporterId" uuid NOT NULL,
  "reportedUserId" uuid NOT NULL,
  "conversationId" uuid,
  "category" text NOT NULL,
  "text" text,
  "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Complaint_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Complaint_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Complaint_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX "Complaint_conversationId_idx" ON "Complaint"("conversationId");

CREATE TABLE "ComplaintAttachment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "complaintId" uuid NOT NULL,
  "publicId" text NOT NULL,
  "url" text NOT NULL,
  "resourceType" text NOT NULL,
  "bytes" int,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ComplaintAttachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ComplaintAttachment_complaintId_idx" ON "ComplaintAttachment"("complaintId");

CREATE TABLE "Banner" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "imageUrl" text NOT NULL,
  "targetCountries" text[] NOT NULL,
  "targetLanguages" text[] NOT NULL,
  "startAt" timestamptz,
  "endAt" timestamptz,
  "status" "BannerStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Setting" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" text NOT NULL UNIQUE,
  "value" jsonb NOT NULL,
  "updatedByAdminId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Setting_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorAdminId" uuid NOT NULL,
  "actionType" text NOT NULL,
  "entityType" text NOT NULL,
  "entityId" text,
  "before" jsonb,
  "after" jsonb,
  "ip" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "AuditLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AuditLog_actorAdminId_createdAt_idx" ON "AuditLog"("actorAdminId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

CREATE TABLE "Notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "sentAt" timestamptz,
  "readAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");
