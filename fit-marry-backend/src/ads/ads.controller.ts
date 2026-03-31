import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdsService } from './ads.service';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /** Client calls this BEFORE showing the ad to get a reward token */
  @Post('token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getRewardToken(
    @CurrentUser() user: { userId: string },
    @Body('rewardType') rewardType: string,
  ) {
    return this.adsService.generateRewardToken(user.userId, rewardType);
  }

  /** Client calls this AFTER the ad is watched, with the reward token */
  @Post('reward')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rewardUser(
    @CurrentUser() user: { userId: string },
    @Body('rewardType') rewardType: string,
    @Body('rewardToken') rewardToken?: string,
  ) {
    return this.adsService.processReward(user.userId, rewardType, rewardToken);
  }
}
