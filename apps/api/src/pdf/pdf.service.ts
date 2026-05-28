import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  async generateInvoicePdf(invoiceData: any): Promise<Buffer> {
    let browser;
    try {
      // 1. Патека до твојот .hbs шаблон
      const templatePath = path.join(
        __dirname,
        'templates',
        'invoice-mk-1.hbs',
      );

      const templateHtml = fs.readFileSync(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateHtml);

      // 2. Ја повикуваме подобрената пресметка за рекапитулација на ДДВ
      const enrichedData = this.prepareInvoiceData(invoiceData);
      const finalHtml = compiledTemplate(enrichedData);

      // 3. Стартување на Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

  // Помошна функција за генерирање на табелата за рекапитулација на ДДВ
  private prepareInvoiceData(data: any) {
    // Објект во кој ги групираме даночните стапки (за малата лева табела)
    const vatGroups: Record<
      number,
      { vatRate: number; base: number; vat: number; total: number }
    > = {};

    // Бидејќи ставките (data.items) доаѓаат веќе пресметани од контролерот,
    // само поминуваме низ нив за да ги наполниме ДДВ групите
    data.items.forEach((item: any) => {
      // Го вадиме ДДВ процентот (пр. од "18%" вадиме чисто 18)
      const vatRate = parseInt(item.vatRate) || 0;

      // Вкупната основа за ставката со веќе пресметан попуст (itemSubtotal)
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

    // Форматирање на групираните даноци во низа со 2 децимали
    const vatRecapitulation = Object.values(vatGroups).map((group) => ({
      vatRate: group.vatRate,
      base: group.base.toFixed(2),
      vat: group.vat.toFixed(2),
      total: group.total.toFixed(2),
    }));

    return {
      ...data, // Ги задржуваме веќе форматираните items, subtotalAmount, vatAmount, finalPayable итн.
      vatRecapitulation, // Ова ја полни рекапитулацијата во шаблонот
    };
  }
}
