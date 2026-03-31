import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { $Enums } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../common/services/email.service";
import { SmsService } from "../common/services/sms.service";
import { LoginDto } from "./dto/login.dto";
import { SignupDto } from "./dto/signup.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ResendOtpDto } from "./dto/resend-otp.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";
import * as crypto from "crypto";

const OTP_LENGTH = 6;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async signup(dto: SignupDto) {
    const identifier = this.getIdentifier(dto.email, dto.phone);
    const deviceIdHash = this.hashValue(dto.deviceId);

    const existingDevice = await this.prisma.device.findUnique({
      where: { deviceIdHash },
      include: { user: true },
    });

    let finalDeviceIdHash = deviceIdHash;
    if (existingDevice && existingDevice.userId) {
      // In development/testing phase, allow multiple accounts per device by dynamically appending something.
      finalDeviceIdHash = this.hashValue(dto.deviceId + Date.now().toString());
      console.log(`[DEV MODE] Skipping device restriction for deviceId: ${deviceIdHash}`);
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : undefined,
          dto.phone ? { phone: dto.phone } : undefined,
        ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
      },
    });

    if (existingUser) {
      throw new BadRequestException("You already have an account with this Email or Phone.");
    }

    if (!dto.ageConfirmed) {
      throw new BadRequestException("Age confirmation is required");
    }

    const referralCode = this.generateReferralCode();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        marriageType: dto.marriageType,
        ageConfirmed: dto.ageConfirmed,
        status: $Enums.UserStatus.PENDING_VERIFICATION,
        referralCode,
        devices: {
          create: {
            deviceIdHash: finalDeviceIdHash,
            status: "APPROVED",
          },
        },
        wallet: {
          create: {
            currency: this.configService.get<string>("DEFAULT_CURRENCY") ?? "USD",
          },
        },
      },
    });

    const otp = await this.issueOtp({
      identifier,
      channel: dto.email ? $Enums.OTPChannel.EMAIL : $Enums.OTPChannel.SMS,
      purpose: $Enums.OTPPurpose.SIGNUP,
      userId: user.id,
    });

    return {
      userId: user.id,
      otpSent: true,
      channel: otp.channel,
    };
  }

  async login(dto: LoginDto) {
    const identifier = this.getIdentifier(dto.email, dto.phone);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : undefined,
          dto.phone ? { phone: dto.phone } : undefined,
        ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.status !== $Enums.UserStatus.ACTIVE) {
      throw new UnauthorizedException("Account is not active");
    }

    const otp = await this.issueOtp({
      identifier,
      channel: dto.email ? $Enums.OTPChannel.EMAIL : $Enums.OTPChannel.SMS,
      purpose: $Enums.OTPPurpose.LOGIN,
      userId: user.id,
    });

    return {
      userId: user.id,
      otpSent: true,
      channel: otp.channel,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.prisma.otp.findFirst({
      where: {
        identifier: dto.identifier,
        channel: dto.channel,
        purpose: dto.purpose,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      throw new BadRequestException("OTP expired or not found");
    }

    if (otpRecord.attempts >= this.getOtpMaxAttempts()) {
      throw new BadRequestException("OTP attempts exceeded");
    }

    const hash = this.hashValue(dto.code);
    if (hash !== otpRecord.otpHash) {
      await this.prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("Invalid OTP");
    }

    const user = otpRecord.userId
      ? await this.prisma.user.findUnique({ where: { id: otpRecord.userId } })
      : await this.prisma.user.findFirst({
          where: {
            OR: [
              dto.channel === $Enums.OTPChannel.EMAIL ? { email: dto.identifier } : undefined,
              dto.channel === $Enums.OTPChannel.SMS ? { phone: dto.identifier } : undefined,
            ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
          },
        });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const updates: Record<string, Date | string> = {};
    if (dto.channel === $Enums.OTPChannel.EMAIL) {
      updates.emailVerifiedAt = new Date();
    }
    if (dto.channel === $Enums.OTPChannel.SMS) {
      updates.phoneVerifiedAt = new Date();
    }

    if (dto.purpose === $Enums.OTPPurpose.SIGNUP && user.status !== $Enums.UserStatus.ACTIVE) {
      updates.status = $Enums.UserStatus.ACTIVE;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updates,
    });

    const tokens = await this.issueTokens(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      profileCompleted: user.profileCompleted,
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const identifier = dto.identifier;
    const latestOtp = await this.prisma.otp.findFirst({
      where: {
        identifier,
        channel: dto.channel,
        purpose: dto.purpose,
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestOtp?.lastSentAt) {
      const cooldownSeconds = this.getOtpResendCooldownSeconds();
      const diff = (Date.now() - latestOtp.lastSentAt.getTime()) / 1000;
      if (diff < cooldownSeconds) {
        throw new BadRequestException("Please wait before resending OTP");
      }
    }

    await this.issueOtp({
      identifier,
      channel: dto.channel,
      purpose: dto.purpose,
      userId: latestOtp?.userId ?? undefined,
    });

    return { otpSent: true };
  }

  async refresh(dto: RefreshDto) {
    const refreshTokenHash = this.hashValue(dto.refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(session.userId);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(dto: LogoutDto) {
    const refreshTokenHash = this.hashValue(dto.refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  private getIdentifier(email?: string, phone?: string) {
    if (!email && !phone) {
      throw new BadRequestException("Email or phone is required");
    }
    return email ?? phone ?? "";
  }

  private async issueOtp(params: {
    identifier: string;
    channel: $Enums.OTPChannel;
    purpose: $Enums.OTPPurpose;
    userId?: string;
  }) {
    const otp = this.generateOtp();
    const otpHash = this.hashValue(otp);
    const expiresAt = new Date(Date.now() + this.getOtpTtlMinutes() * 60 * 1000);

    const otpRecord = await this.prisma.otp.create({
      data: {
        identifier: params.identifier,
        channel: params.channel,
        purpose: params.purpose,
        otpHash,
        expiresAt,
        lastSentAt: new Date(),
        userId: params.userId,
      },
    });

    // Log OTP in development for easy testing
    if (this.configService.get<string>('APP_ENV') !== 'production') {
      this.logger.warn(`[DEV OTP] OTP for ${params.identifier}: ${otp}`);
    }

    // Actually send the OTP
    if (params.channel === $Enums.OTPChannel.EMAIL) {
      await this.emailService.sendOtp(params.identifier, otp);
    } else if (params.channel === $Enums.OTPChannel.SMS) {
      await this.smsService.sendOtp(params.identifier, otp);
    }

    return otpRecord;
  }

  private async issueTokens(userId: string) {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const accessToken = await this.jwtService.signAsync({ sub: userId }, { expiresIn });

    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET") ?? "dev_refresh";
    const refreshExpiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "30d";
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId },
      { secret: refreshSecret, expiresIn: refreshExpiresIn }
    );

    const refreshTokenHash = this.hashValue(refreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTtlMs(refreshExpiresIn));

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private generateOtp() {
    const debugOtp = this.configService.get<string>('DEBUG_OTP');
    if (debugOtp && this.configService.get<string>('APP_ENV') !== 'production') {
      this.logger.warn(`[DEV OTP] Using debug OTP: ${debugOtp}`);
      return debugOtp;
    }
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    const otp = Math.floor(Math.random() * (max - min + 1) + min).toString();
    return otp;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps() {
    const result = await this.prisma.otp.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired OTPs`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
        ],
      },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }
  }

  private generateReferralCode() {
    return crypto.randomBytes(5).toString("hex").toUpperCase();
  }

  private hashValue(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  private getOtpTtlMinutes() {
    return Number(this.configService.get<string>("OTP_TTL_MINUTES") ?? 10);
  }

  private getOtpResendCooldownSeconds() {
    return Number(this.configService.get<string>("OTP_RESEND_COOLDOWN_SECONDS") ?? 60);
  }

  private getOtpMaxAttempts() {
    return Number(this.configService.get<string>("OTP_MAX_ATTEMPTS") ?? 5);
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
    return Number(expiresIn) * 1000;
  }
}
