import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKibsAndOneIdToCompany1782470060350 implements MigrationInterface {
  name = 'AddKibsAndOneIdToCompany1782470060350';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "kibsProfileId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "companyOneId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "companyOneId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "kibsProfileId"`,
    );
  }
}
