import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1782120237919 implements MigrationInterface {
  name = 'Migration1782120237919';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "converted_from_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "UQ_7cbbccb1a7457c3a5f1e732460f" UNIQUE ("converted_from_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "converted_to_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "UQ_a3e161caced8ae957d78284086c" UNIQUE ("converted_to_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_7cbbccb1a7457c3a5f1e732460f" FOREIGN KEY ("converted_from_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_a3e161caced8ae957d78284086c" FOREIGN KEY ("converted_to_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_a3e161caced8ae957d78284086c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_7cbbccb1a7457c3a5f1e732460f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "UQ_a3e161caced8ae957d78284086c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "converted_to_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "UQ_7cbbccb1a7457c3a5f1e732460f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "converted_from_id"`,
    );
  }
}
