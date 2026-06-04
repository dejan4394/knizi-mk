// dto/update-invoice-status.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';

export class UpdateInvoiceStatusDto {
  @IsEnum(InvoiceStatus, {
    message: 'Статусот мора да биде: UNPAID, OVERDUE, PAID или CANCELED',
  })
  @IsNotEmpty()
  status!: InvoiceStatus;
}
