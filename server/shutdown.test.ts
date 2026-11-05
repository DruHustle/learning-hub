import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request } from "node:http";
import { createServer } from "node:net";
import { test } from "node:test";

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  test(`${signal} finishes an accepted HTTP request before stopping`, { timeout: 10_000 }, async t => {
    const socket = createServer();
    await new Promise<void>(resolve => socket.listen(0, "127.0.0.1", resolve));
    const address = socket.address();
    assert.ok(address && typeof address !== "string");
    const port = address.port;
    await new Promise<void>(resolve => socket.close(() => resolve()));

    const child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: "",
        DATABASE_STARTUP_MODE: "initialize",
        PORT: String(port),
        SERVE_FRONTEND: "false",
      },
      stdio: "ignore",
    });
    const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(resolve => {
      child.once("exit", (code, exitSignal) => resolve({ code, signal: exitSignal }));
    });
    t.after(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    });

    const origin = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (child.exitCode !== null || child.signalCode !== null) break;
      try {
        if ((await fetch(`${origin}/health`, { signal: AbortSignal.timeout(250) })).ok) {
          ready = true;
          break;
        }
      } catch { /* Wait for the isolated API to listen. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, "Isolated API must be listening before the shutdown check");

    // A 100 Continue response proves the real server has accepted the request.
    // Hold its JSON body until after the signal, as a slow client could do
    // during a deploy. There is no database, account or production mutation.
    const body = JSON.stringify({ note: "drain-check" });
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const pending = request(`${origin}/api/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          Expect: "100-continue",
          Connection: "close",
        },
      }, response => {
        response.resume();
        response.once("end", () => resolve(response.statusCode));
        response.once("error", reject);
      });
      pending.once("error", reject);
      pending.once("continue", () => {
        pending.write(body.slice(0, 1));
        assert.ok(child.kill(signal));
        setTimeout(() => pending.end(body.slice(1)), 100);
      });
      pending.flushHeaders();
    });
    assert.equal(status, 204, "Accepted requests must complete before the process exits");
    assert.deepEqual(await exited, { code: 0, signal: null });
  });
}
