import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AdminAuthService } from "./admin-auth.service";
import { AdminTwoFaService } from "./admin-two-fa.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { AdminRefreshDto } from "./dto/admin-refresh.dto";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";

@ApiTags("admin-auth")
@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly twoFaService: AdminTwoFaService,
  ) {}

  @Post("login")
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: AdminRefreshDto) {
    return this.adminAuthService.refresh(dto);
  }

  @Post("logout")
  logout(@Body() dto: AdminRefreshDto) {
    return this.adminAuthService.logout(dto);
  }

  @Post("2fa/setup")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  setup2fa(@CurrentAdmin() admin: { adminId: string }) {
    return this.twoFaService.setup2fa(admin.adminId);
  }

  @Post("2fa/verify")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  verify2fa(
    @CurrentAdmin() admin: { adminId: string },
    @Body() dto: { token: string },
  ) {
    return this.twoFaService.verify2fa(admin.adminId, dto.token);
  }

  @Post("2fa/disable")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  disable2fa(
    @CurrentAdmin() admin: { adminId: string },
    @Body() dto: { token: string },
  ) {
    return this.twoFaService.disable2fa(admin.adminId, dto.token);
  }
}
