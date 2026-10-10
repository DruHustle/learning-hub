import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { ScryptOptions } from "node:crypto";
function deriveKey(password: string, salt: string, length: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, length, options, (error, key) => error ? reject(error) : resolve(key)));
}

// OWASP's memory-constrained scrypt profile: N=2^14, r=8, p=5.
const passwordOptions = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 64, passwordOptions) as Buffer;
  return `scrypt:16384:8:5:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const fields = stored.split(":");
  const legacy = fields.length === 3;
  if (fields[0] !== "scrypt" || (!legacy && (fields.length !== 6 || fields.slice(1, 4).join(":") !== "16384:8:5"))) return false;
  const salt = fields[legacy ? 1 : 4];
  const expected = fields[legacy ? 2 : 5];
  if (!/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(expected || "")) return false;
  const actual = await deriveKey(password, salt, 64, { ...passwordOptions, p: legacy ? 1 : 5 }) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export function signSession(userId: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: now + 15 * 60_000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function verifySession(token: string, secret: string, now = Date.now()): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || token.length > 2048) return null;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof claims.userId === "string" && claims.userId.length > 0 && Number.isFinite(claims.expiresAt) && claims.expiresAt > now ? claims.userId : null;
  } catch { return null; }
}
