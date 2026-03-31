import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @IsArray()
  @IsString({ each: true })
  targetCountries!: string[];

  @IsArray()
  @IsString({ each: true })
  targetLanguages!: string[];

  @IsString()
  @IsNotEmpty()
  startAt!: string;

  @IsString()
  @IsNotEmpty()
  endAt!: string;
}
