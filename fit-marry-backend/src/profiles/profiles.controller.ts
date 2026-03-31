import { Controller, Get, Param, Put, Post, Delete, Body, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ProfilesService } from "./profiles.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UploadAvatarDto } from "./dto/upload-avatar.dto";

@ApiTags("profiles")
@Controller("profiles")
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyProfile(@CurrentUser() user: { userId: string }) {
    return this.profilesService.getMyProfile(user.userId);
  }

  @Get("me/visitors")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyVisitors(@CurrentUser() user: { userId: string }) {
    return this.profilesService.getMyVisitors(user.userId);
  }

  @Put("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateMyProfile(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateProfileDto
  ) {
    return this.profilesService.updateMyProfile(user.userId, dto);
  }

  @Put("travel-mode")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateTravelMode(
    @CurrentUser() user: { userId: string },
    @Body() dto: { travelCountry: string | null }
  ) {
    return this.profilesService.updateTravelMode(user.userId, dto.travelCountry);
  }

  @Post("avatar")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  uploadAvatar(
    @CurrentUser() user: { userId: string },
    @Body() dto: UploadAvatarDto
  ) {
    return this.profilesService.uploadAvatar(user.userId, dto);
  }

  @Post("boost")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  activateBoost(@CurrentUser() user: { userId: string }) {
    return this.profilesService.activateBoost(user.userId);
  }

  @Post("ads/reward")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  claimAdReward(@CurrentUser() user: { userId: string }) {
    return this.profilesService.claimAdReward(user.userId);
  }

  @Get("me/photos")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getPhotos(@CurrentUser() user: { userId: string }) {
    return this.profilesService.getPhotos(user.userId);
  }

  @Post("me/photos")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  uploadPhoto(@CurrentUser() user: { userId: string }, @Body() dto: UploadAvatarDto) {
    return this.profilesService.uploadPhoto(user.userId, dto);
  }

  @Delete("me/photos/:photoId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deletePhoto(@CurrentUser() user: { userId: string }, @Param("photoId") photoId: string) {
    return this.profilesService.deletePhoto(user.userId, photoId);
  }

  @Post("me/photos/:photoId/avatar")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  setAvatarPhoto(@CurrentUser() user: { userId: string }, @Param("photoId") photoId: string) {
    return this.profilesService.setAvatarPhoto(user.userId, photoId);
  }

  @Post(":id/view")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  recordProfileVisit(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.profilesService.recordProfileVisit(user.userId, id);
  }

  @Get(":id")
  getPublicProfile(@Param("id") id: string) {
    return this.profilesService.getPublicProfile(null, id);
  }
}
