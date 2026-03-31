import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { prismaMock } from "../src/test/prisma.mock";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";

describe("Messages E2E", () => {
  let app: INestApplication;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = { userId: "user-1" };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /messages sends text message", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      createdAt: new Date(), // Just created, so free access
      subscriptions: [],
    } as any);

    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [{ userId: "user-1", isActive: true }],
    } as any);

    prismaMock.message.create.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
      type: "TEXT",
      text: "hello",
    } as any);

    await request(app.getHttpServer())
      .post("/messages")
      .send({
        conversationId: "conv-1",
        type: "TEXT",
        text: "hello",
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBe("msg-1");
      });
  });
});
