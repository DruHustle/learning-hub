import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const production = parse(await readFile(path.join(root, ".env.production")));
const expected = (process.env.VITE_API_URL ?? production.VITE_API_URL ?? "").replace(/\/+$/, "");
const retired = "learning-hub-yfe1.onrender.com";
const output = path.resolve(process.argv[2] || path.join(root, "dist"));

if (expected && expected !== "same-origin") {
  const url = new URL(expected);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("Production VITE_API_URL must be an HTTPS origin without credentials, query, or /api suffix");
  }
  if (url.hostname === retired) throw new Error("Production API configuration still uses the retired Render backend");
}

async function javascript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? javascript(filename) : entry.name.endsWith(".js") ? readFile(filename, "utf8") : "";
  }));
  return files.flat();
}
const bundles = await javascript(path.join(output, "assets"));
if (!bundles.length) throw new Error("No production JavaScript bundles found; build before verifying deployment");
if (bundles.some(source => source.includes(retired))) throw new Error("Built frontend still references the retired Render backend");
if (expected && expected !== "same-origin" && !bundles.some(source => source.includes(expected))) throw new Error("Built frontend does not contain the configured production API origin");
if (expected === "same-origin") {
  if (!bundles.some(source => source.includes("location.origin"))) throw new Error("Built frontend lacks current-origin account routing");
  const config = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
  const fallback = config.rewrites.findIndex(route => route.destination === "/index.html");
  for (const pathname of ["/api/:path*", "/ready", "/version", "/health"]) {
    const index = config.rewrites.findIndex(route => route.source === pathname);
    if (index < 0 || index >= fallback || config.rewrites[index].destination !== "https://learning-hub-api-candidate.onrender.com" + pathname) throw new Error("Missing qualified first-party API route");
  }
  for (const pathname of ["/api/:path*", "/ready"]) {
    const headers = config.headers.find(route => route.source === pathname)?.headers;
    if (!headers?.some(header => header.key === "Cache-Control" && header.value === "private, no-store") || !headers.some(header => header.key === "x-vercel-enable-rewrite-caching" && header.value === "0")) throw new Error("Account proxy caching must remain disabled");
  }
}
console.log("Production API configuration and built frontend verified");
