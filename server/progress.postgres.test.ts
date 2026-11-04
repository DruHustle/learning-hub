import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import pg from "pg";
import { signSession } from "./security";

// This is an explicit CI/local integration command, never a live-DB fallback.
const configured = process.env.TEST_DATABASE_URL;
assert.ok(
  configured,
  "TEST_DATABASE_URL is required for the isolated PostgreSQL test"
);
const databaseUrl = new URL(configured);
assert.ok(["postgres:", "postgresql:"].includes(databaseUrl.protocol));
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(databaseUrl.hostname),
  "PostgreSQL tests require a loopback host"
);
assert.equal(
  databaseUrl.pathname,
  "/learning_hub_progress_test",
  "Use the dedicated disposable test database"
);
assert.equal(
  databaseUrl.username,
  "learning_test",
  "Use the dedicated test role"
);
assert.equal(
  databaseUrl.search,
  "",
  "Connection overrides are not allowed in the test URL"
);
assert.equal(databaseUrl.hash, "");

const pool = new pg.Pool({
  connectionString: configured,
  max: 4,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});
const suffix = randomUUID();
const alice = `merge-alice-${suffix}`;
const bob = `merge-bob-${suffix}`;
const missing = `merge-missing-${suffix}`;
const owners = [alice, bob, missing];
const secret = "isolated-progress-test-session-secret";
const allowedOrigin = "http://localhost:3000";
const applicationName = `learning_progress_test_${process.pid}`;
let child: ChildProcess | undefined;
let base: string;
let serverOutput = "";

async function until(condition: () => Promise<boolean>, message: string) {
  const deadline = Date.now() + 5000;
  do {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  } while (Date.now() < deadline);
  assert.fail(message);
}

const cookie = (userId: string) =>
  `learning_session=${signSession(userId, secret)}`;
const post = (
  userId: string,
  body: unknown,
  headers: Record<string, string> = {}
) =>
  fetch(`${base}/api/progress/${userId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookie(userId),
      origin: allowedOrigin,
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
async function read(userId = alice): Promise<number[]> {
  const response = await fetch(`${base}/api/progress/${userId}`, {
    headers: { cookie: cookie(userId) },
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200);
  return (await response.json()).completedTutorials;
}

before(async () => {
  const socket = createServer();
  await new Promise<void>(resolve => socket.listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  base = `http://127.0.0.1:${port}`;
  const apiDatabaseUrl = new URL(databaseUrl);
  apiDatabaseUrl.searchParams.set("application_name", applicationName);
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: apiDatabaseUrl.toString(),
      DATABASE_STARTUP_MODE: "initialize",
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: allowedOrigin,
      PORT: String(port),
      SERVE_FRONTEND: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk: Buffer) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-4000);
  };
  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);
  await until(async () => {
    assert.equal(
      child?.exitCode,
      null,
      `Isolated API exited before readiness: ${serverOutput}`
    );
    try {
      return (
        await fetch(base + "/ready", { signal: AbortSignal.timeout(250) })
      ).ok;
    } catch {
      return false;
    }
  }, `Isolated API did not start: ${serverOutput}`);
  for (const id of owners) {
    await pool.query(
      "INSERT INTO learning_hub.users (id, email, password, name) VALUES ($1, $2, $3, $4)",
      [id, `${id}@example.test`, "scrypt:unused-test-fixture", id]
    );
  }
  await pool.query(
    "INSERT INTO learning_hub.progress (user_id, completed_tutorials) VALUES ($1, '[1]'), ($2, '[8]')",
    [alice, bob]
  );
});

beforeEach(async () => {
  await pool.query(
    "UPDATE learning_hub.progress SET completed_tutorials = CASE WHEN user_id = $1 THEN '[1]'::jsonb ELSE '[8]'::jsonb END, last_visited = NULL WHERE user_id = ANY($2::text[])",
    [alice, [alice, bob]]
  );
});

after(async () => {
  try {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit", {
        signal: AbortSignal.timeout(2000),
      }).then(
        () => true,
        () => false
      );
      child.kill("SIGTERM");
      if (
        !(await exited) &&
        child.exitCode === null &&
        child.signalCode === null
      ) {
        const killed = once(child, "exit", {
          signal: AbortSignal.timeout(2000),
        });
        child.kill("SIGKILL");
        await killed;
      }
    }
  } finally {
    try {
      // Delete only this run's fixtures, never a schema or an external database.
      await pool.query(
        "DELETE FROM learning_hub.progress WHERE user_id = ANY($1::text[])",
        [owners]
      );
      await pool.query(
        "DELETE FROM learning_hub.users WHERE id = ANY($1::text[])",
        [owners]
      );
    } finally {
      await pool.end();
    }
  }
});

test(
  "concurrent device merges retain both completions and a locked row's latest history",
  { timeout: 20000 },
  async () => {
    const blocker = await pool.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "UPDATE learning_hub.progress SET completed_tutorials = '[1,50]' WHERE user_id = $1",
      [alice]
    );
    // Both devices have the same stale baseline. Hold a third update open so we
    // prove overlap at the database row lock, rather than hope requests overlap.
    const requests = Promise.allSettled([
      post(alice, { completedTutorials: [1, 2, 2], merge: true }),
      post(alice, { completedTutorials: [1, 3], merge: true }),
    ]);
    let waitError: unknown;
    try {
      await until(async () => {
        const result = await pool.query(
          "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND application_name = $1 AND wait_event_type = 'Lock'",
          [applicationName]
        );
        return result.rows[0].waiting === 2;
      }, "Both API updates must contend on the held PostgreSQL row lock");
    } catch (error) {
      waitError = error;
    } finally {
      await blocker.query("COMMIT");
      blocker.release();
    }
    const settled = await requests;
    if (waitError) throw waitError;
    const replies = await Promise.all(
      settled.map(async result => {
        assert.equal(result.status, "fulfilled");
        assert.equal(result.value.status, 200, serverOutput);
        return result.value.json();
      })
    );
    for (const [index, reply] of replies.entries()) {
      assert.equal(reply.success, true);
      for (const id of [1, index + 2, 50])
        assert.ok(reply.progress.completedTutorials.includes(id));
      assert.equal(
        new Set(reply.progress.completedTutorials).size,
        reply.progress.completedTutorials.length
      );
    }
    assert.ok(
      replies.some(
        reply =>
          JSON.stringify(reply.progress.completedTutorials) === "[1,2,3,50]"
      )
    );
    assert.deepEqual(await read(), [1, 2, 3, 50]);
    // Repeating an already applied merge cannot remove or duplicate IDs.
    const repeated = await post(alice, {
      completedTutorials: [1, 2],
      merge: true,
    });
    assert.equal(repeated.status, 200);
    assert.deepEqual(
      (await repeated.json()).progress.completedTutorials,
      [1, 2, 3, 50]
    );
  }
);

test("legacy replacement and explicit clearing remain available", async () => {
  const replacement = await post(alice, {
    completedTutorials: [9],
    lastVisited: 42,
  });
  assert.equal(replacement.status, 200);
  assert.deepEqual(await replacement.json(), { success: true });
  assert.deepEqual(await read(), [9]);
  assert.equal(
    (await post(alice, { completedTutorials: [], merge: true })).status,
    200
  );
  assert.deepEqual(await read(), [9]);
  assert.equal(
    (
      await pool.query(
        "SELECT last_visited FROM learning_hub.progress WHERE user_id = $1",
        [alice]
      )
    ).rows[0].last_visited,
    42
  );
  assert.equal(
    (await post(alice, { completedTutorials: [], merge: false })).status,
    200
  );
  assert.deepEqual(await read(), []);
  assert.equal(
    (await post(alice, { completedTutorials: [7], merge: false })).status,
    200
  );
  assert.deepEqual(await read(), [7]);
  assert.equal((await post(alice, { completedTutorials: [] })).status, 200);
  assert.deepEqual(await read(), []);
});

test("merge requests retain session ownership and CSRF enforcement without modifying records", async () => {
  const body = { completedTutorials: [99], merge: true };
  assert.equal((await post(alice, body, { cookie: "" })).status, 401);
  assert.equal((await post(bob, body, { cookie: cookie(alice) })).status, 403);
  assert.equal(
    (await post(alice, body, { origin: "https://untrusted.example" })).status,
    403
  );
  assert.equal((await post(alice, body, { origin: "" })).status, 403);
  assert.deepEqual(await read(alice), [1]);
  assert.deepEqual(await read(bob), [8]);
});

test("invalid merge flags and progress lists are rejected before writes", async () => {
  for (const body of [
    { completedTutorials: [2], merge: "true" },
    { completedTutorials: [2], merge: null },
    { completedTutorials: [-1], merge: true },
    { completedTutorials: [1.5], merge: true },
    { completedTutorials: ["2"], merge: true },
    {
      completedTutorials: Array.from({ length: 10001 }, (_, index) => index),
      merge: true,
    },
  ])
    assert.equal((await post(alice, body)).status, 400);
  assert.deepEqual(await read(), [1]);
});

test("a missing progress record never acknowledges an unsaved completion", async () => {
  for (const merge of [true, false]) {
    const response = await post(missing, { completedTutorials: [2], merge });
    assert.equal(response.status, 409);
    assert.match(
      (await response.json()).error,
      /Reload your progress and retry/
    );
  }
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_hub.progress WHERE user_id = $1",
        [missing]
      )
    ).rows[0].count,
    0
  );
});

test("an oversized union fails without truncating or replacing saved progress", async () => {
  const saved = Array.from({ length: 9999 }, (_, index) => index);
  await pool.query(
    "UPDATE learning_hub.progress SET completed_tutorials = $1::jsonb WHERE user_id = $2",
    [JSON.stringify(saved), alice]
  );
  const response = await post(alice, {
    completedTutorials: [10000, 10001],
    merge: true,
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await read(), saved);
  const atLimit = await post(alice, {
    completedTutorials: [10000],
    merge: true,
  });
  assert.equal(atLimit.status, 200);
  assert.equal(
    (await atLimit.json()).progress.completedTutorials.length,
    10000
  );
});
