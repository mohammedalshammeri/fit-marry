import { Module } from "@nestjs/common";
import { StoriesService } from "./stories.service";
import { StoriesController } from "./stories.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [StoriesService],
  controllers: [StoriesController],
  exports: [StoriesService],
})
export class StoriesModule {}
