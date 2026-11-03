import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import pg from "pg";

// Instantiate the installed driver only. Never connect or initialize the schema.
const reference = readFileSync(
  new URL("../deploy/database/application.env.example", import.meta.url),
  "utf8",
).split("\n").find(line => line.startsWith("DATABASE_URL=")).slice("DATABASE_URL=".length);

function connectionUrl(host, caFile) {
  const value = reference
    .replace("<reviewed-app-role>", "learning_hub_fixture")
    .replace("<url-encoded-password>", encodeURIComponent("synthetic:@/#fixture"))
    .replace("<current-or-qualified-database-host>", host)
    .replace("<existing-database-name>", "learning_hub_fixture");
  const url = new URL(value);
  url.searchParams.set("sslrootcert", caFile);
  return url.href;
}

test("the actual pg client keeps verified TLS and the selected container or external hostname", () => {
  const temporary = mkdtempSync(join(tmpdir(), "learning-hub-db-client-"));
  try {
    const caFile = join(temporary, "public CA.crt");
    const ca = "synthetic-config-fixture-not-a-certificate\n";
    writeFileSync(caFile, ca);
    for (const host of ["learning-hub-postgres", "retained-primary.example.invalid"]) {
      const connectionString = connectionUrl(host, caFile);
      assert.equal(new URL(connectionString).searchParams.get("sslmode"), "verify-full");
      const client = new pg.Client({ connectionString });
      const parameters = client.connectionParameters;
      assert.equal(parameters.host, host);
      assert.equal(parameters.database, "learning_hub_fixture");
      assert.equal(parameters.user, "learning_hub_fixture");
      assert.equal(parameters.password, "synthetic:@/#fixture");
      assert.equal(typeof parameters.ssl, "object");
      assert.equal(parameters.ssl.ca, ca);
      assert.notEqual(parameters.ssl.rejectUnauthorized, false);
      // An override here could silently bypass Node's default hostname check.
      assert.equal(parameters.ssl.checkServerIdentity, undefined);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("a missing selected CA fails in the actual driver before any network connection", () => {
  const temporary = mkdtempSync(join(tmpdir(), "learning-hub-db-client-"));
  try {
    const connectionString = connectionUrl("learning-hub-postgres", join(temporary, "missing.crt"));
    assert.throws(() => new pg.Client({ connectionString }), { code: "ENOENT" });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
