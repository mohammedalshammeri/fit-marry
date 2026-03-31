import { Module, Global } from "@nestjs/common";
import { AccessControlService } from "./access-control.service";
import { PrismaModule } from "../prisma/prisma.module";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
