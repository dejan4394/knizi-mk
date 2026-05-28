export class CreateInvoiceItemDto {
  description!: string;
  quantity!: number;
  unitOfMeasure?: string;
  price!: number;
  discountPercent?: number;
  vatRate?: number;
}

export class CreateInvoiceDto {
  invoiceNo!: string;
  companyId!: number;
  clientId!: number;
  dueDate!: string | Date;
  note?: string;
  items!: CreateInvoiceItemDto[]; // Стриктна низа од ставки, наместо any
}
