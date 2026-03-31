import { Controller, Get, Post, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { MatchingService } from "./matching.service";
import { CompatibilityService } from "./compatibility.service";
import { DailyMatchService } from "./daily-match.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DiscoveryQueryDto } from "./dto/discovery-query.dto";

@ApiTags("discovery")
@Controller("discovery")
export class MatchingController {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly compatibilityService: CompatibilityService,
    private readonly dailyMatchService: DailyMatchService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getDiscovery(
    @CurrentUser() user: { userId: string },
    @Query() query: DiscoveryQueryDto
  ) {
    return this.matchingService.getDiscovery(user.userId, query);
  }

  @Post("dismiss/:userId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  dismissUser(
    @CurrentUser() user: { userId: string },
    @Param("userId") dismissedUserId: string,
  ) {
    return this.matchingService.dismissUser(user.userId, dismissedUserId);
  }

  @Get("compatibility/:targetUserId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getCompatibility(
    @CurrentUser() user: { userId: string },
    @Param("targetUserId") targetUserId: string,
  ) {
    return this.compatibilityService.getScoreForPair(user.userId, targetUserId);
  }

  @Get("daily-matches")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getDailyMatches(@CurrentUser() user: { userId: string }) {
    return this.dailyMatchService.getDailyMatches(user.userId);
  }

  @Post("daily-matches/:id/:status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateDailyMatch(
    @CurrentUser() user: { userId: string },
    @Param("id") matchId: string,
    @Param("status") status: 'VIEWED' | 'LIKED' | 'SKIPPED',
  ) {
    return this.dailyMatchService.updateMatchStatus(user.userId, matchId, status);
  }
}
