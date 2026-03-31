import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { $Enums } from "@prisma/client";

export class LeaveConversationDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsEnum($Enums.LeaveReason)
  reason!: $Enums.LeaveReason;
}
