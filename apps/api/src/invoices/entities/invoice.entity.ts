import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';
import { Base } from './base.entity';
import { Client } from '../../clients/entities/client.entity';
import { Company } from '../../companies/entities/company.entity';

export enum DocumentType {
  INVOICE = 'INVOICE',
  PROFORMA = 'PROFORMA',
}

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
  CANCELED = 'CANCELED',
  PROFORMA_PENDING = 'PROFORMA_PENDING',
  PROFORMA_PAID = 'PROFORMA_PAID',
  CONVERTED = 'CONVERTED',
}

@Entity('invoices')
@Unique(['companyId', 'invoiceNo', 'year', 'documentType'])
export class Invoice extends Base {
  @Column()
  invoiceNo!: number;

  @Column({
    type: 'integer',
    nullable: false,
    default: new Date().getFullYear(),
  })
  year!: number;

  // НОВО: Тип на документ (Фактура или Профактура)
  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.INVOICE,
  })
  documentType!: DocumentType;

  @Column()
  companyId!: number;

  @ManyToOne(() => Company, (company) => company.invoices, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  clientId!: number;

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
