import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTokenToCompany1782570000000
  implements MigrationInterface
{
  name = 'AddPaymentTokenToCompany1782570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "paymentToken" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "paymentCardBrand" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "paymentCardLast4" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "paymentCardLast4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "paymentCardBrand"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "paymentToken"`,
    );
  }
}
