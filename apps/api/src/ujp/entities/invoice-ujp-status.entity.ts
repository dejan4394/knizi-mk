import { Entity, Column, OneToOne, JoinColumn, Unique } from 'typeorm';
import { Base } from '../../invoices/entities/base.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { UjpSubmissionStatus } from '../enums/ujp-submission-status.enum';

/**
 * Фискален статус на една фактура спрема УЈП е-Фактура.
 *
 * Служи и како OUTBOX запис: се создава во иста трансакција во која фактурата
 * се праќа, па дури потоа worker-от/reconciler-от ја обработува. Ова гарантира
 * дека ниедно поднесување не се губи ако процесот падне.
 */
@Entity('invoice_ujp_status')
@Unique(['invoiceId'])
export class InvoiceUjpStatus extends Base {
  @Column()
  invoiceId!: number;

  @OneToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: Invoice;

  @Column()
  companyId!: number;

  @Column({
    type: 'enum',
    enum: UjpSubmissionStatus,
    default: UjpSubmissionStatus.DRAFT,
  })
  status!: UjpSubmissionStatus;

  /** Стабилен клуч за идемпотентност — спречува дупли фискални документи при повтори. */
  @Column({ unique: true })
  idempotencyKey!: string;

  /** ID на документот доделен од УЈП по одобрување. */
  @Column({ type: 'varchar', nullable: true })
  ujpDocumentId?: string | null;

  /** Референца/тикет за проверка на статусот кај асинхроно поднесување. */
  @Column({ type: 'varchar', nullable: true })
  ujpReference?: string | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string | null;

  /** Причина за одбивање вратена од УЈП (се прикажува на корисникот). */
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  /** Сиров одговор од УЈП за ревизија. Чувствителен/обемен — не се вчитува по default. */
  @Column({ type: 'jsonb', nullable: true, select: false })
  rawResponse?: unknown;

  /** Референца до потпишаниот документ кај провајдерот за потпис. */
  @Column({ type: 'varchar', nullable: true })
  signedDocumentRef?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt?: Date | null;
}
