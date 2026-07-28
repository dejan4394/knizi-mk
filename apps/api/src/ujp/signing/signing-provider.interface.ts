import { Company } from '../../companies/entities/company.entity';

/** Injection токен за активниот провајдер за JWS потпишување. */
export const SIGNING_PROVIDER = Symbol('SIGNING_PROVIDER');

export interface SignedJws {
  /** Компактен JWS (header.payload.signature) над JSON документот. */
  jws: string;
  /** Сериски број на сертификатот со кој е потпишано (за X-SERIAL-NUMBER). */
  certSerialNumber: string;
}

/**
 * Апстракција за дигитален потпис во форма на **JWS** (JSON Web Signature).
 *
 * УЈП бара payload-от да се потпише со КВАЛИФИКУВАН сертификат на даночниот
 * обврзник и да се прати како JWS (не потпишан PDF). Клучот мора да остане под
 * контрола на потписникот; затоа изборот на custody (локален сервер / далечинско
 * HSM потпишување / клиентска страна) е одвоен зад овој интерфејс.
 *
 * За да смениш начин на потпишување, смени го `useClass` во `UjpModule`.
 */
export interface JwsSigningProvider {
  readonly name: string;
  /**
   * Потпишува JSON payload и враќа компактен JWS.
   * @param payload комплетниот УЈП JSON документ (со `requestTimestamp`)
   * @param docTypeCode код на тип документ (пр. '100')
   */
  signToJws(
    company: Company,
    payload: unknown,
    docTypeCode: string,
  ): Promise<SignedJws>;
}
