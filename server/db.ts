import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config({ quiet: true });
const connectionString = process.env.DATABASE_URL;
if (connectionString && !["postgres:", "postgresql:"].includes(new URL(connectionString).protocol)) {
  throw new Error("DATABASE_URL must use PostgreSQL");
}
if (!connectionString) console.warn("DATABASE_URL is not set. Database operations will fail.");

export const connection = connectionString ? new pg.Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
}) : null;
connection?.on("error", () => console.error("PostgreSQL idle connection error"));
export const db = connection ? drizzle(connection, { schema }) : null;

// Provision missing account tables without rewriting existing records.
export async function initializeSchema(): Promise<void> {
  if (!connection) return;
  const client = await connection.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      avatar TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS progress (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id),
      completed_tutorials JSONB NOT NULL,
      last_visited INTEGER,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
