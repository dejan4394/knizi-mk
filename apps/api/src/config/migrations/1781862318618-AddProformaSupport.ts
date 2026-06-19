import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProformaSupport1781862318618 implements MigrationInterface {
  name = 'AddProformaSupport1781862318618';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoices_document_type_enum') THEN
          CREATE TYPE "public"."invoices_document_type_enum" AS ENUM('INVOICE', 'PROFORMA');
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "document_type" "public"."invoices_document_type_enum" NOT NULL DEFAULT 'INVOICE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "document_type"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."invoices_document_type_enum"`,
    );
  }
}
