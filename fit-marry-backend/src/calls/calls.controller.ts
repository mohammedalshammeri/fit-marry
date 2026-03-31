import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CallsService } from "./calls.service";
import { StartCallDto } from "./dto/start-call.dto";
import { EndCallDto } from "./dto/end-call.dto";

@ApiTags("calls")
@Controller("calls")
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post("start")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  startCall(@CurrentUser() user: { userId: string }, @Body() dto: StartCallDto) {
    return this.callsService.startCall(user.userId, dto.conversationId);
  }

  @Post("end")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  endCall(@CurrentUser() user: { userId: string }, @Body() dto: EndCallDto) {
    return this.callsService.endCall(user.userId, dto.callSessionId);
  }

  @Get("ice-servers")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getIceServers() {
    return this.callsService.getIceServers();
  }

  @Get("history")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: { userId: string }, @Query("limit") limit?: string) {
    return this.callsService.getHistory(user.userId, limit ? parseInt(limit, 10) : 20);
  }

  @Get("status/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getStatus(@Param("id") id: string) {
    return this.callsService.getStatus(id);
  }

  @Post("miss/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  missCall(@Param("id") id: string) {
    return this.callsService.missCall(id);
  }
}
