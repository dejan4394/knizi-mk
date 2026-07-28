/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Company } from '../../companies/entities/company.entity';
import { JwsSigningProvider, SignedJws } from './signing-provider.interface';

/**
 * JWS потпишување преку далечинско (HSM) потпишување на KIBS.
 *
 * Клучот НИКОГАШ не е кај нас — живее во HSM на KIBS. Ние го составуваме JWS-от
 * локално и праќаме САМО хеш до KIBS за потпис (стандарден remote-JWS образец):
 *
 *   signingInput = base64url(header) + "." + base64url(payload)
 *   digest       = SHA-256(signingInput)                → пратено до KIBS
 *   signature    = KIBS(digest)                         → враќа KIBS
 *   JWS          = signingInput + "." + base64url(signature)
 *
 * ⚠ ЕДИНСТВЕН НЕПОТВРДЕН ДЕЛ: точниот KIBS ендпоинт/договор за потпишување хеш
 * (или JAdES). Тоа мора да се потврди со helpdesk@kibstrust.com и се конфигурира
 * преку `KIBS_SIGN_ENDPOINT`. Сè друго тука е стандардно и точно.
 *
 * Во СИМУЛАЦИЈА (без `UJP_API_BASE_URL`) враќа лажен JWS за да работи pipeline-от.
 */
@Injectable()
export class KibsJwsSigningProvider implements JwsSigningProvider {
  readonly name = 'KIBS';
  private readonly logger = new Logger(KibsJwsSigningProvider.name);

  private readonly baseUrl =
    process.env.KIBS_API_BASE_URL || 'https://test-api.kibs.mk/v1';
  private readonly clientId = process.env.KIBS_CLIENT_ID;
  private readonly clientSecret = process.env.KIBS_CLIENT_SECRET;
  /** Ендпоинт за потпишување хеш/JAdES — потврди го со KIBS. */
  private readonly signEndpoint = process.env.KIBS_SIGN_ENDPOINT;
  private readonly simulate =
    process.env.UJP_SIMULATE === 'true' || !process.env.UJP_API_BASE_URL;

  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly httpService: HttpService) {}

  private base64url(input: string | Buffer): string {
    return (typeof input === 'string' ? Buffer.from(input, 'utf8') : input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async signToJws(
    company: Company,
    payload: unknown,
    docTypeCode: string,
  ): Promise<SignedJws> {
    const header = { alg: 'RS256', typ: 'JWT' };
    const signingInput = `${this.base64url(JSON.stringify(header))}.${this.base64url(
      JSON.stringify(payload),
    )}`;

    if (this.simulate) {
      this.logger.log(
        `[СИМУЛАЦИЈА] KIBS JWS потпис за docType ${docTypeCode}.`,
      );
      return {
        jws: `${signingInput}.SIMULATED_SIGNATURE`,
        certSerialNumber: process.env.UJP_CERT_SERIAL || 'SIM-CERT',
      };
    }

    if (!this.signEndpoint) {
      throw new Error(
        'KIBS_SIGN_ENDPOINT не е поставен. Потврди го договорот за далечинско ' +
          'потпишување хеш/JAdES со KIBS (helpdesk@kibstrust.com) и постави го ендпоинтот.',
      );
    }
    if (!company.companyOneId) {
      throw new Error('Компанијата нема OneID за потпишување со KIBS.');
    }

    const digest = createHash('sha256').update(signingInput).digest();
    const { signatureB64, certSerialNumber } = await this.signHashWithKibs(
      digest,
      company,
    );
    const signature = this.base64url(Buffer.from(signatureB64, 'base64'));

    return {
      jws: `${signingInput}.${signature}`,
      certSerialNumber,
    };
  }

  /**
   * Праќа хеш до KIBS за потпис. ОБЛИКОТ НА БАРАЊЕТО Е ПРЕТПОСТАВКА — усогласи го
   * со реалната KIBS спецификација штом ќе ја добиеш.
   */
  private async signHashWithKibs(
    digest: Buffer,
    company: Company,
  ): Promise<{ signatureB64: string; certSerialNumber: string }> {
    const token = await this.getAccessToken();
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}${this.signEndpoint}`,
        {
          profileId: company.kibsProfileId,
          signerIdentifier: company.companyOneId,
          identityProvider: 'OneID',
          hashAlgorithm: 'SHA-256',
          hash: digest.toString('base64'),
          signatureFormat: 'JWS',
        },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );
    const data = response.data;
    return {
      signatureB64: data?.signature ?? data?.signatureValue,
      certSerialNumber:
        data?.certSerialNumber ?? process.env.UJP_CERT_SERIAL ?? '',
    };
  }

  /** OAuth2 client-credentials со кеш во меморија. */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt - 60_000 > now) {
      return this.cachedToken.value;
    }
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    );
    const value = response.data.access_token as string;
    const expiresInSec = Number(response.data.expires_in ?? 3600);
    this.cachedToken = { value, expiresAt: now + expiresInSec * 1000 };
    return value;
  }
}
