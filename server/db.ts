import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail.");
}

export const connection = connectionString ? mysql.createPool(connectionString) : null;
export const db = connection ? drizzle(connection, { schema, mode: "default" }) : null;
