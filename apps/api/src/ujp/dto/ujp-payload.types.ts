/**
 * Официјална УЈП е-Фактура шема (реф: primer_za_json + API спецификација).
 *
 * Ова е точниот облик што се потпишува и праќа. Мапирањето внатрешен `Invoice`
 * → овие типови живее во `UjpInvoiceAdapterService` (единственото место што ја
 * знае УЈП шемата — ANTI-CORRUPTION слој).
 */

export interface UjpAddress {
  streetAddress: string;
  streetNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
}

export interface UjpHeader {
  docStorno: 0 | 1;
  docType: string; // '100' = Фактура
  docTypeName: string;
  docDate: string; // YYYY-MM-DD (датум на издавање)
  docTurnoverDate: string; // датум на промет
  docNumber: string; // сопствен број на издавачот
  docId: string; // сопствен внатрешен id
  docNotes: string | null;
  docHeader: string | null;
  docFooter: string | null;
}

export interface UjpSeller {
  sellerCCode: string;
  sellerCName: string;
  sellerTin: string;
  sellerForeignTin: string | null;
  sellerVatNumber: string | null;
  sellerName: string;
  sellerAddress: UjpAddress;
  sellerContact: string | null;
  sellerEmail: string | null;
}

export interface UjpBuyer {
  buyerCCode: string;
  buyerCName: string;
  buyerTin: string;
  buyerForeignTin: string | null;
  buyerVatNumber: string | null;
  buyerName: string;
  buyerAddress: UjpAddress;
  buyerContact: string | null;
  buyerEmail: string | null;
}

export interface UjpPayment {
  docPaymentTypeCode: string; // P10 готово, P11 картичка, P12 банка
  docPaymentTypeDesc: string;
  docCurrency: string; // 'MKD'
  docCurrencyCode: string;
  docCurrencyDate: string;
  docCurrencyExchRate: number;
}

export interface UjpDocItem {
  docItemLineNo: number;
  docItemSku?: string | null;
  docItemSenderCode?: string | null;
  docItemReceiverCode?: string | null;
  docItemDesc: string;
  docItemMUnit: string;
  docItemQty: number;
  docItemUnitOriginalPriceWoVat: number;
  docItemUnitDiscountAmount: number;
  docItemUnitPriceWoVat: number;
  docItemUnitVat: number;
  docItemVat: number; // ДДВ стапка (%)
  docItemVatGroup: string; // DDV-A/B/V/G
  docItemTotalOriginalPriceWoVat: number;
  docItemTotalPriceWoVat: number;
  docItemTotalVat: number;
  docItemTotalPriceWVat: number;
  docItemTaxIndicator: string;
  docItemDomesticProduct?: string | null;
}

export interface UjpDocTotals {
  docNetAmount: number;
  docDiscountAmount: number;
  docNetAmountDisc: number;
  docVatAmount: number;
  docGrossAmount: number;
  docGrossAmountR: number; // заокружено на цел денар
  docAvansAmount: number;
  docFinalAmount: number;
}

export interface UjpVatTotal {
  vatTaxIndicator: string;
  vatTaxIndicatorNote: string;
  vatCode: string;
  vatPercent: number;
  vatTaxableAmount: number;
  vatAmount: number;
  vatTotalAmount: number;
}

export interface UjpDocument {
  header: UjpHeader;
  seller: UjpSeller;
  buyer: UjpBuyer;
  docPayment: UjpPayment;
  docItems: UjpDocItem[];
  docTotals: UjpDocTotals;
  vatTotals: UjpVatTotal[];
}

/** Целосниот потпишан payload: {requestTimestamp, document}. */
export interface UjpEnvelope {
  requestTimestamp: string;
  document: UjpDocument;
}

/** Заглавија-идентификатори што одат со секое барање кон УЈП. */
export interface UjpSubmitContext {
  eujpId: string; // X-EUJP-ID
  edb: string; // X-EDB
  certSerialNumber: string; // X-SERIAL-NUMBER
  docTypeCode: string; // X-DOC-TYPE-CODE
}

export enum UjpSendOutcome {
  SUCCESS = 'SUCCESS',
  REJECTED = 'REJECTED',
}

export interface UjpSendResult {
  outcome: UjpSendOutcome;
  euid?: string;
  qrLink?: string;
  message?: string;
  rejectionReason?: string;
  raw: unknown;
}

/** Официјални податоци за компанија од регистарот на УЈП (по даночен број). */
export interface UjpCompanyInfo {
  taxNumber: string;
  vatNumber?: string | null;
  registrationNumber?: string;
  name: string;
  address?: {
    street?: string;
    number?: string;
    city?: string;
    zip?: string;
  };
  countryCode?: string;
}
