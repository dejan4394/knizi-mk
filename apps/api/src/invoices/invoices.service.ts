import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, Not } from 'typeorm';
import {
  DocumentType,
  Invoice,
  InvoiceStatus,
} from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import * as nodemailer from 'nodemailer';
import { PdfService } from 'src/pdf/pdf.service';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { KibsService } from 'src/kibs/kibs.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepository: Repository<InvoiceItem>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly pdfService: PdfService,
    private readonly dataSource: DataSource,
    private readonly kibsService: KibsService,
  ) {}

  async create(
    createInvoiceDto: CreateInvoiceDto,
    loggedInCompanyId: number,
  ): Promise<Invoice> {
    const { items, invoiceNo, clientId, dueDate, note } = createInvoiceDto;

    // Земи ја годината од внесениот датум или тековната година како дефолт
    const currentYear = dueDate
      ? new Date(dueDate).getFullYear()
      : new Date().getFullYear();
    const docType = createInvoiceDto.documentType || DocumentType.INVOICE;

    // Валидација: Проверка за дупликат број во таа година за фирмата
    const isDuplicate = await this.checkInvoiceNumberExists(
      loggedInCompanyId,
      Number(invoiceNo),
      currentYear,
      docType,
    );

    if (isDuplicate) {
      throw new BadRequestException(
        `Веќе постои документ од тип ${docType} со број ${invoiceNo} за ${currentYear} година.`,
      );
    }

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
    invoice.invoiceNo = Number(invoiceNo);
    invoice.year = currentYear;
    invoice.documentType = docType;

    if (docType === DocumentType.PROFORMA) {
      invoice.status = InvoiceStatus.PROFORMA_PENDING;
    } else {
      invoice.status = InvoiceStatus.UNPAID;
    }

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

    // Подготовка на вредности за проверка на уникатност при едит
    const checkNo = invoiceNo ? Number(invoiceNo) : invoice.invoiceNo;
    const checkYear = dueDate ? new Date(dueDate).getFullYear() : invoice.year;
    const checkType = updateInvoiceDto.documentType || invoice.documentType;

    // Проверка дали новиот број (или година) се веќе зафатени од друг документ
    const isDuplicate = await this.checkInvoiceNumberExists(
      loggedInCompanyId,
      checkNo,
      checkYear,
      checkType,
      id,
    );

    if (isDuplicate) {
      throw new BadRequestException(
        `Бројот ${checkNo} за ${checkYear} година е веќе зафатен од друг документ.`,
      );
    }

    // 2. Ажурирај ги основните полиња доколку се пратени од фронтендот
    if (invoiceNo) invoice.invoiceNo = Number(invoiceNo);
    if (note !== undefined) invoice.note = note;
    if (dueDate) {
      invoice.dueDate =
        typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
      invoice.year = new Date(dueDate).getFullYear();
    }
    if (updateInvoiceDto.documentType)
      invoice.documentType = updateInvoiceDto.documentType;

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
    return await this.invoiceRepository.save(invoice);
  }

  async sendInvoiceToEmail(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    const invoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .leftJoinAndSelect('invoice.company', 'company')
      .addSelect('company.smtpPass')
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

    const formattedTemplateData = this.mapInvoiceToTemplateData(invoice);
    const pdfBuffer = await this.pdfService.generateInvoicePdf(
      formattedTemplateData,
    );
    const pdfBase64 = pdfBuffer.toString('base64');

    const hostLower = company.smtpHost.toLowerCase();

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
    } else {
      const isSecurePort = company.smtpPort === 465;

      const transportOptions: SMTPTransport.Options = {
        host: company.smtpHost,
        port: company.smtpPort,
        secure: isSecurePort,
        auth: {
          user: company.smtpUser,
          pass: company.smtpPass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false,
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
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

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

  public mapInvoiceToTemplateData(dbInvoice: Invoice): any {
    return {
      documentType: dbInvoice.documentType,
      status: dbInvoice.status,
      invoiceNumber: dbInvoice.invoiceNo,
      year: dbInvoice.year,
      companyLogo: dbInvoice.company?.logoUrl || null,
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

      items: (dbInvoice.items || []).map((item: InvoiceItem, index: number) => {
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

  async convertProformaToInvoice(
    proformaId: number,
    companyId: number,
  ): Promise<Invoice> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Ја наоѓаме профактурата со нејзините ставки (items)
      const proforma = await manager.findOne(Invoice, {
        where: { id: proformaId, companyId },
        relations: { items: true },
      });

      if (!proforma) {
        throw new NotFoundException('Профактурата не е пронајдена.');
      }

      if (proforma.documentType === DocumentType.INVOICE) {
        throw new BadRequestException('Овој документ веќе е финална фактура.');
      }

      if (proforma.status === InvoiceStatus.CONVERTED) {
        throw new BadRequestException(
          'Профактурата веќе е конвертирана во фактура.',
        );
      }

      // Дозволи конверзија САМО ако профактурата е претходно означена како платена
      if (proforma.status !== InvoiceStatus.PROFORMA_PAID) {
        throw new BadRequestException(
          'Профактурата мора да биде во статус "Платена Профактура" за да може да се фактурира.',
        );
      }

      const currentYear = new Date().getFullYear();

      // 2. Го земаме следниот слободен број за ФИКАЛНА ФАКТУРА за таа фирма во оваа година
      const nextInvoiceNumber = await this.getNextInvoiceNumber(
        manager,
        companyId,
        currentYear,
        DocumentType.INVOICE,
      );

      // 3. Креираме СOСЕМ НОВ објект за Финалната Фактура
      const newInvoice = manager.create(Invoice, {
        companyId: proforma.companyId,
        clientId: proforma.clientId,
        documentType: DocumentType.INVOICE,
        invoiceNo: nextInvoiceNumber,
        year: currentYear,
        status: InvoiceStatus.PAID, // Бидејќи доаѓа од платена профактура, финалната е веднаш PAID
        dueDate: new Date(),

        // СВРЗУВАЊЕ ПРВ ДЕЛ: Новата фактура ја врзуваме со профактурата од која настана
        convertedFromId: proforma.id,
        convertedToId: null, // Ова е финална фактура, па нема каде понатаму да се конвертира

        // Префрлање на финансиските суми
        subtotalAmount: proforma.subtotalAmount,
        vatAmount: proforma.vatAmount,
        totalWithVat: proforma.totalWithVat,
        roundingAmount: proforma.roundingAmount,
        finalPayable: proforma.finalPayable,
        note: proforma.note,

        // Префрлање на ставките (items)
        items: proforma.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitOfMeasure: item.unitOfMeasure,
          price: item.price,
          discountPercent: item.discountPercent,
          vatRate: item.vatRate,
        })),
      });

      // Ја зачувуваме новата фактура во база за да го генерираме нејзиното ID
      const savedInvoice = await manager.save(Invoice, newInvoice);

      // 4. Ја ажурираме ОРИГИНАЛНАТА профактура
      proforma.status = InvoiceStatus.CONVERTED;

      // СВРЗУВАЊЕ ВТОР ДЕЛ: На профактурата ѝ кажуваме точно во кое ID на финална фактура отиде
      proforma.convertedToId = savedInvoice.id;

      // Ја зачувуваме променетата профактура
      await manager.save(Invoice, proforma);

      return savedInvoice;
    });
  }

  public async getNextInvoiceNumber(
    manager: EntityManager,
    companyId: number,
    currentYear: number,
    documentType: DocumentType, // Додаваме динамичен тип на документ
  ): Promise<number> {
    const lastInvoice = await manager.findOne(Invoice, {
      where: {
        companyId,
        documentType, // Го користиме типот што сме го пратиле (INVOICE или PROFORMA)
        year: currentYear,
      },
      order: { invoiceNo: 'DESC' },
    });

    if (!lastInvoice) {
      return 1;
    }

    return lastInvoice.invoiceNo + 1;
  }

  async checkInvoiceNumberExists(
    companyId: number,
    invoiceNumber: number,
    year: number,
    documentType: DocumentType,
    excludeInvoiceId?: number,
  ): Promise<boolean> {
    const query: any = {
      companyId,
      invoiceNo: invoiceNumber,
      year: year,
      documentType: documentType,
    };

    if (excludeInvoiceId) {
      query.id = Not(excludeInvoiceId);
    }

    const count = await this.invoiceRepository.count({ where: query });
    return count > 0;
  }

  async signInvoiceWithKibs(
    invoiceId: number,
    companyId: number,
  ): Promise<any> {
    // 1. Најди ја фактурата заедно со податоците за компанијата што ја издава
    const invoice: Invoice | null = await this.invoiceRepository.findOne({
      where: { id: invoiceId, company: { id: companyId } },
      relations: ['company'],
    });

    if (!invoice) {
      throw new NotFoundException(
        `Фактурата со ID ${invoiceId} не е пронајдена.`,
      );
    }

    // 2. Безбедносна проверка: Фактурата мора да биде UNPAID (или во состојба пред да биде потпишана)
    if (invoice.status !== InvoiceStatus.UNPAID) {
      throw new BadRequestException(
        'Може да се потпишуваат само неплатени (UNPAID) фактури.',
      );
    }

    const company = invoice.company;

    // 3. Проверка дали корисникот воопшто има внесен OneID во својот профил
    if (!company.companyOneId) {
      throw new BadRequestException(
        'Не можете да потпишете! Ве молиме прво внесете го вашиот OneID идентификатор во поставките на компанијата.',
      );
    }

    const invoiceDataForTemplate = this.mapInvoiceToTemplateData(invoice);

    const pdfBuffer = await this.pdfService.generateInvoicePdf(
      invoiceDataForTemplate,
    );

    // 5. Повикај го КИБС сервисот кој го подготвивме за да ја иницира трансакцијата
    const kibsResponse = await this.kibsService.initiateDocumentSigning(
      pdfBuffer,
      company.companyOneId,
      invoice.invoiceNo, // Твоето поле за број на фактура (на пр. 12/2026)
    );

    // 6. Овде во базата можеш да зачуваш некое привремено ID на трансакцијата ако КИБС го враќа (requestId)
    // invoice.kibsRequestId = kibsResponse.requestId;
    // await this.invoiceRepository.save(invoice);

    return {
      message:
        'Барањето за дигитален потпис е успешно испратено. Проверете ја OneID апликацијата на вашиот телефон.',
      kibsData: kibsResponse,
    };
  }
}
