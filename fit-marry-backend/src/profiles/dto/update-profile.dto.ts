import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { $Enums } from "@prisma/client";

export class UpdateProfileDto {
  @IsOptional()
  @IsEnum($Enums.Gender)
  gender?: $Enums.Gender;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  sect?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nationalities?: string[];

  @IsOptional()
  @IsString()
  nationalityPrimary?: string;

  @IsOptional()
  @IsString()
  residenceCountry?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  weight?: number;

  @IsOptional()
  @IsString()
  skinColor?: string;

  @IsOptional()
  @IsString()
  eyeColor?: string;

  @IsOptional()
  @IsString()
  hairColor?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  jobStatus?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsInt()
  childrenCount?: number;

  @IsOptional()
  @IsString()
  custodyInfo?: string;

  @IsOptional()
  @IsString()
  smoking?: string;

  @IsOptional()
  @IsString()
  alcohol?: string;

  @IsOptional()
  @IsString()
  healthStatus?: string;

  @IsOptional()
  @IsString()
  healthCondition?: string;

  @IsOptional()
  @IsBoolean()
  wantChildren?: boolean;

  @IsOptional()
  @IsString()
  womenWorkStudy?: string;

  @IsOptional()
  @IsString()
  prayerLevel?: string;

  @IsOptional()
  @IsString()
  religiosity?: string;

  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @IsOptional()
  @IsString()
  livingArrangement?: string;

  @IsOptional()
  @IsString()
  fitnessLevel?: string;

  @IsOptional()
  @IsString()
  tribe?: string;

  @IsOptional()
  @IsString()
  hijabBeard?: string;

  @IsOptional()
  @IsString()
  income?: string;

  @IsOptional()
  @IsString()
  marriageTimeline?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  halalFood?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  aboutMe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  partnerPrefs?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guardianName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  guardianRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  guardianContact?: string;

  @IsOptional()
  @IsInt()
  mahrMin?: number;

  @IsOptional()
  @IsInt()
  mahrMax?: number;

  @IsOptional()
  @IsInt()
  dowryMin?: number;

  @IsOptional()
  @IsInt()
  dowryMax?: number;

  @IsOptional()
  @IsString()
  showMeTo?: string;
}
