import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

test("consecutive quiz questions can select the same answer position", { timeout: 60_000 }, async (t) => {
  let browser;
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const relative = pathname.startsWith("/learning-hub/") ? pathname.slice(14) || "index.html" : "";
    const file = path.resolve(root, relative);
    if (!relative || !file.startsWith(root)) return response.writeHead(404).end();
    try {
      response.setHeader("Content-Type", types[path.extname(file)] || "text/plain");
      response.end(await readFile(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PWA_TEST_CHROMIUM_EXECUTABLE || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  // Only selection/reset behavior is exercised. No API is mocked or contacted,
  // and the quiz is not completed, so no account/progress record is written.
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin + "/learning-hub/#/tutorials/2");
  await page.getByRole("button", { name: "Start Quiz", exact: true }).click();
  await page.locator("#option-1").click();
  await page.getByRole("button", { name: "Check Answer", exact: true }).click();
  await page.getByRole("button", { name: "Next Question", exact: true }).click();
  await page.getByText("Question 2 of 3", { exact: true }).waitFor();
  assert.equal(await page.locator("#option-1").getAttribute("aria-checked"), "false", "the previous selection must reset");
  assert.equal(await page.getByRole("button", { name: "Check Answer", exact: true }).isDisabled(), true);
  await page.locator("#option-1").click();
  assert.equal(await page.getByRole("button", { name: "Check Answer", exact: true }).isEnabled(), true, "selecting the same answer position must enable submission");
  await page.getByRole("button", { name: "Check Answer", exact: true }).click();
  await page.getByRole("button", { name: "Next Question", exact: true }).waitFor();
});
