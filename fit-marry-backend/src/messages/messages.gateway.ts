import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";

type AuthenticatedSocket = Socket & {
  data: {
    userId?: string;
  };
};

@WebSocketGateway({
  namespace: "/messages",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  /** userId → Set of socket IDs */
  private onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const userId = await this.authenticate(client);
      client.data.userId = userId;

      // Track online status
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client.id);

      // Update lastSeenAt
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      }).catch(() => {});

      // Broadcast online event to user's conversation partners
      this.broadcastPresence(userId, true);

      this.logger.debug(`Socket connected for user ${userId}`);
    } catch (error) {
      this.logger.warn(`Socket authentication failed: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data.userId;
    if (!userId) return;

    const sockets = this.onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.onlineUsers.delete(userId);
        // Update lastSeenAt on full disconnect
        await this.prisma.user.update({
          where: { id: userId },
          data: { lastSeenAt: new Date() },
        }).catch(() => {});
        this.broadcastPresence(userId, false);
      }
    }

    this.logger.debug(`Socket disconnected for user ${userId}`);
  }

  @SubscribeMessage("conversation:join")
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId) {
      return { ok: false };
    }

    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: payload.conversationId,
        userId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!participant) {
      return { ok: false };
    }

    await client.join(this.roomName(payload.conversationId));
    return { ok: true, conversationId: payload.conversationId };
  }

  @SubscribeMessage("conversation:leave")
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    if (!payload?.conversationId) {
      return { ok: false };
    }

    await client.leave(this.roomName(payload.conversationId));
    return { ok: true, conversationId: payload.conversationId };
  }

  @SubscribeMessage("typing:start")
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId) return;

    client.to(this.roomName(payload.conversationId)).emit("typing:start", {
      userId,
      conversationId: payload.conversationId,
    });
  }

  @SubscribeMessage("typing:stop")
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId) return;

    client.to(this.roomName(payload.conversationId)).emit("typing:stop", {
      userId,
      conversationId: payload.conversationId,
    });
  }

  @SubscribeMessage("message:read")
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId?: string; messageId?: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.conversationId || !payload.messageId) return;

    // Upsert the message view
    await this.prisma.messageView.upsert({
      where: { messageId_userId: { messageId: payload.messageId, userId } },
      update: { viewedAt: new Date() },
      create: { messageId: payload.messageId, userId, viewedAt: new Date() },
    }).catch(() => {});

    // Broadcast read receipt to the conversation
    client.to(this.roomName(payload.conversationId)).emit("message:read", {
      userId,
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      readAt: new Date().toISOString(),
    });
  }

  /** Check if a user is currently online */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /** Get set of online user IDs */
  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  emitMessageCreated(conversationId: string, message: Record<string, unknown>) {
    this.server.to(this.roomName(conversationId)).emit("message:new", message);
  }

  emitMessageDeleted(conversationId: string, messageId: string) {
    this.server.to(this.roomName(conversationId)).emit("message:deleted", { messageId });
  }

  emitMessageRead(conversationId: string, messageId: string, userId: string, readAt: string) {
    this.server.to(this.roomName(conversationId)).emit("message:read", {
      userId,
      messageId,
      conversationId,
      readAt,
    });
  }

  /** Emit compatible match event */
  emitCompatibleMatch(conversationId: string, data: Record<string, unknown>) {
    this.server.to(this.roomName(conversationId)).emit("compatible:match", data);
  }

  private roomName(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  /** Broadcast user's online/offline status to all their conversation partners */
  private async broadcastPresence(userId: string, isOnline: boolean) {
    try {
      const participations = await this.prisma.conversationParticipant.findMany({
        where: { userId, isActive: true },
        select: { conversationId: true },
      });
      for (const p of participations) {
        this.server.to(this.roomName(p.conversationId)).emit("user:presence", {
          userId,
          isOnline,
          lastSeenAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      this.logger.error('Failed to broadcast presence', e);
    }
  }

  private async authenticate(client: Socket) {
    const handshakeToken =
      typeof client.handshake.auth?.token === "string"
        ? client.handshake.auth.token
        : typeof client.handshake.headers.authorization === "string"
          ? client.handshake.headers.authorization
          : null;

    if (!handshakeToken) {
      throw new Error("Missing token");
    }

    const token = handshakeToken.startsWith("Bearer ") ? handshakeToken.slice(7) : handshakeToken;
    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
      secret: this.configService.get<string>("JWT_SECRET") ?? "dev_secret",
    });

    if (!payload?.sub) {
      throw new Error("Invalid token payload");
    }

    return payload.sub;
  }
}
