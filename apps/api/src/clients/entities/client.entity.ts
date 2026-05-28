import { Entity, Column, OneToMany } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity'; // Прилагоди ја патеката до твојот Invoice ентитет
import { Base } from '../../invoices/entities/base.entity';

@Entity('clients')
export class Client extends Base {
  @Column()
  name!: string;

  @Column({ unique: true })
  edb!: string;

  @Column()
  address!: string;

  @Column({ nullable: true })
  accountNo?: string; // Жиро сметка

  @Column({ nullable: true })
  email?: string;

  @OneToMany(() => Invoice, (invoice) => invoice.client)
  invoices!: Invoice[];
}
