# Render API compute migration

The approved target is a **free web service in My Workspace**, keeping the
current external PostgreSQL primary. The frontend stays on Vercel/GitHub Pages. The qualified existing API is
`https://learning-hub-api-candidate.onrender.com`. Source defaults select it;
production routing changes still require an explicit verified release. Automatic
Render deployment remains off.

Select `deploy/render/render.yaml` as the Blueprint path. It defines one Docker
web service, `learning-hub-api-candidate`, in Frankfurt on the `free` plan. It does
not create a database, persistent disk, worker or paid service. Use the actual
qualified service URL returned by Render; the requested name is not proof that
a particular hostname belongs to this deployment.

`Dockerfile` builds `server/` independently and serves only the API.
`SERVE_FRONTEND=false` makes other paths return JSON 404. Render supplies `PORT`
and `RENDER_GIT_COMMIT`; `/version` reports that commit unless `APP_REVISION` is
explicitly set. Do not copy an old Oracle `APP_REVISION` into the new service.
`/health` is process liveness; `/ready` queries PostgreSQL. The platform liveness
probe does not repeatedly wake an idle managed database. Require `/ready` and
the exact source revision before cutover and after every deployment.

On `SIGTERM` or `SIGINT`, the API stops accepting connections, reports that it is
stopping, and finishes accepted HTTP requests before closing its PostgreSQL pool.
An unresponsive request or database shutdown is bounded by a 20-second deadline,
inside Render's default shutdown window. The isolated server tests exercise a
partially received request during both signals without touching a database.

## Required configuration

The active Oracle runtime is documented in [the Oracle runbook](../oracle/README.md).
Its protected `/opt/learning-hub/compose.runtime.json` is the authoritative source
for the current database connection, session signing secret and allowed origins.
Transfer the resolved values through approved secret handling; never print them
or commit them. Docker Compose may encode literal dollar signs as `$$`, so use
the resolved runtime value rather than copying that escaping into Render.

| Setting | Render value or source |
| --- | --- |
| `DATABASE_URL` | The existing external PostgreSQL connection, preserving the database, role and provider-required verified TLS settings. |
| `SESSION_SECRET` | The exact current secret, at least 32 characters. Do not generate a replacement during the compute cutover. |
| `ALLOWED_ORIGINS` | The actual Vercel and Pages frontend origins, separated by commas, copied and checked against the current runtime. |
| `DATABASE_STARTUP_MODE` | `verify`, already set in both the Blueprint and Docker runtime. |
| `NODE_ENV` | `production`. |
| `SERVE_FRONTEND` | `false`. |
| `PORT` | Render's injected port; the container default is `10000`. |

The three `sync: false` entries prompt for configuration on initial Blueprint
creation. A later Blueprint sync does not supply or update those values; set
existing-service secrets explicitly in Render and deploy the updated runtime.
Missing database access or signing configuration blocks deployment acceptance.

## Preserve the existing database

Moving API compute does not require a database migration. Keep the existing
`learning_hub` schema, user IDs, progress, sequences, password hashes and database
backup arrangements. No primary database is copied or replaced by this change.
The [optional database container](../database/README.md) remains a separate future
hosting decision and is not required for the approved free web service.

Render starts with `DATABASE_STARTUP_MODE=verify`. Before accepting requests it
checks the required account/progress columns and rejects pending plaintext
password upgrades inside a PostgreSQL **read-only transaction**. It does not
create schemas, create tables, seed records or rewrite credentials. Missing
schema or pending legacy upgrades stop startup so they can be handled explicitly
before cutover. An unrecognized mode also stops startup. The default `initialize`
mode retains the existing local/Oracle setup behavior when no mode is configured.

This guarantee covers startup qualification. Once traffic is routed to the new
API, normal authorized registration, login upgrades and progress requests can
write to the retained primary. Run mutation-based qualification against an
isolated test database or approved test accounts; do not treat the live database
as an empty fixture.

## Qualification and frontend cutover

1. Run `corepack pnpm check`, `corepack pnpm test` and
   `corepack pnpm build:server`. Build and run the API container when Docker is
   available. Confirm the service uses `free`, Frankfurt, one instance and manual
   deployment before creation.
2. With an isolated database containing the current schema, verify startup,
   registration/login, owner-isolated progress, logout and restart persistence.
   Also prove that missing schema and legacy plaintext records fail verify-only
   startup without changing the database.
3. Deploy the exact tested revision with the retained production connection and
   current session secret. Check `/version`, `/health`, `/ready` and anonymous
   `/api/me` rejection. A running process with the wrong revision or an unavailable
   database is not ready for frontend traffic.
4. For **Vercel**, prefer a same-origin API route: prepend an external rewrite
   from `/api/:path*` to the qualified Render origin's `/api/:path*` before the SPA
   catch-all. The checked-in Vercel build uses `VITE_API_URL=same-origin`, which
   resolves to the actual browser host for staged deployments and production. The client
   already appends `/api/...`; do not put `/api` at the end of `VITE_API_URL`.
   Preserve the API's `Cache-Control: private, no-store` and disable rewrite
   caching for `/api/:path*` with `x-vercel-enable-rewrite-caching: 0`. Do not add a
   placeholder upstream: the checked-in `/api`, `/ready`, `/version` and `/health`
   routes use the qualified Render endpoint. An explicit empty API value still
   means demo-only behavior. `same-origin` is intended for Vercel, not Pages.
5. **GitHub Pages** is static and cannot run the Vercel proxy. Its
   `LEARNING_API_ORIGIN` repository variable feeds both build and bundle
   verification. A direct qualified Render HTTPS origin, without `/api`, still
   uses cross-site cookies. Test real browser login, refresh, progress and logout
   on every supported host/browser before changing that variable. CORS permission
   cannot override third-party-cookie blocking; retain the existing route until
   a supported path passes acceptance. Do not broaden cookie scope to hide a
   failing journey.
6. After routing changes, test the same account/progress journeys through the
   actual frontend host, including expired sessions and a sleeping free service.
   Keep the old Oracle container and route available for rollback until these
   checks pass. Retire only Learning Hub's old API container afterward, preserving
   its rollback image, protected runtime and unrelated shared ingress.

Host-only cookies are tied to the old API hostname. Changing the browser-facing
host can require users to sign in again even when the signing secret is retained.
Do not claim that retaining the secret alone transfers cookies. A rollback to
the previous API route can use the same retained primary; there is no final data
copy or write freeze for this compute-only move. If a later migration introduces
a second writable database, its data reconciliation needs a separate plan.

Production sessions use a Secure, HttpOnly, host-only `Partitioned` cookie with
`SameSite=None`. Each frontend site has its own browser session, including on
WebKit when unpartitioned third-party cookies are blocked. Login and logout
expire the older unpartitioned cookie as well. Keep the exact origin allowlist
and mutation-origin checks. Browsers without partitioned-cookie support still
need a qualified same-origin route; do not ask users to disable privacy controls.

The retired `learning-hub-yfe1.onrender.com` deployment guard remains intentional.
Qualify a new origin rather than silently reviving the retired service. Password
reset, password change and profile changes remain unavailable in this application;
moving hosts does not implement those features.

## Free service behavior

Render free web services spin down after 15 minutes without inbound traffic and
can take about a minute to wake. The workspace shares 750 free instance hours
per month. Free web services do not have persistent disks; the retained external
PostgreSQL remains the durable store. The client currently has a bounded request
timeout, so verify the real cold-start journey and user-visible retry behavior.
This configuration does not promise always-on capacity or create a keepalive job.

References: [Render Blueprints](https://render.com/docs/blueprint-spec),
[Docker](https://render.com/docs/docker),
[environment variables](https://render.com/docs/configure-environment-variables),
[free services](https://render.com/docs/free),
[health checks](https://render.com/docs/health-checks), and
[Vercel external rewrites](https://vercel.com/docs/routing/rewrites).

### Free-service startup

After an idle period, the frontend makes one read-only `/ready` request before sending account operations. A visible connection status remains available for up to two minutes while the host starts. Requests within five minutes share the confirmed readiness state. Readiness failure prevents sending account credentials or progress writes; the user can retry explicitly. Mutating requests keep their existing ten-second timeout and are never automatically replayed. No background keep-alive is used. Browser acceptance must include an actual idle host, login, session restoration, progress persistence and logout.
