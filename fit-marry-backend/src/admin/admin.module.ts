import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminTwoFaService } from "./admin-two-fa.service";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminJwtStrategy } from "./strategies/admin-jwt.strategy";
import { AdminUsersController } from "./admin-users.controller";
import { AdminBannersController } from "./admin-banners.controller";
import { AdminSettingsController } from "./admin-settings.controller";
import { AdminComplaintsController } from "./admin-complaints.controller";
import { AdminAuditLogsController } from "./admin-audit-logs.controller";
import { AdminReportsController } from "./admin-reports.controller";
import { AdminRolesController } from "./admin-roles.controller";
import { AdminPackagesController } from "./admin-packages.controller";
import { AdminVerificationController } from "./admin-verification.controller";
import { AdminSuccessStoriesController } from "./admin-success-stories.controller";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { VerificationModule } from "../verification/verification.module";
import { ConversationsModule } from "../conversations/conversations.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    ConfigModule,
    SubscriptionsModule,
    VerificationModule,
    ConversationsModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("ADMIN_JWT_SECRET") ?? "admin_dev_secret",
        signOptions: {
          expiresIn: configService.get<string>("ADMIN_JWT_EXPIRES_IN") ?? "15m",
        },
      }),
    }),
  ],
  providers: [AdminService, AdminAuthService, AdminTwoFaService, AdminJwtStrategy],
  controllers: [
    AdminController,
    AdminAuthController,
    AdminUsersController,
    AdminBannersController,
    AdminSettingsController,
    AdminComplaintsController,
    AdminAuditLogsController,
    AdminReportsController,
    AdminRolesController,
    AdminPackagesController,
    AdminVerificationController,
    AdminSuccessStoriesController,
    AdminNotificationsController,
  ],
  exports: [AdminService, AdminAuthService],
})
export class AdminModule {}
