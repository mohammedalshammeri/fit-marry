import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateLikeDto {
  @IsString()
  @IsNotEmpty()
  toUserId!: string;

  @IsOptional()
  @IsBoolean()
  isSuperLike?: boolean;
}
