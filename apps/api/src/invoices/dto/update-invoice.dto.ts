import { PartialType, OmitType } from '@nestjs/mapped-types'; // <--- Внеси го OmitType овде
import { CreateInvoiceDto, CreateInvoiceItemDto } from './create-invoice.dto'; // Прилагоди ја патеката

// 1. Правиме парцијална верзија од ставката
export class UpdateInvoiceItemDto extends PartialType(CreateInvoiceItemDto) {}

// 2. Го користиме OmitType од NestJS за правилно отстранување на полето во runtime
export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateInvoiceDto, ['items'] as const),
) {
  // Сега безбедно ја додаваме новата низа од уредувачки ставки
  items?: UpdateInvoiceItemDto[];
}
