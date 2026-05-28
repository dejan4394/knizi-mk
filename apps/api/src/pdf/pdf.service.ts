import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Browser } from 'puppeteer';
import {
  IInvoiceDataForTemplate,
  IItemDataForTemplate,
} from 'src/invoices/types';
@Injectable()
export class PdfService {
  async generateInvoicePdf(
    invoiceData: IInvoiceDataForTemplate,
  ): Promise<Buffer> {
    let browser: Browser | null = null;

    try {
      const templatePath = path.join(
        __dirname,
        'templates',
        'invoice-mk-1.hbs',
      );

      const templateHtml = fs.readFileSync(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateHtml);

      const enrichedData = this.prepareInvoiceData(invoiceData);
      const finalHtml = compiledTemplate(enrichedData);

      browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        headless: true,
      });

      const page = await browser.newPage();
      await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();

      console.error('Грешка при генерирање на PDF:', error);
      throw new InternalServerErrorException(
        'Неуспешно генерирање на PDF документ.',
      );
    }
  }
  private prepareInvoiceData(data: IInvoiceDataForTemplate) {
    const vatGroups: Record<
      number,
      { vatRate: number; base: number; vat: number; total: number }
    > = {};

    data.items.forEach((item: IItemDataForTemplate) => {
      const vatRate = parseInt(item.vatRate) || 0;

      const base = Number(item.itemSubtotal || 0);
      const vat = base * (vatRate / 100);
      const total = base + vat;

      if (!vatGroups[vatRate]) {
        vatGroups[vatRate] = { vatRate, base: 0, vat: 0, total: 0 };
      }
      vatGroups[vatRate].base += base;
      vatGroups[vatRate].vat += vat;
      vatGroups[vatRate].total += total;
    });

    const vatRecapitulation = Object.values(vatGroups).map((group) => ({
      vatRate: group.vatRate,
      base: group.base.toFixed(2),
      vat: group.vat.toFixed(2),
      total: group.total.toFixed(2),
    }));

    return {
      ...data,
      vatRecapitulation,
    };
  }
}
