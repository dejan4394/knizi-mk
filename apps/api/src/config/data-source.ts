// src/config/data-source.ts
import { DataSource } from 'typeorm';

const isProduction = !!process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  // Ако имаме URL (продукција), ја користиме неа. На локално одиме со дефолтните вредности
  url: process.env.DATABASE_URL,
  host: isProduction ? undefined : 'localhost',
  port: isProduction ? undefined : 5432,
  username: isProduction ? undefined : 'postgres',
  password: isProduction ? undefined : 'ilinamalinova2018',
  database: isProduction ? undefined : 'knizi_db',

  // КЛУЧНО ЗА МИГРАЦИИ:
  synchronize: false, // На миграции ОБВРЗНО мора да е false за да не настане конфликт
  logging: !isProduction, // Логирај SQL команди само на локално

  // Патеки до ентитетите и каде ќе се зачувуваат миграциите
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  ssl: isProduction ? { rejectUnauthorized: false } : false,
});
