import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';
import { Base } from './base.entity';
import { Client } from '../../clients/entities/client.entity';
import { Company } from '../../companies/entities/company.entity';

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  OVERDUE = 'OVERDUE', // Новиот статус
  PAID = 'PAID',
  CANCELED = 'CANCELED',
}

@Entity('invoices')
export class Invoice extends Base {
  // Наследи го Base
  @Column()
  invoiceNo!: string;

  // 1. Поврзување со компанијата што ја издава фактурата
  @Column()
  companyId!: number; // Твојот ID е number од Base

  @ManyToOne(() => Company, (company) => company.invoices, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  // 2. Поврзување со клиентот кој ја купува фактурата
  @Column()
  clientId!: number; // Твојот ID е number од Base

  @ManyToOne(() => Client, (client) => client.invoices, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'clientId' })
  client!: Client;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.UNPAID })
  status!: InvoiceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotalAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  vatAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWithVat!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  roundingAmount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  finalPayable!: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'sent_at_date' })
  sentAtDate?: Date | null;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items!: InvoiceItem[];
}
