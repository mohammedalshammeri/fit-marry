import { Module, forwardRef } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { ConversationsController } from "./conversations.controller";
import { CompatibleMatchService } from "./compatible-match.service";
import { SuccessStoriesService } from "./success-stories.service";
import { SuccessStoriesController } from "./success-stories.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { MessagesModule } from "../messages/messages.module";

@Module({
  imports: [NotificationsModule, forwardRef(() => MessagesModule)],
  providers: [ConversationsService, CompatibleMatchService, SuccessStoriesService],
  controllers: [ConversationsController, SuccessStoriesController],
  exports: [ConversationsService, CompatibleMatchService, SuccessStoriesService],
})
export class ConversationsModule {}
