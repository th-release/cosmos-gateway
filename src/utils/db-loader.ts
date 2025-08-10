import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const databaseLoader = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_SCHEMA,
  entities: ['src/entites/**/*.entity{.ts,.js}'],
  logging: process.env.DATABASE_LOGGING.toLowerCase() === "true" ? true : false,
  synchronize: process.env.DATABASE_SYNCHRONIZE.toLowerCase() === "true" ? true : false,
})