import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentService } from '../common/services/payment.service';
import { EmailService } from '../common/services/email.service';
import { InvoiceService } from '../common/services/invoice.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ConfigModule, NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PaymentService, EmailService, InvoiceService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
