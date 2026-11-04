import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = "/learning-hub/";
const require = createRequire(import.meta.url);
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

// Exercise the transitive FileList API that uses the scoped minimatch override.
// A default-function import would not be compatible with minimatch 11.
test("PWA build tooling keeps FileList include/exclude matching", async () => {
  const fromPwa = createRequire(require.resolve("vite-plugin-pwa"));
  const fromWorkbox = createRequire(fromPwa.resolve("workbox-build"));
  const fromWorkerPlugin = createRequire(
    fromWorkbox.resolve("@surma/rollup-plugin-off-main-thread"),
  );
  const fromEjs = createRequire(fromWorkerPlugin.resolve("ejs"));
  const fromJake = createRequire(fromEjs.resolve("jake"));
  const { FileList } = fromJake("filelist");
  const fixture = await mkdtemp(path.join(tmpdir(), "learning-pwa-filelist-"));
  try {
    await Promise.all(
      ["keep.js", "ignore.js", "notes.txt"].map((name) =>
        writeFile(path.join(fixture, name), name),
      ),
    );
    const files = new FileList(path.join(fixture, "*.js"));
    files.exclude(path.join(fixture, "ignore*.js"));
    assert.deepEqual(files.toArray(), [path.join(fixture, "keep.js")]);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("built PWA keeps Pages scope, offline content, safe API requests and prompted updates", {
  timeout: 180_000,
}, async (t) => {
  const releases = await mkdtemp(path.join(tmpdir(), "learning-pwa-releases-"));
  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(releases, { recursive: true, force: true });
  });
  let serving = path.join(root, "dist");
  let apiRequests = 0;
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Access-Control-Allow-Origin", "*");
    if (pathname.includes("/api/")) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ request: ++apiRequests, method: request.method }));
      return;
    }
    const relative = pathname.startsWith(base)
      ? decodeURIComponent(pathname.slice(base.length)) || "index.html"
      : "";
    const file = path.resolve(serving, relative);
    if (!relative || !file.startsWith(serving + path.sep)) {
      response.writeHead(404).end("Not found");
      return;
    }
    try {
      const content = await readFile(file);
      response.setHeader("Content-Type", contentTypes[path.extname(file)] || "application/octet-stream");
      response.end(content);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // localhost is a distinct origin: API requests remain outside the Pages origin.
  const apiOrigin = `http://localhost:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.PWA_TEST_CHROMIUM_EXECUTABLE || undefined,
  });
  const context = await browser.newContext({ serviceWorkers: "allow" });
  // Keep this qualification local; the production API and external fonts are not contacted.
  await context.route("**/*", (route) => {
    const requestOrigin = new URL(route.request().url()).origin;
    return [origin, apiOrigin].includes(requestOrigin) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(origin + base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === "activated");
  await page.getByRole("heading", { name: "Master AI Solutions on Learning Hub" }).waitFor();

  // The Portfolio return link adds another desktop control. Check both entry
  // paths around the tablet transition against the real built layout.
  const evidence = process.env.PWA_OUTPUT_DIR || path.join(tmpdir(), "learning-hub-pwa");
  await mkdir(evidence, { recursive: true });
  const longAccountName = "AlexandriaNyamadzawo".repeat(10); // Within the API's 255-character limit.
  const headerCases = [779, 1024, 1090].flatMap((width) =>
    [false, true].map((referred) => ({ width, referred, authenticated: false })),
  ).concat(
    [1280, 1536].map((width) => ({ width, referred: true, authenticated: false })),
    [340, 1024, 1090, 1280, 1536].map((width) => ({ width, referred: true, authenticated: true })),
  );
  for (const { width, referred, authenticated } of headerCases) {
      const caseName = `header-${authenticated ? "account-" : ""}${referred ? "portfolio" : "direct"}-${width}`;
      await t.test(caseName, { timeout: 20_000 }, async () => {
        // Account geometry uses a fresh, entirely mocked session. Service workers
        // cannot bypass interception, and no production API request is forwarded.
        const headerContext = authenticated
          ? await browser.newContext({ serviceWorkers: "block" })
          : context;
        const unexpectedApiRequests = [];
        if (authenticated) {
          await headerContext.route("**/*", (route) => {
            const request = route.request();
            const url = new URL(request.url());
            const fixture = request.method() === "GET" && (
              url.pathname === "/api/me"
                ? { user: { id: "header-layout-user", name: longAccountName, email: "header-layout@example.test", role: "user" } }
                : url.pathname === "/api/progress/header-layout-user"
                  ? { completedTutorials: [1] }
                  : null
            );
            if (fixture) return route.fulfill({
              status: 200,
              contentType: "application/json",
              headers: { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true" },
              body: JSON.stringify(fixture),
            });
            if (url.pathname.startsWith("/api/")) {
              unexpectedApiRequests.push(`${request.method()} ${url.pathname}`);
              return route.abort();
            }
            return [origin, apiOrigin].includes(url.origin) ? route.continue() : route.abort();
          });
        }
        const headerPage = await headerContext.newPage();
        headerPage.setDefaultTimeout(10_000);
        headerPage.on("pageerror", (error) => pageErrors.push(error.message));
        const checkAccountControls = async (region) => {
          if (!authenticated) return;
          const logout = region.getByRole("button", { name: "Logout", exact: true });
          assert.equal(await logout.isVisible(), true, "Logout has a visible, named control");
          const rect = await logout.boundingBox();
          assert.ok(rect.width >= 44 && rect.height >= 44, "Logout remains at least 44 × 44");
          assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1 && rect.y >= -1 && rect.y + rect.height <= 761,
            `Logout stays reachable: ${JSON.stringify(rect)}`);
          assert.ok((await region.ariaSnapshot()).includes(longAccountName), "The full account name remains accessible");
        };
        try {
          await headerPage.setViewportSize({ width, height: 760 });
          await headerPage.goto(origin + base, {
            referer: referred ? "https://andrewgotora.com/" : undefined,
          });
          await headerPage.getByRole("heading", { name: "Master AI Solutions on Learning Hub" }).waitFor();
          if (authenticated) {
            await headerPage.locator("header").getByRole("button", { name: "Logout", exact: true, includeHidden: true }).waitFor({ state: "attached" });
          }
          const returnLink = headerPage.locator('header a[href="https://andrewgotora.com/"]');
          if (referred) await returnLink.waitFor({ state: "attached" });
          else assert.equal(await returnLink.count(), 0, "Direct visits do not inherit another tab's referral");

          const geometry = await headerPage.evaluate(() => {
            const header = document.querySelector("header");
            const box = (element) => {
              const rect = element.getBoundingClientRect();
              return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
            };
            return {
              viewport: window.innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              header: box(header),
              brand: box(header.querySelector("a")),
              navigation: box(header.querySelector("nav")),
              controls: [...header.querySelectorAll("a, button")]
                .filter((element) => element.getBoundingClientRect().width > 0)
                .map((element) => ({ label: element.getAttribute("aria-label") || element.textContent.trim(), ...box(element) })),
            };
          });
          await headerPage.screenshot({ path: path.join(evidence, `${caseName}.png`) });
          await writeFile(path.join(evidence, `${caseName}.json`), JSON.stringify(geometry, null, 2));
          assert.ok(geometry.documentWidth <= width + 1, `Page overflows: ${JSON.stringify(geometry)}`);
          for (const control of geometry.controls) {
            assert.ok(control.left >= -1 && control.right <= width + 1 &&
              control.top >= geometry.header.top - 1 && control.bottom <= geometry.header.bottom + 1,
            `Header control is clipped: ${JSON.stringify(control)}`);
          }

          const toggle = headerPage.getByRole("button", { name: "Open navigation menu", exact: true });
          if (await toggle.isVisible()) {
            const toggleBox = await toggle.boundingBox();
            assert.ok(toggleBox.width >= 44 && toggleBox.height >= 44, "Menu target remains at least 44 × 44");
            await toggle.click();
            const menu = headerPage.locator("#mobile-navigation");
            await menu.waitFor({ state: "visible" });
            await headerPage.waitForFunction(() => {
              const menu = document.querySelector("#mobile-navigation");
              return menu && menu.clientHeight >= menu.scrollHeight - 1;
            });
            if (referred) {
              const mobileReturn = menu.getByRole("link", { name: "Back to Portfolio", exact: true });
              assert.equal(await mobileReturn.isVisible(), true);
              assert.equal(await mobileReturn.getAttribute("href"), "https://andrewgotora.com/");
            }
            const menuBox = await menu.boundingBox();
            assert.ok(menuBox.x >= -1 && menuBox.x + menuBox.width <= width + 1, "Expanded menu fits the viewport");
            await headerPage.screenshot({ path: path.join(evidence, `${caseName}-menu.png`) });
            assert.ok(await headerPage.evaluate(() => document.documentElement.scrollWidth) <= width + 1,
              "Expanded account menu does not overflow the viewport");
            await checkAccountControls(menu);
            await menu.getByRole("link", { name: "Tutorials", exact: true }).click();
            await headerPage.waitForURL("**/learning-hub/#/tutorials");
            await menu.waitFor({ state: "hidden" });
          } else {
            assert.ok(geometry.navigation.width > 0, "A navigation route is available");
            assert.ok(geometry.navigation.left >= geometry.brand.right - 1, "Desktop navigation does not overlap the brand");
            if (referred) assert.equal(await returnLink.isVisible(), true);
            await checkAccountControls(headerPage.locator("header"));
            await headerPage.locator("header nav").getByRole("link", { name: "Tutorials", exact: true }).click();
            await headerPage.waitForURL("**/learning-hub/#/tutorials");
          }
          assert.deepEqual(unexpectedApiRequests, [], "Header navigation does not mutate the fixture account");
        } catch (error) {
          await headerPage.screenshot({ path: path.join(evidence, `${caseName}-failure.png`) }).catch(() => {});
          throw error;
        } finally {
          await headerPage.close();
          if (authenticated) await headerContext.close();
        }
      });
  }

  const registration = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return { scope: registration.scope, worker: registration.active.scriptURL };
  });
  assert.equal(registration.scope, origin + base);
  assert.equal(registration.worker, origin + base + "sw.js");
  const manifest = await (await fetch(origin + base + "manifest.webmanifest")).json();
  assert.equal(manifest.scope, base);
  assert.equal(manifest.start_url, base);

  const cacheUrls = () => page.evaluate(async () => {
    const cachesByName = await Promise.all((await caches.keys()).map((name) => caches.open(name)));
    return (await Promise.all(cachesByName.map((cache) => cache.keys()))).flat().map((request) => request.url);
  });
  const cachedBefore = await cacheUrls();
  const assetNames = (await readdir(path.join(root, "dist/assets"))).filter((name) => /\.(js|css)$/.test(name));
  const cachedPaths = new Set(cachedBefore.map((url) => new URL(url).pathname));
  for (const asset of assetNames) assert.ok(cachedPaths.has(base + "assets/" + asset), `Precached asset: ${asset}`);
  assert.ok(cachedPaths.has(base + "index.html"));
  assert.ok(cachedPaths.has(base + "favicon.svg"));
  const oldIndex = cachedBefore.find((url) => new URL(url).pathname === base + "index.html");

  const apiUrls = [origin + base + "api/me", apiOrigin + "/api/me"];
  for (const url of apiUrls) {
    const replies = await page.evaluate(async (url) => {
      const first = await (await fetch(url)).json();
      const second = await (await fetch(url)).json();
      const posted = await (await fetch(url.replace("/me", "/login"), { method: "POST" })).json();
      return { first, second, posted };
    }, url);
    assert.ok(replies.second.request > replies.first.request, "Repeated API GETs reach the server");
    assert.equal(replies.posted.method, "POST");
  }
  // A navigation under the worker scope must reach the API, not an app-shell fallback.
  const probe = await context.newPage();
  const apiNavigation = await probe.goto(origin + base + "api/me");
  assert.equal(apiNavigation.fromServiceWorker(), false);
  assert.match(apiNavigation.headers()["content-type"], /application\/json/);
  const missingNavigation = await probe.goto(origin + base + "missing-page");
  assert.equal(missingNavigation.status(), 404);
  assert.equal(missingNavigation.fromServiceWorker(), false);
  await probe.close();

  await context.setOffline(true);
  const offlinePage = await page.reload();
  assert.equal(offlinePage.fromServiceWorker(), true);
  await page.getByRole("heading", { name: "Master AI Solutions on Learning Hub" }).waitFor();
  await page.getByRole("link", { name: "View all tutorials" }).click();
  await page.waitForURL("**/learning-hub/#/tutorials");
  const offlineRoute = await page.reload();
  assert.equal(offlineRoute.fromServiceWorker(), true);
  assert.ok((await page.locator("#root").innerText()).includes("Tutorial"));
  for (const url of apiUrls) {
    const rejected = await page.evaluate(async (url) => {
      try { await fetch(url); return false; } catch { return true; }
    }, url);
    assert.equal(rejected, true, "Offline API request must fail instead of returning cached account data");
  }
  assert.ok((await cacheUrls()).every((url) => !new URL(url).pathname.includes("/api/")));
  await context.setOffline(false);

  // Produce a real second build with the unchanged PWA config. Changing the HTML
  // revision verifies installation, waiting, activation and stale-precache cleanup.
  const nextRelease = path.join(releases, "next");
  await build({
    configFile: path.join(root, "vite.config.ts"),
    logLevel: "warn",
    plugins: [{
      name: "pwa-test-release-marker",
      transformIndexHtml(html) {
        return html.replace("</head>", '<meta name="pwa-test-release" content="next"></head>');
      },
    }],
    build: { outDir: nextRelease, emptyOutDir: true },
  });
  serving = nextRelease;
  await page.evaluate(async () => {
    window.pwaTestControllerChanged = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { window.pwaTestControllerChanged = true; });
    window.pwaTestRegistration = await navigator.serviceWorker.getRegistration();
    await window.pwaTestRegistration.update();
  });
  // Playwright polls this predicate synchronously; returning a Promise would
  // finish polling before the new worker has actually reached the waiting state.
  await page.waitForFunction(() => window.pwaTestRegistration.waiting?.state === "installed");
  assert.equal(await page.evaluate(() => window.pwaTestControllerChanged), false);
  assert.equal(await page.locator('meta[name="pwa-test-release"]').count(), 0);
  await page.evaluate(() => {
    window.pwaTestRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
  });
  await page.waitForFunction(() => window.pwaTestControllerChanged);
  await page.reload();
  assert.equal(await page.locator('meta[name="pwa-test-release"]').getAttribute("content"), "next");
  const cachedAfter = await cacheUrls();
  assert.ok(!cachedAfter.includes(oldIndex), "The previous HTML revision must leave the precache");
  assert.ok(cachedAfter.some((url) => new URL(url).pathname === base + "index.html"));
  await context.setOffline(true);
  assert.equal((await page.reload()).fromServiceWorker(), true);
  assert.equal(await page.locator('meta[name="pwa-test-release"]').getAttribute("content"), "next");
  assert.deepEqual(pageErrors, []);
});
