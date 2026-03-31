import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio');
      this.client = twilio(accountSid, authToken);
    }
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!this.client || !from) {
      this.logger.warn(`SMS not configured. OTP for ${phone}: ${otp}`);
      return false;
    }

    try {
      await this.client.messages.create({
        body: `رمز التحقق الخاص بك في Fit & Marry: ${otp}\nصالح لمدة 10 دقائق`,
        from,
        to: phone,
      });
      this.logger.log(`OTP SMS sent to ${phone}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP SMS to ${phone}`, error);
      return false;
    }
  }
}
