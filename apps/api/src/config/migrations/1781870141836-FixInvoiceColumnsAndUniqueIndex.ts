import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixInvoiceColumnsAndUniqueIndex1781870141836 implements MigrationInterface {
  name = 'FixInvoiceColumnsAndUniqueIndex1781870141836';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "document_type"`,
    );
    await queryRunner.query(`DROP TYPE "public"."invoices_document_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "year" integer NOT NULL DEFAULT '2026'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_documenttype_enum" AS ENUM('INVOICE', 'PROFORMA')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "documentType" "public"."invoices_documenttype_enum" NOT NULL DEFAULT 'INVOICE'`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "invoiceNo"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "invoiceNo" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "UQ_428a40bfeb766be067175bf4583" UNIQUE ("companyId", "invoiceNo", "year", "documentType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "UQ_428a40bfeb766be067175bf4583"`,
    );
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "invoiceNo"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "invoiceNo" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP COLUMN "documentType"`,
    );
    await queryRunner.query(`DROP TYPE "public"."invoices_documenttype_enum"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN "year"`);
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_document_type_enum" AS ENUM('INVOICE', 'PROFORMA')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD "document_type" "public"."invoices_document_type_enum" NOT NULL DEFAULT 'INVOICE'`,
    );
  }
}
