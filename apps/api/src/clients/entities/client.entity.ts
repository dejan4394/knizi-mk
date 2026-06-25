import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Base } from '../../invoices/entities/base.entity';
import { Company } from '../../companies/entities/company.entity'; // Увези ја Company класата

@Entity('clients')
@Unique(['edb', 'companyId']) // Гарантира дека ЕДБ-то е уникатно САМО во рамките на ТАА компанија
export class Client extends Base {
  @Column()
  name!: string;

  @Column() // Го тргаме unique: true од тука, бидејќи две различни компании може да имаат ист клиент
  edb!: string;

  @Column()
  address!: string;

  @Column({ nullable: true })
  accountNo?: string;

  @Column({ nullable: true })
  email?: string;

  // 1. Колона за Foreign Key
  @Column()
  companyId!: number;

  // 2. Многу клиенти припаѓаат на ЕДНА компанија
  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @OneToMany(() => Invoice, (invoice) => invoice.client)
  invoices!: Invoice[];
}
