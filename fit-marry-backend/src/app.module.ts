import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UploadsController } from "./common/uploads.controller";
import { ProfilesModule } from "./profiles/profiles.module";
import { MatchingModule } from "./matching/matching.module";
import { LikesModule } from "./likes/likes.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { WalletModule } from "./wallet/wallet.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { MessagesModule } from "./messages/messages.module";
import { ComplaintsModule } from "./complaints/complaints.module";
import { AdminModule } from "./admin/admin.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { CallsModule } from "./calls/calls.module";
import { ReferralsModule } from "./referrals/referrals.module";
import { HealthModule } from "./health/health.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { GatewayModule } from "./gateway/gateway.module";
import { AdsModule } from "./ads/ads.module";
import { AccessControlModule } from "./access-control/access-control.module";
import { ScheduleModule } from "@nestjs/schedule";
import { VerificationModule } from "./verification/verification.module";
import { RatingsModule } from "./ratings/ratings.module";
import { StoriesModule } from "./stories/stories.module";

@Module({
  imports: [
    GatewayModule,
    AccessControlModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.APP_ENV === "production" ? undefined : {
          target: "pino-pretty",
          options: { colorize: true },
        },
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 30,
    }]),
    PrismaModule,
    AuthModule,
    ProfilesModule,
    MatchingModule,
    LikesModule,
    ConversationsModule,
    WalletModule,
    TransactionsModule,
    MessagesModule,
    ComplaintsModule,
    AdminModule,
    NotificationsModule,
    CallsModule,
    ReferralsModule,
    AdsModule,
    HealthModule,
    SubscriptionsModule,
    VerificationModule,
    RatingsModule,
    StoriesModule,
  ],  controllers: [UploadsController],  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
