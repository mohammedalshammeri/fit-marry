import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { CallsService } from "./calls.service";

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || true,
    credentials: true,
  },
  namespace: "calls",
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CallsGateway.name);

  // Track connected users: userId -> socketId
  private connectedUsers = new Map<string, string>();
  // Inverse: socketId -> userId
  private socketToUser = new Map<string, string>();

  constructor(
    private readonly callsService: CallsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Calls client ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET') || 'dev_secret';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const userId = payload.sub;

      (client as any).userId = userId;
      this.connectedUsers.set(userId, client.id);
      this.socketToUser.set(client.id, userId);
      this.logger.log(`User ${userId} connected to calls with socket ${client.id}`);
    } catch {
      this.logger.warn(`Calls client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.connectedUsers.delete(userId);
      this.socketToUser.delete(client.id);
      this.logger.log(`User ${userId} disconnected from calls`);
    }
  }

  @SubscribeMessage("call_user")
  async handleCallUser(
    @MessageBody() data: { targetUserId: string; conversationId: string; offer: any, callerName: string, callerAvatar: string },
    @ConnectedSocket() client: Socket,
  ) {
    const callerId = this.socketToUser.get(client.id);
    if (!callerId) return { error: "Not registered" };

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit("incoming_call", {
        from: callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        conversationId: data.conversationId,
        offer: data.offer,
      });
      return { success: true };
    } else {
      return { error: "User offline" };
    }
  }

  @SubscribeMessage("answer_call")
  handleAnswerCall(
    @MessageBody() data: { toUserId: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    const answererId = this.socketToUser.get(client.id);
    if (!answererId) return { error: "Not registered" };

    const targetSocketId = this.connectedUsers.get(data.toUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit("call_answered", {
        from: answererId,
        answer: data.answer,
      });
    }
  }

  @SubscribeMessage("ice_candidate")
  handleIceCandidate(
    @MessageBody() data: { toUserId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = this.socketToUser.get(client.id);
    if (!senderId) return { error: "Not registered" };

    const targetSocketId = this.connectedUsers.get(data.toUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit("receive_ice_candidate", {
        from: senderId,
        candidate: data.candidate,
      });
    }
  }

  @SubscribeMessage("end_call")
  handleEndCall(
    @MessageBody() data: { toUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const enderId = this.socketToUser.get(client.id);
    if (!enderId) return { error: "Not registered" };

    const targetSocketId = this.connectedUsers.get(data.toUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit("call_ended", {
        from: enderId,
      });
    }
  }
}
