import { Module } from "@nestjs/common";
import { ComplaintsService } from "./complaints.service";
import { ComplaintsController } from "./complaints.controller";

@Module({
  providers: [ComplaintsService],
  controllers: [ComplaintsController],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
