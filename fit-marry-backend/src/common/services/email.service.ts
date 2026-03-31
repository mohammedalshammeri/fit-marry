import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || '587');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  async sendOtp(email: string, otp: string): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@fitmarry.com';

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'رمز التحقق - Fit & Marry',
        html: this.getOtpTemplate(otp),
      });
      this.logger.log(`OTP email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      return false;
    }
  }

  async sendWelcome(email: string, name?: string): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@fitmarry.com';

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'مرحباً بك في Fit & Marry',
        html: this.getWelcomeTemplate(name),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
      return false;
    }
  }

  async sendSubscriptionConfirmation(email: string, packageName: string, endsAt: Date): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@fitmarry.com';

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'تأكيد الاشتراك - Fit & Marry',
        html: this.getSubscriptionTemplate(packageName, endsAt),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send subscription email to ${email}`, error);
      return false;
    }
  }

  async sendSubscriptionExpiring(email: string, daysLeft: number): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM') || 'noreply@fitmarry.com';

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'اشتراكك سينتهي قريباً - Fit & Marry',
        html: this.getExpiringTemplate(daysLeft),
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send expiring email to ${email}`, error);
      return false;
    }
  }

  private getOtpTemplate(otp: string): string {
    return `
    <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fdf2f4; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #d84b6b; margin: 0;">Fit & Marry</h1>
        <p style="color: #666; font-size: 14px;">تطبيق الزواج الموثوق</p>
      </div>
      <div style="background: white; border-radius: 8px; padding: 30px; text-align: center;">
        <h2 style="color: #333; margin-top: 0;">رمز التحقق</h2>
        <p style="color: #666;">استخدم الرمز التالي للتحقق من حسابك:</p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #d84b6b;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 12px;">هذا الرمز صالح لمدة 10 دقائق فقط</p>
        <p style="color: #999; font-size: 12px;">إذا لم تطلب هذا الرمز، تجاهل هذا البريد</p>
      </div>
    </div>`;
  }

  private getWelcomeTemplate(name?: string): string {
    return `
    <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fdf2f4; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #d84b6b; margin: 0;">Fit & Marry</h1>
      </div>
      <div style="background: white; border-radius: 8px; padding: 30px; text-align: center;">
        <h2 style="color: #333; margin-top: 0;">مرحباً بك ${name || ''}! 🎉</h2>
        <p style="color: #666;">نحن سعداء بانضمامك إلى عائلة Fit & Marry</p>
        <p style="color: #666;">ابدأ رحلتك في البحث عن شريك حياتك المناسب</p>
        <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px;">
          <p style="margin: 5px 0; color: #333;">✅ أكمل ملفك الشخصي</p>
          <p style="margin: 5px 0; color: #333;">✅ تصفح المرشحين</p>
          <p style="margin: 5px 0; color: #333;">✅ أرسل إعجابك</p>
        </div>
      </div>
    </div>`;
  }

  private getSubscriptionTemplate(packageName: string, endsAt: Date): string {
    return `
    <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fdf2f4; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #d84b6b; margin: 0;">Fit & Marry</h1>
      </div>
      <div style="background: white; border-radius: 8px; padding: 30px; text-align: center;">
        <h2 style="color: #333; margin-top: 0;">تم تفعيل اشتراكك! 🌟</h2>
        <p style="color: #666;">باقة: <strong>${packageName}</strong></p>
        <p style="color: #666;">صالح حتى: <strong>${endsAt.toLocaleDateString('ar-SA')}</strong></p>
      </div>
    </div>`;
  }

  private getExpiringTemplate(daysLeft: number): string {
    return `
    <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fdf2f4; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #d84b6b; margin: 0;">Fit & Marry</h1>
      </div>
      <div style="background: white; border-radius: 8px; padding: 30px; text-align: center;">
        <h2 style="color: #333; margin-top: 0;">اشتراكك سينتهي قريباً ⏰</h2>
        <p style="color: #666;">متبقي <strong>${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}</strong> على انتهاء اشتراكك</p>
        <p style="color: #666;">جدد اشتراكك الآن للاستمتاع بالميزات المميزة</p>
      </div>
    </div>`;
  }
}
