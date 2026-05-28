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
  private launchOptions = puppeteerConfig.isProd
    ? {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      }
    : {
        headless: true,
      };

  private defaultPDFOptions: PDFOptions = {
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  };

  // Твојот главен метод за генерирање кој користи затворање во finally
  async createPDF(
    htmlContent: string,
    options = this.defaultPDFOptions,
  ): Promise<Buffer> {
    let browser: Browser | undefined;
    try {
      browser = await puppeteer.launch(this.launchOptions);
      const page = await browser.newPage();

      // networkidle0 е посигурно бидејќи чека да се вчитаат сите стилови/слики
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf(options);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      console.error('Puppeteer Error:', error);
      throw new InternalServerErrorException(
        `Грешка при генерирање PDF: ${error}`,
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
