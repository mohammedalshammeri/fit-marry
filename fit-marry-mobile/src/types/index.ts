export type MarriageType = 'PERMANENT' | 'MISYAR' | 'MUTAA' | 'URFI' | 'TRAVEL_MARRIAGE';
export type SubscriptionTier = 'FREE' | 'PREMIUM';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type OtpChannel = 'EMAIL' | 'SMS';
export type OtpPurpose = 'SIGNUP' | 'LOGIN' | 'VERIFY_EMAIL' | 'VERIFY_PHONE';
export type MessageType = 'TEXT' | 'IMAGE' | 'VOICE';
export type ConversationStatus = 'ACTIVE' | 'CLOSED';

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  marriageType?: MarriageType;
  subscriptionTier?: SubscriptionTier;
  status?: UserStatus;
  nickname?: string;
  avatarUrl?: string;
  profileCompleted?: boolean;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  marriageType: MarriageType;
  subscriptionTier: SubscriptionTier;
  status: UserStatus;
  adRewardExpiresAt?: string;
  travelCountry?: string | null;
}

export interface UserProfile {
  id?: string;
  userId: string;
  nickname?: string;
  avatarUrl?: string;
  age?: number;
  religion?: string;
  sect?: string;
  nationalityPrimary?: string;
  residenceCountry?: string;
  aboutMe?: string;
  partnerPrefs?: string;
  guardianName?: string;
  guardianRelation?: string;
  guardianContact?: string;
  maritalStatus?: string;
  jobStatus?: string;
  marriageType?: MarriageType;
  subscriptionTier?: SubscriptionTier;
  adRewardExpiresAt?: string;
  email?: string;
  phone?: string;
  photos?: UserPhoto[];
}

export interface ProfileVisitor {
  id: string;
  visitedAt: string;
  viewer: {
    userId: string;
    subscriptionTier?: SubscriptionTier;
    profile?: Partial<UserProfile> | null;
  };
}

export interface UserPhoto {
  id: string;
  profileId: string;
  url: string;
  order: number;
  isAvatar: boolean;
  createdAt: string;
}

export interface DiscoveryItem {
  userId: string;
  marriageType: MarriageType;
  nickname?: string;
  avatarUrl?: string;
  nationality?: string;
  residenceCountry?: string;
  profile?: Partial<UserProfile> | null;
}

export interface ConversationParticipant {
  user: {
    id: string;
    profile?: Partial<UserProfile> | null;
  };
}

export interface Message {
  id: string;
  text?: string;
  senderId: string;
  createdAt: string;
  type: MessageType;
  viewOnce?: boolean;
  conversationId?: string;
  viewedAt?: string | null;
  readAt?: string | null;
}

export interface Conversation {
  id: string;
  status: ConversationStatus;
  participants: ConversationParticipant[];
  messages: Message[];  photoAccessGrantedToMe?: boolean;}

export interface Like {
  id: string;
  type?: 'LIKE' | 'SUPER_LIKE';
  fromUser: {
    id: string;
    profile?: Partial<UserProfile> | null;
  };
  createdAt: string;
}

export interface SubscriptionPackage {
  id: string;
  name: string;
  price: number | string;
  durationDays: number;
  features?: Record<string, boolean> | null;
}

export interface DailyMatchSuggestion {
  id: string;
  compatibilityScore: number;
  status: 'PENDING' | 'VIEWED' | 'LIKED' | 'SKIPPED';
  matchedUser: {
    userId: string;
    marriageType: MarriageType;
    isVerified?: boolean;
    reputationScore?: number;
    profile?: Partial<UserProfile> | null;
  };
}

export interface OtpRequestState {
  identifier: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  userId: string;
}
