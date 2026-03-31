import { Controller, Get, Param, Post, Query, Body, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SuccessStoriesService } from "../conversations/success-stories.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";

@ApiTags("admin-success-stories")
@Controller("admin/success-stories")
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
export class AdminSuccessStoriesController {
  constructor(private readonly successStoriesService: SuccessStoriesService) {}

  @Get()
  getAllStories(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.successStoriesService.getAllStories(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post(":id/approve")
  approve(@Param("id") id: string) {
    return this.successStoriesService.setDisplayApproval(id, true);
  }

  @Post(":id/disapprove")
  disapprove(@Param("id") id: string) {
    return this.successStoriesService.setDisplayApproval(id, false);
  }
}
