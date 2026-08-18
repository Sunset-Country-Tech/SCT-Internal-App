# Sunset Country Tech Internal Operations

Scratch rebuild of the internal-only operations app.

## What This App Includes

- Private staff login with signed sessions, CSRF token validation and bcrypt password hashes.
- Internal dashboard for customers, jobs, quotes, invoices, appointments and alerts.
- Working Settings page with local persistence for business, finance, workflow, document, user and integration settings.
- Editable integration settings for SMTP email, SMS/SMS-Gate, accounting exports, calendar sync and R2/S3-style file storage.
- Public quote approval links under `/q/[token]`.
- PostgreSQL Prisma schema and initial migration.
- Tests for auth, workflow totals, numbering, permissions and quote approvals.

## Development

```bash
npm install
npm run dev
```

Dev login:

- Email: `owner@sunsetcountry.tech`
- Password: `sunset-demo-2026`

## Docker

Run the app and PostgreSQL together:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:3000
```

Docker Compose includes a local Postgres database and runs Prisma migrations on app startup. The bundled Docker login is:

- Email: `owner@sunsetcountry.tech`
- Password: `sunset-demo-2026`

For production Docker deployments, override at least:

- `AUTH_SECRET`
- `DATABASE_URL`
- `INTERNAL_USERS_JSON`

Build just the app image:

```bash
docker build -t sct-internal-app .
```

Run it against an existing Postgres database:

```bash
docker run --rm -p 3000:3000 \
  -e AUTH_SECRET="replace-with-a-long-random-secret" \
  -e DATABASE_URL="postgresql://user:password@host:5432/sct_internal" \
  -e INTERNAL_USERS_JSON='[{"id":"owner","email":"owner@sunsetcountry.tech","name":"Owner","role":"Owner","passwordHash":"$2b$12$replace-with-bcrypt-hash"}]' \
  sct-internal-app
```

Set `SKIP_DB_MIGRATE=1` if migrations are handled by your deployment pipeline.

## Production Setup

Set:

- `AUTH_SECRET`
- `DATABASE_URL`
- `INTERNAL_USERS_JSON`
- SMTP secrets such as `SMTP_USERNAME` and `SMTP_PASSWORD` if SMTP is enabled.
- SMS secrets such as `SMS_API_KEY` and `SMS_WEBHOOK_SECRET` if SMS is enabled.
- Calendar secrets such as `CALENDAR_API_KEY` if calendar sync is enabled.
- Storage secrets such as `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` if R2/S3 storage is enabled.

The Settings page stores provider choices, endpoints, sender details, bucket names and the names of secret environment variables. It does not store secret values in browser storage.

Generate a staff password hash:

```bash
npm run auth:hash-password -- "a-long-password"
```

Run checks:

```bash
npm test
npm run lint
npm run db:validate
npm run build
```
