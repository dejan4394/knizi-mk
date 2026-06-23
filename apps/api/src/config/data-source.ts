// src/config/data-source.ts
import { DataSource } from 'typeorm';

const isProduction = !!process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: isProduction ? undefined : 'localhost',
  port: isProduction ? undefined : 5432,
  username: isProduction ? undefined : 'postgres',
  password: isProduction ? undefined : 'ilinamalinova2018',
  database: isProduction ? undefined : 'knizi_db',

  synchronize: false,
  logging: !isProduction,

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  ssl: isProduction ? { rejectUnauthorized: false } : false,
});
