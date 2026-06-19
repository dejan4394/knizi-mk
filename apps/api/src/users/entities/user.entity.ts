import { Base } from '../../invoices/entities/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserRole } from '../enums/user.enum';
import { Company } from '../../companies/entities/company.entity';

@Entity('users')
export class User extends Base {
  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string; // Хаширана лозинка

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE, // Под корисниците стандардно се вработени
  })
  role!: UserRole;

  @Column()
  companyId!: number;

  @ManyToOne(() => Company, (company) => company.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;
}
