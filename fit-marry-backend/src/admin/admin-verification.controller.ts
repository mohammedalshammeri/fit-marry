import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { VerificationService } from "../verification/verification.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";

@ApiTags("admin-verification")
@Controller("admin/verification")
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
export class AdminVerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get("pending")
  getPending(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.verificationService.getPendingRequests(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() body: { adminId: string }) {
    return this.verificationService.approveVerification(id, body.adminId);
  }

  @Post(":id/reject")
  reject(@Param("id") id: string, @Body() body: { adminId: string; reason?: string }) {
    return this.verificationService.rejectVerification(id, body.adminId, body.reason);
  }
}
