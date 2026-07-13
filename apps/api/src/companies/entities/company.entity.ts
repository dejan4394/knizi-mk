import { Entity, Column, OneToMany } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Base } from '../../invoices/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Client } from '../../clients/entities/client.entity';
import { SubscriptionPlan } from '../../billing/enums/plan.enum';

@Entity('companies')
export class Company extends Base {
  @Column()
  name!: string;

  @Column({ unique: true })
  edb!: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  giroAccount?: string;

  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  logoUrl?: string;

  @Column({ nullable: true })
  smtpHost?: string;

  @Column({ type: 'int', nullable: true, default: 465 })
  smtpPort?: number;

  @Column({ nullable: true })
  smtpUser?: string;

  @Column({ nullable: true, select: false })
  smtpPass?: string;

  @Column({ nullable: true })
  kibsProfileId?: string;

  @Column({ nullable: true })
  companyOneId?: string;

  // --- Претплата / Billing ---
  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan!: SubscriptionPlan;

  // Кога е активиран тековниот план.
  @Column({ type: 'timestamptz', nullable: true })
  planStartedAt?: Date | null;

  // Кога истекува платениот циклус (само за PRO). null = без истек (FREE).
  @Column({ type: 'timestamptz', nullable: true })
  planExpiresAt?: Date | null;

  // --- Токен за автоматска наплата (Stopanska banka) ---
  // Токен добиен по успешна иницијална токенизација на картичката. Со него
  // cron-от прави автоматски месечни наплати. Чувствителен - `select: false`,
  // се вчитува само експлицитно кога навистина ни треба.
  @Column({ type: 'varchar', nullable: true, select: false })
  paymentToken?: string | null;

  // Бренд на зачуваната картичка (VISA/MASTERCARD/...) за приказ.
  @Column({ type: 'varchar', nullable: true })
  paymentCardBrand?: string | null;

  // Последни 4 цифри од картичката за приказ (пр. **** 4242).
  @Column({ type: 'varchar', nullable: true })
  paymentCardLast4?: string | null;

  @OneToMany(() => Invoice, (invoice: Invoice) => invoice.company)
  invoices!: Invoice[];

  @OneToMany(() => User, (user: User) => user.company)
  users!: User[];

  @OneToMany(() => Client, (client: Client) => client.company)
  clients!: Client[];
}
