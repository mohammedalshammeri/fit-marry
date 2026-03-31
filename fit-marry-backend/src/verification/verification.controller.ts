import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { VerificationService } from "./verification.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("verification")
@Controller("verification")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post("submit")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  submitVerification(
    @CurrentUser() user: { userId: string },
    @Body() body: { selfieUrl: string },
  ) {
    return this.verificationService.submitVerification(user.userId, body.selfieUrl);
  }

  @Get("status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyVerification(@CurrentUser() user: { userId: string }) {
    return this.verificationService.getMyVerification(user.userId);
  }
}
