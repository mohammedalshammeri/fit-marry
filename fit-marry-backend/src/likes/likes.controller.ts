import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { LikesService } from "./likes.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateLikeDto } from "./dto/create-like.dto";

@ApiTags("likes")
@Controller("likes")
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createLike(@CurrentUser() user: { userId: string }, @Body() dto: CreateLikeDto) {
    return this.likesService.createLike(user.userId, dto);
  }

  @Get("inbox")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getInbox(@CurrentUser() user: { userId: string }) {
    return this.likesService.getInbox(user.userId);
  }

  @Post(":id/accept")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  acceptLike(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.likesService.acceptLike(user.userId, id);
  }

  @Post(":id/reject")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rejectLike(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.likesService.rejectLike(user.userId, id);
  }
}
