import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export class AdminLimitedMessagesDto {
  @IsString()
  @IsNotEmpty()
  complaintId!: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
