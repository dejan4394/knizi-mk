/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface SignPlusResponse {
  data: {
    id: string;
    status: string;
    // додади и други полиња кои ти требаат од response.data
  };
}

@Injectable()
export class KibsService {
  private readonly baseUrl =
    process.env.KIBS_API_BASE_URL || 'https://test-api.kibs.mk/v1';
  private readonly clientId = process.env.KIBS_CLIENT_ID;
  private readonly clientSecret = process.env.KIBS_CLIENT_SECRET;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Чекор 1: Добивање на OAuth2 Access Token од КИБС.
   * Овој токен има одредено времетраење (пр. 1 час) и го идентификува книжи.мк
   */
  private async getAccessToken(): Promise<string> {
    try {
      // Забелешка: Ова е стандарден OAuth2 повик.
      // Некои API-а бараат податоците да се пратат како x-www-form-urlencoded, некои како чист JSON.
      // Го поставуваме како JSON како почетна точка.
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/oauth/token`, {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }),
      );

      return response.data.access_token;
    } catch (error: any) {
      console.error(
        'Грешка при земање КИБС OAuth2 Токен:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Автентикацијата со КИБС не успеа. Проверете ги апликациските клучеви.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Чекор 2: Иницирање на потпишување документ (SignPlus)
   * Оваа функција ќе ја повикаме од InvoiceService кога корисникот ќе кликне на копчето.
   */
  async initiateDocumentSigning(
    pdfBuffer: Buffer,
    signerOneId: string,
    invoiceNo: number,
  ): Promise<any> {
    console.log(pdfBuffer, signerOneId, invoiceNo, 'PAYLOAD INITIATE SIGNINIG');

    const accessToken = await this.getAccessToken();

    const pdfBase64 = pdfBuffer.toString('base64');

    try {
      // Штом стигне документацијата, само ќе го усогласиме телото (payload-от) на реквестот
      const response = await firstValueFrom(
        // Го додаваме генеричкиот тип тука <SignPlusResponse>
        this.httpService.post<SignPlusResponse>(
          `${this.baseUrl}/signplus/signature-requests`,
          {
            document: {
              content: pdfBase64,
              fileName: `Faktura-${invoiceNo}.pdf`,
              contentType: 'application/pdf',
            },
            signer: {
              identityProvider: 'OneID',
              signerIdentifier: signerOneId,
            },
            displayMessage: `Ве молиме одобрете го потпишувањето на фактура бр. ${invoiceNo} во книжи.мк`,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error: any) {
      console.error(
        'Грешка при SignPlus иницијализација:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Системот на КИБС одби да го процесира документот.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
