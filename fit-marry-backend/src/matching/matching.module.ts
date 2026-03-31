import { Module } from "@nestjs/common";
import { MatchingService } from "./matching.service";
import { MatchingController } from "./matching.controller";
import { CompatibilityService } from "./compatibility.service";
import { DailyMatchService } from "./daily-match.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [MatchingService, CompatibilityService, DailyMatchService],
  controllers: [MatchingController],
  exports: [MatchingService, CompatibilityService, DailyMatchService],
})
export class MatchingModule {}
