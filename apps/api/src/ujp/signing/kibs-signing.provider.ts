/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, Injectable } from '@nestjs/common';
import { KibsService } from '../../kibs/kibs.service';
import { Company } from '../../companies/entities/company.entity';
import { SignedDocument, SigningProvider } from './signing-provider.interface';

/**
 * Провајдер за потпис преку KIBS SignPlus (веќе интегриран во проектот).
 * Клучот живее во HSM на КИБС; ние никогаш не го чуваме приватниот клуч.
 */
@Injectable()
export class KibsSigningProvider implements SigningProvider {
  readonly name = 'KIBS';

  constructor(private readonly kibs: KibsService) {}

  async sign(
    company: Company,
    pdfBuffer: Buffer,
    invoiceNo: number,
  ): Promise<SignedDocument> {
    if (!company.companyOneId) {
      throw new BadRequestException(
        'Компанијата нема поставено OneID за дигитален потпис.',
      );
    }

    const res = await this.kibs.initiateDocumentSigning(
      pdfBuffer,
      company.companyOneId,
      invoiceNo,
    );

    return {
      provider: this.name,
      signedRef: res?.id ?? '',
      status: res?.status ?? 'PENDING',
    };
  }
}
