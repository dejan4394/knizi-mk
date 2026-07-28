import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEuidFieldsToUjpStatus1782590000000 implements MigrationInterface {
  name = 'AddEuidFieldsToUjpStatus1782590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice_ujp_status" ADD "qrLink" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_ujp_status" ADD "ujpStatusCode" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invoice_ujp_status" DROP COLUMN "ujpStatusCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_ujp_status" DROP COLUMN "qrLink"`,
    );
  }
}
