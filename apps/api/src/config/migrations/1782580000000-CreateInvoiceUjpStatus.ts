import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvoiceUjpStatus1782580000000 implements MigrationInterface {
  name = 'CreateInvoiceUjpStatus1782580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invoice_ujp_status_status_enum" AS ENUM('DRAFT', 'QUEUED', 'SIGNING', 'SUBMITTING', 'AWAITING', 'APPROVED', 'REJECTED', 'ERROR', 'CANCELED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoice_ujp_status" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "invoiceId" integer NOT NULL,
        "companyId" integer NOT NULL,
        "status" "public"."invoice_ujp_status_status_enum" NOT NULL DEFAULT 'DRAFT',
        "idempotencyKey" character varying NOT NULL,
        "ujpDocumentId" character varying,
        "ujpReference" character varying,
        "attempts" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "rejectionReason" text,
        "rawResponse" jsonb,
        "signedDocumentRef" character varying,
        "submittedAt" TIMESTAMP WITH TIME ZONE,
        "confirmedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_invoice_ujp_status_invoiceId" UNIQUE ("invoiceId"),
        CONSTRAINT "UQ_invoice_ujp_status_idempotencyKey" UNIQUE ("idempotencyKey"),
        CONSTRAINT "PK_invoice_ujp_status_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_ujp_status" ADD CONSTRAINT "FK_invoice_ujp_status_invoiceId" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice_ujp_status" DROP CONSTRAINT "FK_invoice_ujp_status_invoiceId"`,
    );
    await queryRunner.query(`DROP TABLE "invoice_ujp_status"`);
    await queryRunner.query(
      `DROP TYPE "public"."invoice_ujp_status_status_enum"`,
    );
  }
}
