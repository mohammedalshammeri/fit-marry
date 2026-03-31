import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ReferralsService } from "./referrals.service";
import { InviteReferralDto } from "./dto/invite-referral.dto";

@ApiTags("referrals")
@Controller("referrals")
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get("code")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getCode(@CurrentUser() user: { userId: string }) {
    return this.referralsService.getCode(user.userId);
  }

  @Post("invite")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  invite(@CurrentUser() user: { userId: string }, @Body() dto: InviteReferralDto) {
    return this.referralsService.invite(user.userId, dto.code);
  }

  @Get("status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: { userId: string }) {
    return this.referralsService.getStatus(user.userId);
  }
}
