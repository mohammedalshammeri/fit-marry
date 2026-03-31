import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import crypto from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { prismaMock } from "../src/test/prisma.mock";

describe("Auth E2E", () => {
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
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/signup returns otpSent", async () => {
    prismaMock.device.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "user-1" } as any);
    prismaMock.otp.create.mockResolvedValue({ channel: "EMAIL" } as any);

    await request(app.getHttpServer())
      .post("/auth/signup")
      .send({
        email: "test@example.com",
        deviceId: "device-uuid-1",
        marriageType: "PERMANENT",
        ageConfirmed: true,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.otpSent).toBe(true);
      });
  });

  it("POST /auth/verify-otp returns tokens", async () => {
    const code = "123456";
    const otpHash = crypto.createHash("sha256").update(code).digest("hex");

    prismaMock.otp.findFirst.mockResolvedValue({
      id: "otp-1",
      otpHash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 1000 * 60),
      userId: "user-1",
      channel: "EMAIL",
      purpose: "SIGNUP",
    } as any);
    prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", status: "PENDING_VERIFICATION" } as any);
    prismaMock.user.update.mockResolvedValue({ id: "user-1" } as any);
    prismaMock.session.create.mockResolvedValue({ id: "session-1" } as any);

    await request(app.getHttpServer())
      .post("/auth/verify-otp")
      .send({
        identifier: "test@example.com",
        channel: "EMAIL",
        purpose: "SIGNUP",
        code,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
      });
  });

  it("POST /auth/logout returns success", async () => {
    prismaMock.session.updateMany.mockResolvedValue({ count: 1 } as any);

    await request(app.getHttpServer())
      .post("/auth/logout")
      .send({ refreshToken: "fake" })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });
});
