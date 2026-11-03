# Optional PostgreSQL container candidate

This is fresh source preparation for an isolated Learning Hub database rehearsal.
The existing external PostgreSQL primary, application image, session secret and
Render Blueprint remain selected as before. No database, image, volume, backup,
provider resource or migration has been created or qualified by these files.

## Separate database and application contracts

`compose.database.yaml` is its own Docker Compose project. Its only service is
behind the explicit `candidate-database` profile, joins an internal private
network and publishes no host port. It uses an existing named volume marked
`external: true`; deleting the Compose project does not own that volume's
lifecycle. Avoid volume deletion commands and keep recoverable copies separately.

`compose.application-database.yaml` is an optional overlay for the actual
`deploy/oracle/compose.yaml` plus its retained private `compose.runtime.json`.
It adds the database network and a read-only public CA file to `app`, retaining
`learning-hub-ingress`, its `learning-hub-api` alias, loopback diagnostic port,
application image, environment, health probe and existing mounts. It does not
change `DATABASE_URL` or start the database. Keep the database project separate
from the application project; do not combine their Compose definitions.

The current client in [server/db.ts](../../server/db.ts) is Node `pg.Pool`
through Drizzle. It reads `DATABASE_URL`; use the connection reference in
`application.env.example` through the existing protected runtime mechanism.
Both a qualified container and an external provider use
`sslmode=verify-full&sslrootcert=/run/learning-hub-db-ca/root.crt`.
Supply the issuing CA at `LEARNING_HUB_DATABASE_CA_FILE`. Keep the real provider
hostname for an external primary. For this Docker network, the selected hostname
is `learning-hub-postgres`, which must appear in the server certificate's SAN.
Do not replace the hostname with an IP or weaken TLS to bypass a certificate error.

Only the CA certificate is mounted in the application. Its non-root Node identity
must be able to read that file. The database's private key stays on the database
service. Preserve the current `SESSION_SECRET` and `ALLOWED_ORIGINS`, including
the existing cookie/session contract and user IDs; no new signing key is generated.

## Required reviewed inputs

Complete `database.env.example` privately outside this checkout. Every image,
platform, postgres UID/GID, memory, CPU, shared-memory, connection, retained-volume,
bootstrap-password and server-certificate input is explicit; no suitable live
value is assumed.

1. Inspect the source PostgreSQL major version, extensions, encoding, collation,
   database name and roles. Select a source-compatible official `postgres`
   image by digest and qualify it on the actual target platform. A placeholder
   digest or a successful Compose render is not image qualification.
2. Measure peak database and application use. The application pool allows ten
   connections per process; include rollout overlap, administrative access and
   other consumers when selecting the server connection/resource budgets.
   Preserve VM or service headroom rather than copying the test fixture values.
3. Prepare a new empty rehearsal volume with ownership matching the selected
   image's actual named postgres UID/GID. The service runs as that non-root
   identity with a read-only root filesystem, dropped capabilities and no
   privilege escalation. It cannot repair arbitrary host ownership.
4. The manifest deliberately keeps
   `PGDATA=/var/lib/postgresql/data/pgdata` inside its retained
   `/var/lib/postgresql/data` mount. PostgreSQL 18+ images changed their defaults
   to a version-specific directory under `/var/lib/postgresql`. Qualify this
   explicit override with the chosen image's entrypoint, fresh initialization,
   restart and recreation. Do not remove it while retaining this mount or place
   a different major version over populated data. A layout change needs its own
   restore rehearsal.
5. Supply existing `server.crt` and `server.key` in the required certificate
   directory. The key and bootstrap password file must be private, owned/readable
   by the selected database identity, and outside all image contexts. Compose
   file-backed secrets do not repair host ownership. The named volume, socket
   directory, shared memory and `/tmp` are the writable locations.
6. Audit source/restored roles. Bootstrap administration uses the named postgres
   OS identity over the local socket. HBA rejects plaintext network sessions and
   network login by the role named `postgres`; this does not identify every
   restored superuser by privilege. Disable other administrative network logins
   before granting application access.

Only the bootstrap postgres database is initialized. A populated `PGDATA`
skips bootstrap: changing `POSTGRES_*` inputs does not rotate an existing
password, create the application database or migrate records. Preserve a failed
initialization for review. `pg_isready` is a process probe, including during
temporary initialization; it does not prove authenticated application access,
completed restore, verified TLS or data integrity.

## Application privileges and data preservation

Restore or create the selected application database separately. Use a dedicated
non-superuser application role, with `CONNECT` and `CREATE` on that isolated
database and ownership of the `learning_hub` schema/objects or equivalent
reviewed schema and table privileges. Preserve sequence ownership/access.
Cluster superuser, `CREATEROLE` and `CREATEDB` attributes are unnecessary.

Startup calls `initializeSchema()`, creates the `learning_hub` schema and
missing `users`/`progress` tables, and uses a serial progress sequence. Before
listening, [server/index.ts](../../server/index.ts) reads every stored password
and upgrades legacy plaintext records; registration and progress updates also
write these tables. A role restricted to read-only or ordinary table DML can
break startup. Verify startup DDL, schema ownership, SELECT/INSERT/UPDATE and
sequence permissions with the isolated copy. This is not a read-only readiness
probe, and this candidate does not alter those application behaviors.

Keep the current external primary until a consistent database-native backup is
restored into the disposable candidate and verified. Check user IDs, password
hashes, progress, constraints and sequence values; valid and invalid CA/hostname
outcomes; plaintext/admin rejection; authenticated startup, login, registration
and owner-isolated progress; restart/recreation persistence; and resource use.
Restore a backup of that candidate again before cutover.

Retain encrypted database-native backups outside the database host with separately
retained recovery keys and a reviewed retention policy. Backblaze B2, if selected,
stores backup objects; it is not a live PostgreSQL service. No backup provider or
automatic schedule is selected here. Pause source writers for the final copy and
coordinate one active primary. Preserve the source database and compatible
application image; reconcile any new writes before a database rollback.

## Configuration-only verification

From the repository, inspect configuration without printing private values:

```bash
docker compose --env-file <private-interpolation-env> \
  -f deploy/database/compose.database.yaml \
  --profile candidate-database config --quiet

docker compose --env-file <private-interpolation-env> \
  -f deploy/oracle/compose.yaml -f <retained-private-runtime-json> \
  -f deploy/database/compose.application-database.yaml config --quiet
```

The second check still requires `APP_IMAGE` to identify the retained qualified
application image. The env file supplies Compose interpolation, not automatic
application environment injection. Keep the protected runtime override intact.

CI runs these fresh source checks before the existing dependency audit:

```bash
python3 scripts/test_database_candidate.py --require-compose
node --test scripts/database-client-config.test.mjs
```

They use temporary synthetic inputs, the actual Oracle base manifest, Docker
Compose's real configuration renderer and the installed `pg` client parser.
They do not pull/start images, contact PostgreSQL, perform TLS handshakes,
initialize data or qualify a restore. Production still requires those runtime
checks and the application's existing release/readiness gates.

## Render deployment boundary

This Docker-host Compose candidate is not an automatic Render database addition.
A self-hosted database there needs a separate paid private service and persistent
disk in the API's workspace/region, with the applicable environment isolation
rules. Use its actual internal hostname and matching TLS certificate. Qualify
the disk mount and `PGDATA` for that service; the API's ephemeral filesystem is
not durable database storage.

A disk-backed service runs as one instance, and replacement deployments
interrupt it. Its disk is unavailable to builds and pre-deploy commands. Use
database-native backups and restores for a custom database; a filesystem
snapshot restore can leave it inconsistent. Confirm service, disk, capacity and
cost selections before creating resources. The existing Render candidate keeps
`DATABASE_URL` as an explicit protected input.

Primary references: [official PostgreSQL image](https://github.com/docker-library/docs/blob/master/postgres/README.md),
[image entrypoint](https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh),
[Node PostgreSQL connection parsing](https://github.com/brianc/node-postgres/blob/master/packages/pg-connection-string/index.js),
[Render private network](https://render.com/docs/private-network), and
[Render persistent disks](https://render.com/docs/disks).
