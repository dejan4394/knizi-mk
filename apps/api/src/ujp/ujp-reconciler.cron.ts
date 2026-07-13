import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UjpSubmissionService } from './services/ujp-submission.service';

/**
 * Безбедносна мрежа за поднесувањата кон УЈП.
 *
 * Ги наоѓа записите заглавени во QUEUED/SIGNING/SUBMITTING (пр. процесот паднал
 * среде обработка) и оние во AWAITING (треба нов poll), па ги обработува пак.
 * Ова е причината зошто outbox записот, а не queue-от, е извор на вистината —
 * дури и Redis/queue да падне, ништо не се губи.
 *
 * Кога ќе се воведе вистински queue (pg-boss/BullMQ), овој cron останува како
 * reconciler за „изгубени" jobs — не се брише.
 */
@Injectable()
export class UjpReconcilerCron {
  private readonly logger = new Logger(UjpReconcilerCron.name);
  /** Спречува преклопување ако претходното извршување сè уште трае. */
  private running = false;

  constructor(private readonly submissionService: UjpSubmissionService) {}

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Europe/Skopje' })
  async reconcile(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.submissionService.findProcessable(25);
      if (rows.length === 0) return;

      this.logger.log(`Reconciler: обработувам ${rows.length} УЈП записи.`);
      for (const row of rows) {
        try {
          await this.submissionService.process(row.id);
        } catch (err) {
          this.logger.error(`Reconciler грешка за запис ${row.id}: ${err}`);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
