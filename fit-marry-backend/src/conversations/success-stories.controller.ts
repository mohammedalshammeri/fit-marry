import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SuccessStoriesService } from "./success-stories.service";

@ApiTags("success-stories")
@Controller("success-stories")
export class SuccessStoriesController {
  constructor(private readonly successStoriesService: SuccessStoriesService) {}

  @Get()
  getPublicStories(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.successStoriesService.getPublicStories(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get("count")
  getCount() {
    return this.successStoriesService.getCount();
  }
}
