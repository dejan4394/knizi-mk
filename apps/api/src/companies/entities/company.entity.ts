import { Entity, Column, OneToMany } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Base } from '../../invoices/entities/base.entity';
import { User } from '../../users/entities/user.entity';

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

  // --- НОВИ КОЛОНИ ТУКА ---
  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  smtpHost?: string;

  @Column({ type: 'int', nullable: true, default: 465 })
  smtpPort?: number;

  @Column({ nullable: true })
  smtpUser?: string;

  @Column({ nullable: true, select: false }) // select: false за безбедност, да не ја влече лозинката во обични кверија
  smtpPass?: string;

  @OneToMany(() => Invoice, (invoice) => invoice.company)
  invoices!: Invoice[];

  @OneToMany(() => User, (user) => user.company)
  users!: User[];
}
