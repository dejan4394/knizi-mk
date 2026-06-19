import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProformaSupport1781862318618 implements MigrationInterface {
  name = 'AddProformaSupport1781862318618';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "document_type" "public"."invoices_document_type_enum" NOT NULL DEFAULT 'INVOICE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "document_type"`,
    );
  }
}
