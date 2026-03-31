import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ComplaintsService } from "./complaints.service";
import { CreateComplaintDto } from "./dto/create-complaint.dto";

@ApiTags("complaints")
@Controller("complaints")
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createComplaint(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateComplaintDto
  ) {
    return this.complaintsService.createComplaint(user.userId, dto);
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMyComplaints(@CurrentUser() user: { userId: string }) {
    return this.complaintsService.listMyComplaints(user.userId);
  }
}
