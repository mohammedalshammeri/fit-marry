import { Module } from "@nestjs/common";
import { LikesService } from "./likes.service";
import { LikesController } from "./likes.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [LikesService],
  controllers: [LikesController],
  exports: [LikesService],
})
export class LikesModule {}
