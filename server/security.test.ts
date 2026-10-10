import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, verifyPassword, signSession, verifySession } from "./security";

test("password hashes use unique salts and never accept plaintext storage", async () => {
  const first = await hashPassword("long-test-password");
  const second = await hashPassword("long-test-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("long-test-password", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.equal(await verifyPassword("plaintext", "plaintext"), false);
});

test("sessions reject expired, tampered, malformed, and differently signed tokens", () => {
  const token = signSession("user-1", "test-secret", 1000);
  assert.equal(verifySession(token, "test-secret", 1001), "user-1");
  assert.equal(verifySession(token, "test-secret", 901000), null);
  assert.equal(verifySession(token, "other-secret", 1001), null);
  assert.equal(verifySession("x" + token, "test-secret", 1001), null);
  assert.equal(verifySession(token + ".extra", "test-secret", 1001), null);
});
