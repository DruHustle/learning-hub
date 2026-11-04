import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

test("readiness preserves same-origin access but sends no cross-origin cookies", async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL("../client/src/lib/accountConnection.ts", import.meta.url))],
    bundle: true, write: false, format: "esm", platform: "browser",
  });
  const observations = [];
  let origin;
  const handler = (crossOrigin) => (req, res) => {
    if (req.url === "/connection.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      return res.end(bundle.outputFiles[0].text);
    }
    if (req.url === "/ready") {
      const cookie = req.headers.cookie || "";
      observations.push({ crossOrigin, cookie });
      res.writeHead(crossOrigin || cookie.includes("preview_access=synthetic") ? 200 : 403, {
        "Content-Type": "application/json", "Access-Control-Allow-Origin": origin,
        "Cache-Control": "private, no-store",
      });
      return res.end(JSON.stringify({ status: "ready" }));
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<!doctype html><title>Isolated account connection fixture</title>");
  };
  const main = createServer(handler(false));
  const other = createServer(handler(true));
  const listen = (server) => new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  await listen(main);
  await listen(other);
  origin = `http://127.0.0.1:${main.address().port}`;
  const otherOrigin = `http://127.0.0.1:${other.address().port}`;
  const browser = await chromium.launch({ headless: true });
  try {
    for (const target of [origin, otherOrigin]) {
      const context = await browser.newContext();
      await context.addCookies([{ name: "preview_access", value: "synthetic", url: origin }]);
      const page = await context.newPage();
      try {
        await page.goto(origin);
        const state = await page.evaluate(async target => {
          const module = await import("/connection.js");
          await module.ensureAccountConnection(target);
          return module.accountConnectionStatus();
        }, target);
        assert.equal(state, "ready");
      } finally { await context.close(); }
    }
    assert.deepEqual(observations, [
      { crossOrigin: false, cookie: "preview_access=synthetic" },
      { crossOrigin: true, cookie: "" },
    ]);
  } finally {
    await browser.close();
    await Promise.all([main, other].map(server => new Promise(resolve => server.close(resolve))));
  }
});
