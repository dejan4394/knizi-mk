import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import * as nodemailer from 'nodemailer';
import { PdfService } from 'src/pdf/pdf.service';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepository: Repository<InvoiceItem>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>, // ИНЈЕКТИРАЈ ГО РЕПОЗИТОРИУМОТ ЗА КЛИЕНТИ
    private readonly pdfService: PdfService,
  ) {}

  async create(
    createInvoiceDto: CreateInvoiceDto,
    loggedInCompanyId: number,
  ): Promise<Invoice> {
    const { items, invoiceNo, clientId, dueDate, note } = createInvoiceDto;

    const clientExists = await this.clientRepository.findOne({
      where: { id: Number(clientId) },
    });
    if (!clientExists) {
      throw new NotFoundException(
        `Клиентот со ID ${clientId} не е пронајден во системот.`,
      );
    }

    let subtotalAmount = 0;
    let vatAmount = 0;

    const invoiceItems: InvoiceItem[] = items.map((item) => {
      const quantity = Number(item.quantity);
      const price = Number(item.price);
      const discountPercent = Number(item.discountPercent ?? 0);
      const vatRate = Number(item.vatRate ?? 18);
      const description = item.description || '';

      const priceAfterDiscount = price * (1 - discountPercent / 100);
      const itemSubtotal = priceAfterDiscount * quantity;
      const itemVat = itemSubtotal * (vatRate / 100);

      subtotalAmount += itemSubtotal;
      vatAmount += itemVat;

      const invoiceItem = new InvoiceItem();
      invoiceItem.description = description;
      invoiceItem.quantity = quantity;
      invoiceItem.unitOfMeasure = item.unitOfMeasure || 'ПАР';
      invoiceItem.price = price;
      invoiceItem.discountPercent = discountPercent;
      invoiceItem.vatRate = vatRate;

      return invoiceItem;
    });

    const exactTotalWithVat = subtotalAmount + vatAmount;
    const finalPayable = Math.round(exactTotalWithVat);
    const roundingAmount = finalPayable - exactTotalWithVat;

    const invoice = new Invoice();
    invoice.invoiceNo = invoiceNo;
    invoice.companyId = loggedInCompanyId;
    invoice.clientId = Number(clientId);
    invoice.dueDate = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    invoice.note = note;
    invoice.subtotalAmount = Number(subtotalAmount.toFixed(2));
    invoice.vatAmount = Number(vatAmount.toFixed(2));
    invoice.totalWithVat = Number(exactTotalWithVat.toFixed(2));
    invoice.roundingAmount = Number(roundingAmount.toFixed(2));
    invoice.finalPayable = finalPayable;
    invoice.items = invoiceItems;

    return this.invoiceRepository.save(invoice);
  }

  async findAllForCompany(companyId: number): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { companyId },
      relations: { items: true, client: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: { items: true, client: true, company: true },
    });

    if (!invoice) throw new NotFoundException('Фактурата не е пронајдена');
    return invoice;
  }

  async getInvoiceForPdf(id: number, companyId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, company: { id: companyId } },
      relations: { items: true, client: true, company: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Фактурата со ID ${id} не е пронајдена.`);
    }

    return invoice;
  }

  async update(
    id: number,
    updateInvoiceDto: UpdateInvoiceDto,
    loggedInCompanyId: number,
  ): Promise<Invoice> {
    const { items, invoiceNo, clientId, dueDate, note } = updateInvoiceDto;

    // 1. Најди ја постоечката фактура и осигури се дека ѝ припаѓа на логираната компанија
    const invoice = await this.invoiceRepository.findOne({
      where: { id, companyId: loggedInCompanyId },
      relations: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Фактурата со ID ${id} не е пронајдена.`);
    }

    // 2. Ажурирај ги основните полиња доколку се пратени од фронтендот
    if (invoiceNo) invoice.invoiceNo = invoiceNo;
    if (note !== undefined) invoice.note = note; // овозможува и бришење на ноте (празен стринг)
    if (dueDate)
      invoice.dueDate =
        typeof dueDate === 'string' ? new Date(dueDate) : dueDate;

    if (clientId) {
      const clientExists = await this.clientRepository.findOne({
        where: { id: Number(clientId) },
      });
      if (!clientExists) {
        throw new NotFoundException(
          `Клиентот со ID ${clientId} не е пронајден.`,
        );
      }
      invoice.clientId = Number(clientId);
    }

    if (items && Array.isArray(items)) {
      await this.itemRepository.delete({ invoice: { id } });

      let subtotalAmount = 0;
      let vatAmount = 0;

      const invoiceItems: InvoiceItem[] = items.map((item) => {
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        const discountPercent = Number(item.discountPercent ?? 0);
        const vatRate = Number(item.vatRate ?? 18);
        const description = item.description || '';

        const priceAfterDiscount = price * (1 - discountPercent / 100);
        const itemSubtotal = priceAfterDiscount * quantity;
        const itemVat = itemSubtotal * (vatRate / 100);

        subtotalAmount += itemSubtotal;
        vatAmount += itemVat;

        const invoiceItem = new InvoiceItem();
        invoiceItem.description = description;
        invoiceItem.quantity = quantity;
        invoiceItem.unitOfMeasure = item.unitOfMeasure || 'ПАР';
        invoiceItem.price = price;
        invoiceItem.discountPercent = discountPercent;
        invoiceItem.vatRate = vatRate;

        console.log(invoiceItem, 'fsfds');

        return invoiceItem;
      });

      const exactTotalWithVat = subtotalAmount + vatAmount;
      const finalPayable = Math.round(exactTotalWithVat);
      const roundingAmount = finalPayable - exactTotalWithVat;

      invoice.subtotalAmount = Number(subtotalAmount.toFixed(2));
      invoice.vatAmount = Number(vatAmount.toFixed(2));
      invoice.totalWithVat = Number(exactTotalWithVat.toFixed(2));
      invoice.roundingAmount = Number(roundingAmount.toFixed(2));
      invoice.finalPayable = finalPayable;
      invoice.items = invoiceItems;
    }

    return this.invoiceRepository.save(invoice);
  }

  async updateStatus(id: number, nextStatus: InvoiceStatus): Promise<Invoice> {
    // 1. Најди ја фактурата во базата
    const invoice = await this.invoiceRepository.findOne({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Фактурата со ID ${id} не е пронајдена.`);
    }

    if (invoice.status === InvoiceStatus.CANCELED) {
      throw new BadRequestException(
        'Фактурата е веќе сторнирана. Не се дозволени понатамошни измени на статусот.',
      );
    }

    invoice.status = nextStatus;

    // Опционално: Овде во иднина можеш да додадеш логика, на пример:
    // if (nextStatus === InvoiceStatus.PAID) { ... генерирај сметководствен налог за уплата ... }

    return await this.invoiceRepository.save(invoice);
  }

  async sendInvoiceToEmail(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    // 1. Извлекување на фактурата со leftJoin за клиент и компанија
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .leftJoinAndSelect('invoice.company', 'company')
      .addSelect('company.smtpPass') // Го вклучуваме заштитеното поле со лозинка/клучеви
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.id = :id', { id })
      .getOne();

    if (!invoice)
      throw new NotFoundException(`Фактурата со ID ${id} не постои.`);
    if (!invoice.client || !invoice.client.email)
      throw new BadRequestException('Клиентот нема дефинирано е-маил.');

    const company = invoice.company;

    if (!company.smtpHost || !company.smtpUser || !company.smtpPass) {
      throw new BadRequestException(
        `Фирмата "${company.name}" нема комплетно конфигурирано е-маил поставки во профилот.`,
      );
    }

    // 2. ПРВО го генерираме PDF-от во меморија за да биде спремен за двата улови
    const formattedTemplateData = this.mapInvoiceToTemplateData(invoice);
    const pdfBuffer = await this.pdfService.generateInvoicePdf(
      formattedTemplateData,
    );
    const pdfBase64 = pdfBuffer.toString('base64');

    const hostLower = company.smtpHost.toLowerCase();

    // -------------------------------------------------------------------------
    // УСЛОВ 1: ПРАЌАЊЕ ПРЕКУ MAILJET REST API (Ако хостот содржи mailjet)
    // -------------------------------------------------------------------------
    if (hostLower.includes('mailjet')) {
      try {
        const [apiKey, secretKey] = company.smtpPass.split(':');
        if (!apiKey || !secretKey) {
          throw new Error(
            'Невалиден формат на клучеви. Потребно е API_KEY:SECRET_KEY',
          );
        }

        const authString = Buffer.from(`${apiKey}:${secretKey}`).toString(
          'base64',
        );

        const response = await fetch('https://api.mailjet.com/v3.1/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authString}`,
          },
          body: JSON.stringify({
            Messages: [
              {
                From: {
                  Email: company.smtpUser,
                  Name: company.name,
                },
                To: [
                  {
                    Email: invoice.client.email,
                    Name: invoice.client.name || 'Клиент',
                  },
                ],
                Subject: `Нова фактура бр. ${invoice.invoiceNo} од ${company.name}`,
                HTMLPart: `
                  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
                    <h2>Почитувани,</h2>
                    <p>Во прилог на овој е-маил Ви ја доставуваме официјалната фактура со број <strong>${invoice.invoiceNo}</strong>.</p>
                    <p>Вкупен износ за уплата: <strong>${invoice.finalPayable} ден.</strong></p>
                    <br />
                    <p>Со почит,<br /><strong>${company.name}</strong></p>
                  </div>
                `,
                Attachments: [
                  {
                    ContentType: 'application/pdf',
                    Filename: `Faktura-${invoice.invoiceNo}.pdf`,
                    Base64Content: pdfBase64,
                  },
                ],
              },
            ],
          }),
        });

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          const errText =
            contentType && contentType.includes('application/json')
              ? JSON.stringify(await response.json())
              : await response.text();
          throw new Error(`Mailjet одбивање (${response.status}): ${errText}`);
        }

        // Ажурирање на датумот при успешност
        invoice.sentAtDate = new Date();
        await this.invoiceRepository.save(invoice);

        return {
          success: true,
          message: 'Фактурата е успешно испратена преку Mailjet REST API.',
        };
      } catch (error) {
        const err = error as Error;
        console.error('Mailjet API Грешка:', err.message);
        throw new BadRequestException(
          `Грешка при испраќање преку Mailjet: ${err.message}`,
        );
      }
    }

    // -------------------------------------------------------------------------
    // УСЛОВ 2: КЛАСИЧЕН SMTP ТРАНСПОРТ (За сите останати провајдери - Yahoo, Gmail, итн.)
    // -------------------------------------------------------------------------
    else {
      const isSecurePort = company.smtpPort === 465;

      const transportOptions: SMTPTransport.Options = {
        host: company.smtpHost,
        port: company.smtpPort,
        secure: isSecurePort,
        auth: {
          user: company.smtpUser,
          pass: company.smtpPass, // Овде се очекува класична или апликациска лозинка
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false, // Го спречува паѓањето на Render поради SSL
        },
      };

      const dynamicTransporter = nodemailer.createTransport(transportOptions);

      try {
        await dynamicTransporter.sendMail({
          from: `"${company.name}" <${company.smtpUser}>`,
          to: invoice.client.email,
          subject: `Нова фактура бр. ${invoice.invoiceNo} од ${company.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
              <h2>Почитувани,</h2>
              <p>Во прилог на овој е-маил Ви ја доставуваме официјалната фактура со број <strong>${invoice.invoiceNo}</strong>.</p>
              <p>Вкупен износ за уплата: <strong>${invoice.finalPayable} ден.</strong></p>
              <br />
              <p>Со почит,<br /><strong>${company.name}</strong></p>
            </div>
          `,
          attachments: [
            {
              filename: `Faktura-${invoice.invoiceNo}.pdf`,
              content: pdfBuffer, // Nodemailer прифаќа директно сиров Buffer
              contentType: 'application/pdf',
            },
          ],
        });

        // Ажурирање на датумот при успешност
        invoice.sentAtDate = new Date();
        await this.invoiceRepository.save(invoice);

        return {
          success: true,
          message: 'Фактурата е успешно испратена преку класичен SMTP.',
        };
      } catch (error) {
        const err = error as Error;
        console.error('Класична SMTP Грешка:', err.message);
        throw new BadRequestException(
          `Грешка при SMTP конекцијата: ${err.message}`,
        );
      }
    }
  }

  public mapInvoiceToTemplateData(dbInvoice: any): any {
    return {
      invoiceNumber: dbInvoice.invoiceNo,
      companyName: dbInvoice.company?.name || 'Моја Компанија',
      companyEdb: dbInvoice.company?.edb || '',
      companyAddress: dbInvoice.company?.address || '',
      companyPhone: dbInvoice.company?.phone || '',
      companyEmail: dbInvoice.company?.email || '',
      companyBank: dbInvoice.company?.bankName || '',
      companyBankAccount: dbInvoice.company?.giroAccount || '',
      clientName: dbInvoice.client?.name || 'Непознат Клиент',
      clientEdb: dbInvoice.client?.edb || '',
      clientAddress: dbInvoice.client?.address || '',
      date: new Date(dbInvoice.created_at).toLocaleDateString('mk-MK'),
      dueDate: dbInvoice.dueDate
        ? new Date(dbInvoice.dueDate).toLocaleDateString('mk-MK')
        : '',

      items: (dbInvoice.items || []).map((item: any, index: number) => {
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        const discountPercent = Number(item.discountPercent ?? 0);
        const vatRate = Number(item.vatRate ?? 18);

        const priceAfterDiscount = price * (1 - discountPercent / 100);
        const itemSubtotal = priceAfterDiscount * quantity;

        return {
          rbr: index + 1,
          description: item.description || '',
          unitOfMeasure: item.unitOfMeasure || 'ПАР',
          quantity: quantity,
          price: price.toFixed(2),
          discountPercent: discountPercent > 0 ? `${discountPercent}%` : '/',
          priceWithDiscount: priceAfterDiscount.toFixed(2),
          itemSubtotal: itemSubtotal.toFixed(2),
          vatRate: `${vatRate}%`,
        };
      }),

      subtotalAmount: Number(dbInvoice.subtotalAmount || 0).toFixed(2),
      vatAmount: Number(dbInvoice.vatAmount || 0).toFixed(2),
      totalWithVat: Number(dbInvoice.totalWithVat || 0).toFixed(2),
      roundingAmount: Number(dbInvoice.roundingAmount || 0).toFixed(2),
      finalPayable: Number(dbInvoice.finalPayable || 0),
      note: dbInvoice.note,
    };
  }
}
