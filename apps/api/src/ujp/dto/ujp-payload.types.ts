/**
 * ANTI-CORRUPTION СЛОЈ.
 *
 * Ова е канонскиот формат со кој внатрешно ја опишуваме фактурата за е-Фактура.
 * Внатрешниот `Invoice` entity НИКОГАШ не се сериализира директно кон владиниот
 * API. Кога ќе излезе финалната спецификација на УЈП, се менува САМО мапирањето
 * во `UjpInvoiceAdapterService` (и телото на барањето во `UjpClientService`) —
 * ништо друго во апликацијата не зависи од обликот на владиниот API.
 */

export interface UjpParty {
  /** Правно име. */
  name: string;
  /** Единствен даночен број (ЕДБ). */
  taxNumber: string;
  address?: string;
}

export interface UjpLineItem {
  description: string;
  unitOfMeasure: string;
  quantity: number;
  /** Единечна цена без ДДВ. */
  unitPriceNoVat: number;
  discountPercent: number;
  /** ДДВ стапка во проценти (пр. 18). */
  vatRate: number;
  /** Нето износ за ставката (по попуст, без ДДВ). */
  lineNetAmount: number;
  lineVatAmount: number;
  lineTotal: number;
}

export interface UjpDocumentPayload {
  documentType: 'INVOICE' | 'PROFORMA';
  invoiceNo: number;
  year: number;
  /** ISO датум на издавање. */
  issueDate: string;
  /** ISO датум на достасување. */
  dueDate: string;
  currency: 'MKD';
  seller: UjpParty;
  buyer: UjpParty;
  items: UjpLineItem[];
  /** Вкупно нето (без ДДВ). */
  netAmount: number;
  vatAmount: number;
  /** Вкупно за плаќање (со ДДВ, по заокружување). */
  totalAmount: number;
  note?: string;
}

/** Како УЈП одговори на поднесувањето. */
export enum UjpAckKind {
  /** Синхроно одобрена. */
  APPROVED = 'APPROVED',
  /** Примена, чека асинхрона потврда (мора да се пита повторно). */
  ACCEPTED = 'ACCEPTED',
  /** Одбиена поради бизнис/валидациона причина (не се повторува). */
  REJECTED = 'REJECTED',
}

export interface UjpSubmitResult {
  kind: UjpAckKind;
  /** ID на документот доделен од УЈП. */
  ujpDocumentId?: string;
  /** Референца/тикет за подоцнежно проверување на статусот. */
  ujpReference?: string;
  rejectionReason?: string;
  /** Сиров одговор за ревизија. */
  raw: unknown;
}
