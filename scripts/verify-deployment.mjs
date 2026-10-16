import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const production = parse(await readFile(path.join(root, ".env.production")));
const expected = (process.env.VITE_API_URL ?? production.VITE_API_URL ?? "").replace(/\/+$/, "");
const retired = "learning-hub-yfe1.onrender.com";
const output = path.resolve(process.argv[2] || path.join(root, "dist"));

if (expected) {
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
if (expected && !bundles.some(source => source.includes(expected))) throw new Error("Built frontend does not contain the configured production API origin");
console.log("Production API configuration and built frontend verified");
