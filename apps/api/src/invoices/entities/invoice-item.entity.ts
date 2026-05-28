import { Entity, Column, ManyToOne } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Base } from './base.entity';

@Entity('invoice_items')
export class InvoiceItem extends Base {
  // Наследи го Base
  @Column()
  invoiceId!: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  invoice!: Invoice;

  @Column()
  description!: string;

  @Column({ type: 'float' })
  quantity!: number;

  @Column()
  unitOfMeasure!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'float', default: 0 })
  discountPercent!: number;

  @Column({ type: 'float', default: 18 })
  vatRate!: number;
}
