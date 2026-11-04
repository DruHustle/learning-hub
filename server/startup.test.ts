import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import type pg from "pg";
import { databaseStartupMode, verifyAccountSchema } from "./startup";

function database(options: { legacyPassword?: boolean; missingProgress?: boolean } = {}) {
  let transactionReadOnly = false;
  let released = false;
  const statements: string[] = [];
  const client = {
    query: async (sql: string) => {
      statements.push(sql);
      if (sql === "BEGIN READ ONLY") { transactionReadOnly = true; return { rows: [] }; }
      if (sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
      assert(transactionReadOnly, "Schema probes must be inside a read-only transaction");
      assert.match(sql, /^SELECT\b/, "Existing-primary qualification must not issue a write");
      if (options.missingProgress && sql.includes("FROM learning_hub.progress")) throw new Error("missing progress relation");
      return { rows: sql.includes("pending_password_upgrade") ? [{ pending_password_upgrade: options.legacyPassword === true }] : [] };
    },
    release: () => { released = true; },
  };
  return { pool: { connect: async () => client } as unknown as Pick<pg.Pool, "connect">,
    statements, released: () => released };
}

test("verify-only mode accepts an existing account schema without changing records", async () => {
  const fixture = database();
  await verifyAccountSchema(fixture.pool);
  assert(fixture.released());
  assert.equal(fixture.statements[0], "BEGIN READ ONLY");
  assert.equal(fixture.statements.at(-1), "COMMIT");
  assert(fixture.statements.some(sql => sql.includes("learning_hub.users LIMIT 0")));
  assert(fixture.statements.some(sql => sql.includes("learning_hub.progress LIMIT 0")));
});

test("a missing schema fails rather than creating tables on the retained database", async () => {
  const fixture = database({ missingProgress: true });
  await assert.rejects(verifyAccountSchema(fixture.pool), /missing progress relation/);
  assert.equal(fixture.statements.at(-1), "ROLLBACK");
  assert(fixture.released());
});

test("legacy plaintext accounts block a compute cutover instead of being silently rewritten", async () => {
  const fixture = database({ legacyPassword: true });
  await assert.rejects(verifyAccountSchema(fixture.pool), /explicit legacy-password migration/);
  assert.equal(fixture.statements.at(-1), "ROLLBACK");
  assert(fixture.released());
});

test("explicit startup mode is strict so a typo cannot enable database writes", () => {
  assert.equal(databaseStartupMode("verify"), "verify");
  assert.equal(databaseStartupMode("initialize"), "initialize");
  for (const value of ["", "false", "verify-only", "VERIFY"])
    assert.throws(() => databaseStartupMode(value), /DATABASE_STARTUP_MODE/);
});

test("the API exits before listening when verify mode lacks a database", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "", DATABASE_STARTUP_MODE: "verify", PORT: "0", SERVE_FRONTEND: "false" },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Verify-only startup requires DATABASE_URL/);
  assert.doesNotMatch(result.stdout, /Server running/);
});
