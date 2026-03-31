import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CallsService } from "./calls.service";
import { CallsController } from "./calls.controller";
import { WalletModule } from "../wallet/wallet.module";
import { CallsGateway } from "./calls.gateway";

@Module({
  imports: [
    WalletModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") ?? "dev_secret",
      }),
    }),
  ],
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
})
export class CallsModule {}
