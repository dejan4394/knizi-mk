import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Invoice,
  DocumentType,
  InvoiceStatus,
} from '../invoices/entities/invoice.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async getStats(companyId: number) {
    // Сменето во number за да одговара на новата шема
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // 0. Името на компанијата
    const companyResult = await this.invoiceRepository.manager
      .createQueryBuilder()
      .select('company.name', 'name')
      .from('companies', 'company')
      .where('company.id = :companyId', { companyId })
      .getRawOne();

    const companyName = companyResult?.name || 'Моја Компанија';

    // 1. ПРОМЕТ И ДДВ ОВОЈ МЕСЕЦ (Само реални фактури, исклучуваме Профактури и Сторнирани)
    const monthTotalResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.finalPayable)', 'sum')
      .addSelect('SUM(invoice.vatAmount)', 'vatSum')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.documentType = :docType', {
        docType: DocumentType.INVOICE,
      })
      .andWhere('invoice.status != :canceledStatus', {
        canceledStatus: InvoiceStatus.CANCELED,
      })
      .andWhere('invoice.created_at BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();

    // 2. ВКУПНО НАПЛАТЕНИ СРЕДСТВА (Редовни платени фактури + Платени профактури)
    const totalPaidResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.finalPayable)', 'sum')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.PAID, InvoiceStatus.PROFORMA_PAID],
      })
      .getRawOne();

    // 3. ВКУПНО ПОБАРУВАЊА (Сè што чека наплата: UNPAID, OVERDUE и PROFORMA_PENDING)
    const totalReceivablesResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.finalPayable)', 'sum')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [
          InvoiceStatus.UNPAID,
          InvoiceStatus.OVERDUE,
          InvoiceStatus.PROFORMA_PENDING,
        ],
      })
      .getRawOne();

    // 4. КРИТИЧНИ ФАКТУРИ ШТО ДОЦНАТ (Само реални фактури кои се UNPAID/OVERDUE и поминал рокот)
    const rawCriticalInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.documentType = :docType', {
        docType: DocumentType.INVOICE,
      })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE],
      })
      .andWhere('invoice.dueDate < :now', { now })
      .orderBy('invoice.dueDate', 'ASC')
      .take(5)
      .getMany();

    // Парсирање на броевите
    const monthlyInvoiced = monthTotalResult?.sum
      ? parseFloat(monthTotalResult.sum)
      : 0;
    const estimatedVat = monthTotalResult?.vatSum
      ? parseFloat(monthTotalResult.vatSum)
      : 0;
    const totalPaid = totalPaidResult?.sum
      ? parseFloat(totalPaidResult.sum)
      : 0;
    const totalReceivables = totalReceivablesResult?.sum
      ? parseFloat(totalReceivablesResult.sum)
      : 0;

    const criticalInvoices = rawCriticalInvoices.map((inv) => {
      const createdDate = new Date(inv.created_at);
      const dueData = new Date(inv.dueDate);
      const diffTime = Math.abs(now.getTime() - dueData.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: inv.invoiceNo,
        client: inv.client?.name || 'Непознат Клиент',
        date: createdDate.toLocaleDateString('mk-MK'),
        dueDate: dueData.toLocaleDateString('mk-MK'),
        amount: parseFloat(inv.finalPayable.toString()),
        status: `Доцни ${diffDays} дена`,
      };
    });

    return {
      companyName,
      monthlyInvoiced,
      totalPaid,
      totalReceivables,
      estimatedVat,
      criticalInvoices,
    };
  }
}
