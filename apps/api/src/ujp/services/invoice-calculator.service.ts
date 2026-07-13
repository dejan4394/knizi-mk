import { Injectable } from '@nestjs/common';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceItem } from '../../invoices/entities/invoice-item.entity';

/** Пресметана ставка со заокружени износи (2 децимали). */
export interface CalculatedLine {
  item: InvoiceItem;
  net: number;
  vat: number;
  total: number;
}

export interface CalculatedInvoice {
  lines: CalculatedLine[];
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
}

/**
 * Пресметки за износи од фактура.
 *
 * ВНИМАНИЕ: TypeORM ги враќа `decimal` полињата како СТРИНГОВИ. Овде секогаш
 * поминуваме преку `Number(...)` пред аритметика, а резултатите ги заокружуваме
 * на 2 децимали за да не пропагираме грешки од floating point кон УЈП.
 */
@Injectable()
export class InvoiceCalculatorService {
  /** Заокружување на 2 децимали без floating-point шум (пр. 1.005 → 1.01). */
  round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  calculateLine(item: InvoiceItem): CalculatedLine {
    const quantity = Number(item.quantity);
    const price = Number(item.price); // decimal → string → number
    const discountPercent = Number(item.discountPercent ?? 0);
    const vatRate = Number(item.vatRate ?? 18);

    const gross = price * quantity;
    const net = this.round2(gross * (1 - discountPercent / 100));
    const vat = this.round2(net * (vatRate / 100));
    const total = this.round2(net + vat);

    return { item, net, vat, total };
  }

  calculate(invoice: Invoice): CalculatedInvoice {
    const lines = (invoice.items ?? []).map((item) => this.calculateLine(item));

    const netAmount = this.round2(
      lines.reduce((sum, l) => sum + l.net, 0),
    );
    const vatAmount = this.round2(
      lines.reduce((sum, l) => sum + l.vat, 0),
    );

    // Ако фактурата веќе носи финален износ (со заокружување), му веруваме нему;
    // инаку паѓаме назад на нето+ДДВ.
    const stored = Number(invoice.finalPayable);
    const totalAmount =
      Number.isFinite(stored) && stored > 0
        ? this.round2(stored)
        : this.round2(netAmount + vatAmount);

    return { lines, netAmount, vatAmount, totalAmount };
  }
}
