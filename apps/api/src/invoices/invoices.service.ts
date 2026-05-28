import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Client } from '../clients/entities/client.entity'; // УВЕЗИ ГО ЕНТИТЕТОТ НА КЛИЕНТОТ
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly itemRepository: Repository<InvoiceItem>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>, // ИНЈЕКТИРАЈ ГО РЕПОЗИТОРИУМОТ ЗА КЛИЕНТИ
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

    // 3. Ажурирање на ставките и препресметка на сумите (само ако се пратени нови 'items')
    if (items && Array.isArray(items)) {
      // Бришење на старите ставки од базата за оваа фактура пред да ги внесеме новите (Clear & Insert)
      await this.itemRepository.delete({ invoice: { id } });

      let subtotalAmount = 0;
      let vatAmount = 0;

      console.log(items, 'Itemssss');

      // const invoiceItems: InvoiceItem[] = items.map((item) => {
      //   const quantity = Number(item.quantity);
      //   const price = Number(item.price);
      //   const discountPercent = Number(item.discountPercent ?? 0);
      //   const vatRate = Number(item.vatRate ?? 18);
      //   const description = item.description || '';

      //   const priceAfterDiscount = price * (1 - discountPercent / 100);
      //   const itemSubtotal = priceAfterDiscount * quantity;
      //   const itemVat = itemSubtotal * (vatRate / 100);

      //   subtotalAmount += itemSubtotal;
      //   vatAmount += itemVat;

      //   const invoiceItem = new InvoiceItem();
      //   invoiceItem.description = description;
      //   invoiceItem.quantity = quantity;
      //   invoiceItem.unitOfMeasure = item.unitOfMeasure || 'ПАР';
      //   invoiceItem.price = price;
      //   invoiceItem.discountPercent = discountPercent;
      //   invoiceItem.vatRate = vatRate;

      //   console.log(invoiceItem, 'fsfds');

      //   return invoiceItem;
      // });

      const invoiceItems: InvoiceItem[] = items.map((item) => {
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        const discountPercent = Number(item.discountPercent ?? 0);
        const vatRate = Number(item.vatRate ?? 18);
        const description = item.description || '';

        // 1. Точна математика за цената по ставка
        const priceAfterDiscount = price * (1 - discountPercent / 100);
        const itemSubtotal = priceAfterDiscount * quantity; // Основица за ДДВ за оваа ставка
        const itemVat = itemSubtotal * (vatRate / 100);

        subtotalAmount += itemSubtotal;
        vatAmount += itemVat;

        const invoiceItem = new InvoiceItem();
        invoiceItem.description = description;
        invoiceItem.quantity = quantity;
        invoiceItem.unitOfMeasure = item.unitOfMeasure || 'ПАР';
        invoiceItem.price = price; // Оригинална цена без попуст
        invoiceItem.discountPercent = discountPercent;
        invoiceItem.vatRate = vatRate;

        console.log(invoiceItem, 'fsfds');

        return invoiceItem;
      });

      const exactTotalWithVat = subtotalAmount + vatAmount;
      const finalPayable = Math.round(exactTotalWithVat);
      const roundingAmount = finalPayable - exactTotalWithVat;

      // Ги доделуваме новите пресметани вредности на ентитетот
      invoice.subtotalAmount = Number(subtotalAmount.toFixed(2));
      invoice.vatAmount = Number(vatAmount.toFixed(2));
      invoice.totalWithVat = Number(exactTotalWithVat.toFixed(2));
      invoice.roundingAmount = Number(roundingAmount.toFixed(2));
      invoice.finalPayable = finalPayable;
      invoice.items = invoiceItems;
    }

    // 4. Зачувување на ажурираната фактура со новите пресметки
    return this.invoiceRepository.save(invoice);
  }
}
