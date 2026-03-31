import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class DiscoveryQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  country?: string;

  @IsOptional()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  ageMin?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  ageMax?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  marriageType?: string;

  // --- Premium filters ---
  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  sect?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  smoking?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  heightMin?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  heightMax?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  wantChildren?: boolean;

  @IsOptional()
  @IsString()
  jobStatus?: string;

  @IsOptional()
  @IsString()
  skinColor?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedOnly?: boolean;
}
