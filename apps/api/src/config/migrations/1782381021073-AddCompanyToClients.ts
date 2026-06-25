import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyToClients1782381021073 implements MigrationInterface {
  name = 'AddCompanyToClients1782381021073';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Привремено ја додаваме колоната без NOT NULL за да не пукне базата
    await queryRunner.query(`ALTER TABLE "clients" ADD "companyId" integer`);

    // 2. Сите постоечки записи ги ажурираме да припаѓаат на компанија со ID = 2
    await queryRunner.query(
      `UPDATE "clients" SET "companyId" = 2 WHERE "companyId" IS NULL`,
    );

    // 3. Сега кога нема NULL вредности, безбедно ја затвораме колоната да биде задолжителна (NOT NULL)
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "companyId" SET NOT NULL`,
    );

    // 4. Го тргаме стариот уникатен индекс каде што само ЕДБ беше уникатно
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "UQ_ede1a676b44e2244e10457beb6c"`,
    );

    // 5. Го додаваме новиот заеднички уникатен индекс (edb + companyId)
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "UQ_26ae3218badcfaa3b5e45340c9c" UNIQUE ("edb", "companyId")`,
    );

    // 6. Ја врзуваме релацијата (Foreign Key) со табелата companies
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_5016a1ccedbea5f26d46376d6b2" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "FK_5016a1ccedbea5f26d46376d6b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "UQ_26ae3218badcfaa3b5e45340c9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "UQ_ede1a676b44e2244e10457beb6c" UNIQUE ("edb")`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "companyId"`);
  }
}
