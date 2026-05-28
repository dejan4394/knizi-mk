import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import puppeteer, { PDFOptions, Browser } from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { puppeteerConfig } from '../config/puppeteer.config'; // Поправи ја патеката до конфигурацијата

@Injectable()
export class PdfService {
  async createPDF(htmlContent: string, options?: any): Promise<Buffer> {
    let browser: any;
    try {
      // 1. Проверка дали сме онлајн на Render
      if (puppeteerConfig.isProd) {
        const sparticuzChromium = (await import('@sparticuz/chromium')) as any;

        browser = await puppeteer.launch({
          args: sparticuzChromium.args,
          defaultViewport: sparticuzChromium.defaultViewport,
          // ВАЖНО: Ги тргаме заградите () и await бидејќи сега е обичен стринг/getter
          executablePath: sparticuzChromium.executablePath,
          headless: sparticuzChromium.headless,
        });
      } else {
        // 2. Локално кај тебе на Windows (си користи фабрички локален Chrome)
        browser = await puppeteer.launch({
          headless: true,
        });
      }

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const defaultOptions = {
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        ...options,
      };

      const pdfBuffer = await page.pdf(defaultOptions);
      return Buffer.from(pdfBuffer);
    } catch (error: unknown) {
      // Го менуваме во unknown за ESLint
      console.error('Puppeteer Error:', error);

      // Безбедно извлекување на пораката за грешка за да нема "Unsafe assignment"
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      throw new InternalServerErrorException(
        `Грешка при генерирање PDF: ${errorMessage}`,
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  // Специфичниот метод за твојата фактура
  async generateInvoicePdf(invoiceData: any): Promise<Buffer> {
    const templatePath = path.join(__dirname, 'templates', 'invoice-mk-1.hbs');
    const templateHtml = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateHtml);

    const enrichedData = this.prepareInvoiceData(invoiceData); // Твојата помошна функција
    const finalHtml = compiledTemplate(enrichedData);

    return this.createPDF(finalHtml);
  }

  // Твојата помошна функција за средување на податоците
  private prepareInvoiceData(invoiceData: any) {
    // Тука стои твојот постоечки код за мапирање/средување на датите, пресметките итн.
    return invoiceData;
  }
}
