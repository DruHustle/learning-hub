# Render API migration candidate

Prepared configuration only: no Render service, DNS change or database migration
has been applied. The frontend remains on its existing Vercel/GitHub Pages hosts.
Select this nested Blueprint explicitly only after confirming account, region,
existing service IDs, price and measured capacity. Automatic deployment is off.

`Dockerfile` builds `server/` independently and serves only the API. It excludes
the frontend assets from the runtime. `SERVE_FRONTEND=false` makes non-API paths
return JSON 404 instead of a missing or duplicate frontend. Render supplies
`PORT` and `RENDER_GIT_COMMIT`; `/version` reports that commit unless an explicit
`APP_REVISION` is set. `/health` is process liveness; `/ready` queries PostgreSQL.
The platform liveness probe does not repeatedly wake an idle managed database.
Require `/ready` before cutover and after every deployment; liveness alone is
not a release acceptance result.

## Database and sessions

Use an isolated PostgreSQL copy for qualification. Preserve the `learning_hub`
schema, user IDs, progress, sequences, password hashes and existing session secret.
Startup creates missing tables and upgrades legacy plaintext passwords, so it is
not a read-only probe. External PostgreSQL connections must verify TLS according
to their provider's connection contract. Preserve the current primary until a
rehearsed copy and restore have succeeded.

A self-hosted database on Render needs a separate paid private service and a
persistent disk, never the API's ephemeral filesystem. Match the source database
major version and extensions before choosing/pinning an image. Mount the actual
data directory for that chosen PostgreSQL major version, use separate runtime
credentials, and retain encrypted database-native backups in independent object
storage. Backblaze B2, if selected, stores backup objects; it is not a database.
The migration must include a successful restore rehearsal and retention policy.
No production database container or backup schedule is created by this candidate.

The [optional PostgreSQL container candidate](../database/README.md) provides
separate Docker-host configuration, verified-TLS connection examples and an
application network/CA overlay tested against the retained Oracle manifest.
It preserves the existing primary and session secret. It does not add a database
to this Render Blueprint; choosing a paid private service and persistent disk,
then qualifying its image, storage and restore, remains an explicit hosting step.

## Qualification and frontend cutover

1. Run `corepack pnpm check`, server tests and `build:server`. Build and run the
   container when Docker is available. Confirm the paid service selection.
2. Deploy the exact tested revision with an isolated database and approved test
   credentials. Verify `/version`, `/health`, `/ready`, anonymous rejection,
   registration/login, owner-isolated progress, logout and restart persistence.
3. Set `ALLOWED_ORIGINS` to the actual frontend origins. Test browser cookie
   handling on each host: CORS permission cannot override third-party-cookie
   blocking. Preserve the working session contract; do not broaden cookie scope.
4. Use the qualified Render HTTPS origin, without `/api`, for Vercel's
   `VITE_API_URL` and GitHub repository variable `LEARNING_API_ORIGIN`. The Pages
   workflow now uses that variable for both build and bundle verification.
   The old Oracle default remains until the variable is deliberately changed.
5. The retired `learning-hub-yfe1.onrender.com` guard remains intentional. Do not
   revive it silently; qualify a new origin, or review that explicit retirement
   together with proof that the old service now hosts the intended revision.
6. Pause source writes for the final database copy, verify the new path, then
   retire only Learning Hub's old Oracle container. Preserve its rollback image,
   source DB and unrelated shared ingress. Once new writes occur, reconcile them
   before a database rollback.

Password reset, password change and profile changes are still unavailable in the
current application; a host relocation does not implement those features.

References: [Render Docker](https://render.com/docs/docker),
[persistent disks](https://render.com/docs/disks),
[health checks](https://render.com/docs/health-checks), and
[private networking](https://render.com/docs/private-network).
