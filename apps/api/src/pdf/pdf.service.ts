import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { puppeteerConfig } from '../config/puppeteer.config'; // Поправи ја патеката до конфигурацијата
import puppeteer from 'puppeteer-core';

@Injectable()
export class PdfService {
  async createPDF(htmlContent: string, options?: any): Promise<Buffer> {
    let browser: any;
    try {
      if (puppeteerConfig.isProd) {
        // ОНЛАЈН НА RENDER
        const sparticuzChromium = (await import('@sparticuz/chromium')) as any;

        browser = await puppeteer.launch({
          args: sparticuzChromium.args,
          defaultViewport: sparticuzChromium.defaultViewport,
          executablePath: sparticuzChromium.executablePath, // Како getter, без загради ()
          headless: sparticuzChromium.headless,
        });
      } else {
        // ЛОКАЛНО КАЈ ТЕБЕ НА WINDOWS
        // Локално ќе го натераме puppeteer-core да го отвори твојот реален Chrome на компјутерот
        browser = await puppeteer.launch({
          headless: true,
          // Оваа патека му кажува на puppeteer-core каде е твојот Chrome на Windows.
          // Ако користиш Edge или стандарден Chrome, тој сам ќе го најде преку ова:
          channel: 'chrome',
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
      console.error('Puppeteer Error:', error);
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
