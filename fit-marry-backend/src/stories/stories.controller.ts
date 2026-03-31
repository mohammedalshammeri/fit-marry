import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { StoriesService } from "./stories.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UploadAvatarDto } from "../profiles/dto/upload-avatar.dto";

@ApiTags("stories")
@Controller("stories")
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createStory(
    @CurrentUser() user: { userId: string },
    @Body() body: { mediaUrl?: string; mediaType: 'IMAGE' | 'VIDEO' | 'TEXT'; caption?: string },
  ) {
    return this.storiesService.createStory(user.userId, body);
  }

  @Post("media")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  uploadStoryMedia(
    @CurrentUser() user: { userId: string },
    @Body() body: UploadAvatarDto,
  ) {
    return this.storiesService.uploadStoryMedia(user.userId, body);
  }

  @Get("feed")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getStoriesFeed(@CurrentUser() user: { userId: string }) {
    return this.storiesService.getStoriesFeed(user.userId);
  }

  @Post(":id/view")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  viewStory(
    @CurrentUser() user: { userId: string },
    @Param("id") storyId: string,
  ) {
    return this.storiesService.viewStory(user.userId, storyId);
  }

  @Post(":id/contact")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  contactStoryPoster(
    @CurrentUser() user: { userId: string },
    @Param("id") storyId: string,
  ) {
    return this.storiesService.contactStoryPoster(user.userId, storyId);
  }

  @Get(":id/viewers")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getStoryViewers(
    @CurrentUser() user: { userId: string },
    @Param("id") storyId: string,
  ) {
    return this.storiesService.getStoryViewers(user.userId, storyId);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteStory(
    @CurrentUser() user: { userId: string },
    @Param("id") storyId: string,
  ) {
    return this.storiesService.deleteStory(user.userId, storyId);
  }
}
