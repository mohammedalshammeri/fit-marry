import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from "class-validator";

export class CreateSubscriptionPackageDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsString()
  badgeTextAr?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(1)
  durationDays!: number;

  // ─── Feature flags ───
  @IsOptional()
  @IsBoolean()
  unlimitedLikes?: boolean;

  @IsOptional()
  @IsBoolean()
  seeWhoLikesYou?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99)
  superLikesPerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99)
  boostsPerMonth?: number;

  @IsOptional()
  @IsBoolean()
  travelMode?: boolean;

  @IsOptional()
  @IsBoolean()
  advancedFilters?: boolean;

  @IsOptional()
  @IsBoolean()
  noAds?: boolean;

  @IsOptional()
  @IsBoolean()
  priorityLikes?: boolean;

  @IsOptional()
  @IsBoolean()
  messageBeforeMatch?: boolean;

  @IsOptional()
  @IsBoolean()
  profileBoost?: boolean;

  @IsOptional()
  @IsBoolean()
  undoLike?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  dailyMatchesLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(-1)
  chatLimit?: number;

  @IsOptional()
  @IsBoolean()
  readReceipts?: boolean;

  @IsOptional()
  @IsBoolean()
  aiMatchmaker?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}