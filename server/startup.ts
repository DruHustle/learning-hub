import type pg from "pg";

export type DatabaseStartupMode = "initialize" | "verify";

export function databaseStartupMode(value = process.env.DATABASE_STARTUP_MODE): DatabaseStartupMode {
  if (value === undefined) return "initialize";
  if (value === "initialize" || value === "verify") return value;
  throw new Error("DATABASE_STARTUP_MODE must be initialize or verify");
}

/** Qualify an existing primary without DDL, seeding or password rewrites. */
export async function verifyAccountSchema(pool: Pick<pg.Pool, "connect">): Promise<void> {
  const client = await pool.connect();
  try {
    // PostgreSQL enforces this property for every query in the transaction.
    await client.query("BEGIN READ ONLY");
    await client.query("SELECT id, email, password, name, role, avatar, created_at FROM learning_hub.users LIMIT 0");
    await client.query("SELECT id, user_id, completed_tutorials, last_visited, updated_at FROM learning_hub.progress LIMIT 0");
    const result = await client.query<{ pending_password_upgrade: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM learning_hub.users WHERE password NOT LIKE 'scrypt:%') AS pending_password_upgrade"
    );
    if (result.rows[0]?.pending_password_upgrade !== false) {
      throw new Error("Existing accounts require an explicit legacy-password migration before verify-only startup");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
