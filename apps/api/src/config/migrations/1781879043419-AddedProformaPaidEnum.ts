import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedProformaPaidEnum1781879043419 implements MigrationInterface {
  name = 'AddedProformaPaidEnum1781879043419';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."invoices_status_enum" ADD VALUE 'PROFORMA_PAID'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_status_enum_old" AS ENUM('UNPAID', 'OVERDUE', 'PAID', 'CANCELED', 'PROFORMA_PENDING', 'CONVERTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "public"."invoices_status_enum_old" USING "status"::"text"::"public"."invoices_status_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."invoices_status_enum_old" RENAME TO "invoices_status_enum"`,
    );
  }
}
