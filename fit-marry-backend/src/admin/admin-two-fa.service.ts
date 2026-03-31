import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { generateSecret, generateURI, verifySync } from "otplib";
import * as qrcode from "qrcode";

@Injectable()
export class AdminTwoFaService {
  constructor(private readonly prisma: PrismaService) {}

  async setup2fa(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new BadRequestException("Admin not found");
    }

    if (admin.twoFaEnabled) {
      throw new BadRequestException("2FA is already enabled");
    }

    const secret = generateSecret();

    // Store secret temporarily (not enabled yet until verified)
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { twoFaSecret: secret },
    });

    const otpAuthUrl = generateURI({
      label: admin.email,
      issuer: "FitMarry Admin",
      secret,
    });
    const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

    return {
      secret,
      qrCode: qrCodeDataUrl,
    };
  }

  async verify2fa(adminId: string, token: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.twoFaSecret) {
      throw new BadRequestException("2FA setup not started");
    }

    const result = verifySync({ token, secret: admin.twoFaSecret });
    if (!result.valid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { twoFaEnabled: true },
    });

    return { success: true, message: "2FA enabled successfully" };
  }

  async disable2fa(adminId: string, token: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.twoFaEnabled || !admin.twoFaSecret) {
      throw new BadRequestException("2FA is not enabled");
    }

    const result = verifySync({ token, secret: admin.twoFaSecret });
    if (!result.valid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    await this.prisma.admin.update({
      where: { id: adminId },
      data: { twoFaEnabled: false, twoFaSecret: null },
    });

    return { success: true, message: "2FA disabled successfully" };
  }

  async validate2faLogin(adminId: string, token: string): Promise<boolean> {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.twoFaEnabled || !admin.twoFaSecret) {
      return true; // 2FA not enabled, skip
    }

    if (!token) {
      throw new UnauthorizedException("2FA code required");
    }

    const result = verifySync({ token, secret: admin.twoFaSecret });
    if (!result.valid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    return true;
  }
}
