import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingToCompany1782560000000 implements MigrationInterface {
  name = 'AddBillingToCompany1782560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."companies_plan_enum" AS ENUM('FREE', 'PRO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "plan" "public"."companies_plan_enum" NOT NULL DEFAULT 'FREE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "planStartedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" ADD "planExpiresAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "planExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "companies" DROP COLUMN "planStartedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "plan"`);
    await queryRunner.query(`DROP TYPE "public"."companies_plan_enum"`);
  }
}
