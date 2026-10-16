import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("./verify-deployment.mjs", import.meta.url));
async function verify(origin, source) {
  const output = await mkdtemp(path.join(tmpdir(), "learning-deployment-"));
  try {
    await mkdir(path.join(output, "assets"));
    await writeFile(path.join(output, "assets", "index-test.js"), source);
    return spawnSync(process.execPath, [script, output], { encoding: "utf8", env: { ...process.env, VITE_API_URL: origin } });
  } finally { await rm(output, { recursive: true, force: true }); }
}
test("ships the configured origin and supports an intentional custom API", async () => {
  for (const origin of ["https://learning-api.152-70-22-84.sslip.io", "https://custom.example.test"]) {
    assert.equal((await verify(origin, `const api = ${JSON.stringify(origin)};`)).status, 0);
  }
});
test("rejects the old production API and the duplicated /api prefix defect", async () => {
  for (const origin of ["https://learning-hub-yfe1.onrender.com", "https://learning-api.152-70-22-84.sslip.io/api"]) {
    assert.notEqual((await verify(origin, `const api = ${JSON.stringify(origin)};`)).status, 0);
  }
});
test("rejects a stale built bundle even when configuration has already been fixed", async () => {
  const result = await verify("https://learning-api.152-70-22-84.sslip.io", 'const api = "https://learning-hub-yfe1.onrender.com";');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Built frontend still references/);
});
test("rejects a different compiled origin and preserves explicit demo-only builds", async () => {
  assert.notEqual((await verify("https://custom.example.test", 'const api = "https://other.example.test";')).status, 0);
  assert.equal((await verify("", "const demoOnly = true;")).status, 0);
});
