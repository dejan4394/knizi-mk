import { Injectable } from '@nestjs/common';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceCalculatorService } from './invoice-calculator.service';
import { UjpDocumentPayload } from '../dto/ujp-payload.types';

/**
 * ANTI-CORRUPTION СЛОЈ: мапира внатрешен `Invoice` → канонски `UjpDocumentPayload`.
 *
 * Ова е ЕДИНСТВЕНОТО место што знае како изгледа фактурата „однатре". Кога ќе
 * излезе финалната УЈП спецификација, менуваш само оваа класа (и телото во
 * `UjpClientService`). Фактурата мора да е вчитана со relations: company, client, items.
 */
@Injectable()
export class UjpInvoiceAdapterService {
  constructor(private readonly calculator: InvoiceCalculatorService) {}

  toUjpPayload(invoice: Invoice): UjpDocumentPayload {
    const { lines, netAmount, vatAmount, totalAmount } =
      this.calculator.calculate(invoice);

    const company = invoice.company;
    const client = invoice.client;

    if (!company?.edb) {
      throw new Error('Компанијата нема ЕДБ — не може да се поднесе до УЈП.');
    }
    if (!client?.edb) {
      throw new Error('Клиентот нема ЕДБ — не може да се поднесе до УЈП.');
    }

    return {
      documentType: invoice.documentType === 'PROFORMA' ? 'PROFORMA' : 'INVOICE',
      invoiceNo: invoice.invoiceNo,
      year: invoice.year,
      issueDate: new Date(invoice.created_at).toISOString(),
      dueDate: new Date(invoice.dueDate).toISOString(),
      currency: 'MKD',
      seller: {
        name: company.name,
        taxNumber: company.edb,
        address: company.address ?? undefined,
      },
      buyer: {
        name: client.name,
        taxNumber: client.edb,
        address: client.address ?? undefined,
      },
      items: lines.map((l) => ({
        description: l.item.description,
        unitOfMeasure: l.item.unitOfMeasure,
        quantity: Number(l.item.quantity),
        unitPriceNoVat: Number(l.item.price),
        discountPercent: Number(l.item.discountPercent ?? 0),
        vatRate: Number(l.item.vatRate ?? 18),
        lineNetAmount: l.net,
        lineVatAmount: l.vat,
        lineTotal: l.total,
      })),
      netAmount,
      vatAmount,
      totalAmount,
      note: invoice.note,
    };
  }
}
