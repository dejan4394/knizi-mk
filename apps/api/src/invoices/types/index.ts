import { DocumentType, InvoiceStatus } from '../entities/invoice.entity';

export interface IInvoiceDataForTemplate {
  status: InvoiceStatus;
  documentType: DocumentType;
  invoiceNumber: string;
  companyName: string;
  companyEdb: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyBank: string;
  clientName: string;
  clientEdb: string;
  clientAddress: string;
  date: string;
  dueDate: string;
  items: IItemDataForTemplate[];
  subtotalAmount: string;
  vatAmount: string;
  totalWithVat: string;
  roundingAmount: string;
  finalPayable: number;
}

export interface IItemDataForTemplate {
  rbr: number;
  description: string;
  unitOfMeasure: string;
  quantity: number;
  price: string;
  discountPercent: string;
  priceWithDiscount: string;
  itemSubtotal: string;
  vatRate: string;
}
