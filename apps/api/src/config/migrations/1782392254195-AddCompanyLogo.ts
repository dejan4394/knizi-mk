import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyLogo1782392254195 implements MigrationInterface {
    name = 'AddCompanyLogo1782392254195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "companies" ADD "logoUrl" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "logoUrl"`);
    }

}
