import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import {
  IInvoiceDataForTemplate,
  IItemDataForTemplate,
} from 'src/invoices/types';

@Injectable()
export class PdfService {
  async createPDF(htmlContent: string, options?: any): Promise<Buffer> {
    let browser: any;
    try {
      const isProduction =
        process.env.NODE_ENV === 'production' ||
        process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true';

      if (isProduction) {
        const chromiumModule = chromium as any;

        const path = await chromiumModule.executablePath();

        browser = await puppeteer.launch({
          args: chromiumModule.args,
          defaultViewport: chromiumModule.defaultViewport,
          executablePath: path,
          headless:
            chromiumModule.headless === 'shell'
              ? true
              : chromiumModule.headless,
        });
      } else {
        browser = await puppeteer.launch({
          headless: true,
          channel: 'chrome',
        });
      }

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const defaultOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
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
  async generateInvoicePdf(invoiceData: any): Promise<Buffer> {
    const templatePath = path.join(__dirname, 'templates', 'invoice-mk-1.hbs');
    const templateHtml = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateHtml);

    const enrichedData = this.prepareInvoiceData(invoiceData);
    const finalHtml = compiledTemplate(enrichedData);

    return this.createPDF(finalHtml);
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
