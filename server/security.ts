import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const deriveKey = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(expected || "")) return false;
  const actual = await deriveKey(password, salt, 64) as Buffer;
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
