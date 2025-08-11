import 'reflect-metadata';
import { AbciEntity } from 'src/entities/abci.entity';
import { BlockEntity } from 'src/entities/block.entitiy';
import { ValidatorEntity } from 'src/entities/validator.entity';
import { TransactionEntity } from 'src/entities/transaction.entity';
import { DataSource } from 'typeorm';

export const databaseLoader = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_SCHEMA,
  entities: [BlockEntity, AbciEntity, TransactionEntity, ValidatorEntity],
  logging: process.env.DATABASE_LOGGING.toLowerCase() === "true" ? true : false,
  synchronize: process.env.DATABASE_SYNCHRONIZE.toLowerCase() === "true" ? true : false,
})