import { Injectable } from '@nestjs/common';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceItem } from '../../invoices/entities/invoice-item.entity';
import { UjpDocItem, UjpDocument, UjpVatTotal } from '../dto/ujp-payload.types';

/**
 * ANTI-CORRUPTION СЛОЈ: мапира внатрешен `Invoice` → официјален УЈП `document`.
 *
 * Единственото место што ја знае УЈП шемата. Пресметките ги следат формулите од
 * спецификацијата (ставки со полна прецизност, тотали заокружени на 2, бруто на
 * цел денар). Фактурата мора да е вчитана со relations: company, client, items.
 *
 * ⚠ ОГРАНИЧУВАЊА (за доработка кога моделот ќе се прошири):
 *  - Адресите (company/client) се единечни стрингови → одат во `streetAddress`;
 *    структурирани улица/број/пошта/град бараат нови полиња (или УЈП company-lookup).
 *  - Даночниот индикатор се мапира по стапка (стандардни случаи). Специјалните
 *    (член 32 → DDV-11-A, ослободен → DDV-9) бараат поле по ставка.
 *  - Тип на плаќање се претпоставува P12 (банка).
 */
@Injectable()
export class UjpInvoiceAdapterService {
  /** Мапирање ДДВ стапка (%) → шифра на даночна група/индикатор. */
  private vatGroupForRate(rate: number): string {
    switch (rate) {
      case 18:
        return 'DDV-A';
      case 10:
        return 'DDV-V';
      case 5:
        return 'DDV-B';
      case 0:
        return 'DDV-G';
      default:
        return 'DDV-A';
    }
  }

  private round(value: number, decimals: number): number {
    const f = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * f) / f;
  }

  private mapItem(item: InvoiceItem, lineNo: number): UjpDocItem {
    const qty = Number(item.quantity);
    const unitOrig = Number(item.price); // единечна цена без ДДВ (пред попуст)
    const discountPercent = Number(item.discountPercent ?? 0);
    const vatRate = Number(item.vatRate ?? 18);

    const unitDisc = this.round((unitOrig * discountPercent) / 100, 4);
    const unitWoVat = this.round(unitOrig - unitDisc, 4);
    const unitVat = this.round((unitWoVat * vatRate) / 100, 4);

    const totalOrig = this.round(qty * unitOrig, 4);
    const totalWoVat = this.round(qty * unitWoVat, 4);
    const totalVat = this.round(qty * unitVat, 4);
    const totalWVat = this.round(totalWoVat + totalVat, 4);

    const group = this.vatGroupForRate(vatRate);

    return {
      docItemLineNo: lineNo,
      docItemSku: null,
      docItemSenderCode: null,
      docItemReceiverCode: null,
      docItemDesc: item.description,
      docItemMUnit: item.unitOfMeasure || 'пар.',
      docItemQty: qty,
      docItemUnitOriginalPriceWoVat: unitOrig,
      docItemUnitDiscountAmount: unitDisc,
      docItemUnitPriceWoVat: unitWoVat,
      docItemUnitVat: unitVat,
      docItemVat: vatRate,
      docItemVatGroup: group,
      docItemTotalOriginalPriceWoVat: totalOrig,
      docItemTotalPriceWoVat: totalWoVat,
      docItemTotalVat: totalVat,
      docItemTotalPriceWVat: totalWVat,
      docItemTaxIndicator: group,
      docItemDomesticProduct: null,
    };
  }

  private buildVatTotals(items: UjpDocItem[]): UjpVatTotal[] {
    const groups = new Map<string, UjpVatTotal>();
    for (const it of items) {
      const key = it.docItemTaxIndicator;
      const g = groups.get(key) ?? {
        vatTaxIndicator: key,
        vatTaxIndicatorNote: '',
        vatCode: it.docItemVatGroup,
        vatPercent: it.docItemVat,
        vatTaxableAmount: 0,
        vatAmount: 0,
        vatTotalAmount: 0,
      };
      g.vatTaxableAmount += it.docItemTotalPriceWoVat;
      g.vatAmount += it.docItemTotalVat;
      g.vatTotalAmount += it.docItemTotalPriceWVat;
      groups.set(key, g);
    }
    // Заокружи ги групите на 2 децимали.
    return Array.from(groups.values()).map((g) => ({
      ...g,
      vatTaxableAmount: this.round(g.vatTaxableAmount, 2),
      vatAmount: this.round(g.vatAmount, 2),
      vatTotalAmount: this.round(g.vatTotalAmount, 2),
    }));
  }

  private toDate(value: Date | string): string {
    return new Date(value).toISOString().slice(0, 10); // YYYY-MM-DD
  }

  toUjpDocument(invoice: Invoice): UjpDocument {
    const company = invoice.company;
    const client = invoice.client;

    if (!company?.edb) {
      throw new Error('Компанијата нема ЕДБ — не може да се поднесе до УЈП.');
    }
    if (!client?.edb) {
      throw new Error('Клиентот нема ЕДБ — не може да се поднесе до УЈП.');
    }

    const items = (invoice.items ?? []).map((it, i) => this.mapItem(it, i + 1));

    // Тотали според формулите од спецификацијата.
    const docNetAmount = this.round(
      items.reduce((s, i) => s + i.docItemTotalOriginalPriceWoVat, 0),
      2,
    );
    const docDiscountAmount = this.round(
      items.reduce((s, i) => s + i.docItemQty * i.docItemUnitDiscountAmount, 0),
      2,
    );
    const docNetAmountDisc = this.round(docNetAmount - docDiscountAmount, 2);
    const docVatAmount = this.round(
      items.reduce((s, i) => s + i.docItemTotalVat, 0),
      2,
    );
    const docGrossAmount = this.round(docNetAmountDisc + docVatAmount, 2);
    const docGrossAmountR = Math.round(docGrossAmount);
    const docAvansAmount = 0;
    const docFinalAmount = docGrossAmountR - docAvansAmount;

    const issueDate = this.toDate(invoice.created_at);

    return {
      header: {
        docStorno: 0,
        docType: '100',
        docTypeName: 'Фактура',
        docDate: issueDate,
        docTurnoverDate: issueDate,
        docNumber: `${invoice.invoiceNo}/${invoice.year}`,
        docId: String(invoice.id),
        docNotes: invoice.note ?? null,
        docHeader: null,
        docFooter: null,
      },
      seller: {
        sellerCCode: 'MK',
        sellerCName: 'Северна Македонија',
        sellerTin: company.edb,
        sellerForeignTin: null,
        sellerVatNumber: `МК${company.edb}`,
        sellerName: company.name,
        sellerAddress: { streetAddress: company.address ?? '' },
        sellerContact: company.phone ?? null,
        sellerEmail: company.email ?? null,
      },
      buyer: {
        buyerCCode: 'MK',
        buyerCName: 'Северна Македонија',
        buyerTin: client.edb,
        buyerForeignTin: null,
        buyerVatNumber: `МК${client.edb}`,
        buyerName: client.name,
        buyerAddress: { streetAddress: client.address ?? '' },
        buyerContact: null,
        buyerEmail: null,
      },
      docPayment: {
        docPaymentTypeCode: 'P12',
        docPaymentTypeDesc: 'Плаќање преку банка',
        docCurrency: 'MKD',
        docCurrencyCode: 'MKD',
        docCurrencyDate: issueDate,
        docCurrencyExchRate: 1,
      },
      docItems: items,
      docTotals: {
        docNetAmount,
        docDiscountAmount,
        docNetAmountDisc,
        docVatAmount,
        docGrossAmount,
        docGrossAmountR,
        docAvansAmount,
        docFinalAmount,
      },
      vatTotals: this.buildVatTotals(items),
    };
  }
}
