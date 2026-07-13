import { Company } from '../../companies/entities/company.entity';

/** Injection токен за активниот провајдер за дигитален потпис. */
export const SIGNING_PROVIDER = Symbol('SIGNING_PROVIDER');

export interface SignedDocument {
  /** Име на провајдерот што потпишал (пр. 'KIBS', 'Nextsense'). */
  provider: string;
  /** Референца/ID на потпишувачкото барање кај провајдерот. */
  signedRef: string;
  /** Статус вратен од провајдерот (пр. 'PENDING', 'SIGNED'). */
  status: string;
}

/**
 * Апстракција за дигитален потпис.
 *
 * НАМЕРНО не држиме приватни клучеви/сертификати кај нас. Секој провајдер
 * (KIBS SignPlus, Nextsense) потпишува со клуч чуван во сертифициран HSM на
 * издавачот, а корисникот го одобрува потпишувањето оддалечено (OneID/OTP).
 * За да смениш провајдер, смени го `useClass` во `UjpModule` — ништо друго.
 */
export interface SigningProvider {
  readonly name: string;
  /**
   * Иницира потпишување на подготвениот документ.
   * @param pdfBuffer готовиот PDF што се потпишува
   * @param invoiceNo број на фактура (за приказ во апликацијата на потписникот)
   */
  sign(
    company: Company,
    pdfBuffer: Buffer,
    invoiceNo: number,
  ): Promise<SignedDocument>;
}
