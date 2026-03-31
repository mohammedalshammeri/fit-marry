import { IsEnum, IsOptional, IsString } from "class-validator";
import { ComplaintActionType } from "../../common/enums/complaint-action-type.enum";

export class ComplaintActionDto {
  @IsEnum(ComplaintActionType)
  action!: ComplaintActionType;

  @IsOptional()
  @IsString()
  note?: string;
}
