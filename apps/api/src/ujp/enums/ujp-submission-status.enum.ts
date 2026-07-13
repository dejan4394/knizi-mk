/**
 * Животен циклус на поднесувањето на фактура кон е-Фактура (УЈП).
 *
 * ВАЖНО: ова е ОДВОЕНА димензија од `InvoiceStatus` (UNPAID/PAID/...).
 * Една фактура има бизнис-статус (дали е платена) И фискален статус
 * (дали е прифатена од УЈП) — двете се независни и не смеат да се мешаат.
 */
export enum UjpSubmissionStatus {
  /** Уште не е поднесена. */
  DRAFT = 'DRAFT',
  /** Ставена во ред за обработка (outbox запис). */
  QUEUED = 'QUEUED',
  /** Се потпишува дигитално (KIBS/Nextsense). */
  SIGNING = 'SIGNING',
  /** Потпишана, се праќа до УЈП. */
  SUBMITTING = 'SUBMITTING',
  /** Пратена; чекаме асинхрона потврда од УЈП. */
  AWAITING_CONFIRMATION = 'AWAITING',
  /** Одобрена од УЈП — фактурата е фискализирана и заклучена. */
  APPROVED = 'APPROVED',
  /** Одбиена од УЈП (бизнис/валидациона причина). Не се повторува автоматски. */
  REJECTED = 'REJECTED',
  /** Техничка грешка (мрежа/5xx). Ќе се повтори од reconciler-от. */
  ERROR = 'ERROR',
  /** Сторнирана пред одобрување. */
  CANCELED = 'CANCELED',
}

/** Статуси од кои повеќе нема излез — не се обработуваат повторно. */
export const TERMINAL_UJP_STATUSES: ReadonlySet<UjpSubmissionStatus> = new Set([
  UjpSubmissionStatus.APPROVED,
  UjpSubmissionStatus.REJECTED,
  UjpSubmissionStatus.CANCELED,
]);

/** Максимален број обиди пред да ја оставиме фактурата во ERROR за рачна интервенција. */
export const MAX_UJP_ATTEMPTS = 5;
