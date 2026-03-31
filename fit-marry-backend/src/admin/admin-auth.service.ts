import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { AdminRefreshDto } from "./dto/admin-refresh.dto";
import { AdminTwoFaService } from "./admin-two-fa.service";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly twoFaService: AdminTwoFaService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({ where: { email: dto.email } });
    if (!admin || admin.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check 2FA if enabled
    if (admin.twoFaEnabled) {
      if (!dto.twoFaToken) {
        return { requires2fa: true, message: "2FA code required" };
      }
      await this.twoFaService.validate2faLogin(admin.id, dto.twoFaToken);
    }

    return this.issueTokens(admin.id);
  }

  async refresh(dto: AdminRefreshDto) {
    const refreshTokenHash = this.hashValue(dto.refreshToken);
    const session = await this.prisma.adminSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(session.adminId);
  }

  async logout(dto: AdminRefreshDto) {
    const refreshTokenHash = this.hashValue(dto.refreshToken);
    await this.prisma.adminSession.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async createAdmin(email: string, password: string) {
    const existing = await this.prisma.admin.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Admin already exists");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.admin.create({
      data: { email, passwordHash },
    });
  }

  private async issueTokens(adminId: string) {
    const accessToken = await this.jwtService.signAsync({ sub: adminId, type: "admin" });

    const refreshSecret = this.configService.get<string>("ADMIN_JWT_REFRESH_SECRET") ?? "admin_refresh";
    const refreshExpiresIn = this.configService.get<string>("ADMIN_JWT_REFRESH_EXPIRES_IN") ?? "30d";

    const refreshToken = await this.jwtService.signAsync(
      { sub: adminId, type: "admin" },
      { secret: refreshSecret, expiresIn: refreshExpiresIn }
    );

    const refreshTokenHash = this.hashValue(refreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTtlMs(refreshExpiresIn));

    await this.prisma.adminSession.create({
      data: {
        adminId,
        refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashValue(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  private getRefreshTtlMs(expiresIn: string) {
    if (expiresIn.endsWith("d")) {
      return Number(expiresIn.replace("d", "")) * 24 * 60 * 60 * 1000;
    }
    if (expiresIn.endsWith("h")) {
      return Number(expiresIn.replace("h", "")) * 60 * 60 * 1000;
    }
    if (expiresIn.endsWith("m")) {
      return Number(expiresIn.replace("m", "")) * 60 * 1000;
    }
    const seconds = Number(expiresIn);
    if (Number.isNaN(seconds)) {
      throw new BadRequestException("Invalid refresh token expiry");
    }
    return seconds * 1000;
  }
}
