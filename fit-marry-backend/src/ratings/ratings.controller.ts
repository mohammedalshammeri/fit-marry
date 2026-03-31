import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RatingsService } from "./ratings.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("ratings")
@Controller("ratings")
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rateUser(
    @CurrentUser() user: { userId: string },
    @Body() body: {
      ratedUserId: string;
      conversationId: string;
      respect: number;
      seriousness: number;
      honesty: number;
      comment?: string;
    },
  ) {
    return this.ratingsService.rateUser(user.userId, body);
  }

  @Get(":userId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getReputation(@Param("userId") userId: string) {
    return this.ratingsService.getReputation(userId);
  }
}
