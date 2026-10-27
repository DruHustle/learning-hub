import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { signSession } from "./security";
import { readFileSync } from "node:fs";

let child: ChildProcess;
let base: string;
before(async () => {
  const socket = createServer();
  await new Promise<void>(resolve => socket.listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "", PORT: String(port) },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error("Isolated test API exited before readiness");
    try { if ((await fetch(base + "/health", { signal: AbortSignal.timeout(250) })).ok) return; } catch { /* Wait for startup. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Isolated test API did not start");
});
after(() => child?.kill("SIGTERM"));

test("Oracle probes preserve cadence and use process liveness", () => {
  const compose = JSON.parse(readFileSync(new URL("../deploy/oracle/compose.yaml", import.meta.url), "utf8"));
  const probe = compose.services.app.healthcheck;
  assert.match(probe.test.join(" "), /\/health/);
  assert.doesNotMatch(probe.test.join(" "), /\/ready/);
  assert.equal(probe.interval, "30s");
  assert.equal(probe.timeout, "10s");
  assert.equal(probe.retries, 3);
});

test("liveness with a session cookie remains independent of unavailable database readiness", async () => {
  const cookie = "learning_session=" + signSession("alice", "local-learning-hub-development-secret");
  assert.equal((await fetch(base + "/health", { headers: { cookie } })).status, 200);
  assert.equal((await fetch(base + "/ready", { headers: { cookie } })).status, 503);
});

test("private progress rejects anonymous, another owner, and cross-site requests", async () => {
  const cookie = "learning_session=" + signSession("alice", "local-learning-hub-development-secret");
  assert.equal((await fetch(base + "/api/progress/alice")).status, 401);
  assert.equal((await fetch(base + "/api/progress/bob", { headers: { cookie } })).status, 403);
  assert.equal((await fetch(base + "/api/progress/alice", {
    method: "POST", headers: { cookie, origin: "https://untrusted.example", "content-type": "application/json" }, body: "{}",
  })).status, 403);
});
test("logout expires the session cookie immediately", async () => {
  const response = await fetch(base + "/api/logout", { method: "POST" });
  assert.equal(response.status, 204);
  assert.match(response.headers.get("set-cookie") || "", /Expires=Thu, 01 Jan 1970/i);
  assert.doesNotMatch(response.headers.get("set-cookie") || "", /Max-Age=900/);
});
test("malformed JSON and missing API routes return safe JSON errors", async () => {
  const response = await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Request failed" });
  assert.equal((await fetch(base + "/api/unknown")).status, 404);
});
