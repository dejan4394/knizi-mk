import { DocumentType } from '../entities/invoice.entity';

export class CreateInvoiceItemDto {
  description!: string;
  quantity!: number;
  unitOfMeasure?: string;
  price!: number;
  discountPercent?: number;
  vatRate?: number;
}

export class CreateInvoiceDto {
  invoiceNo!: number;
  companyId!: number;
  clientId!: number;
  dueDate!: string | Date;
  note?: string;
  items!: CreateInvoiceItemDto[]; // Стриктна низа од ставки, наместо any
  documentType?: DocumentType;
}
