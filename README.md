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
- `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD` when using the bundled Docker database.
- `INTERNAL_USERS_JSON`
- `NEXT_PUBLIC_SITE_URL` if you deploy behind a public hostname.

Compose always points the app at the bundled database service with an internal URL like `postgresql://...@db:5432/...`. The top-level `DATABASE_URL` in `.env.example` is for local non-Docker development or for running the standalone image.

If you changed `POSTGRES_USER`, `POSTGRES_PASSWORD` or `POSTGRES_DB` after the Docker database volume was first created, Postgres will keep the old credentials inside the existing volume. For a fresh local Docker database, reset the volume:

```bash
docker compose down -v
docker compose up -d --build
```

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

The app uses relative redirects for login/logout so it stays on whichever address you open, such as `http://192.168.1.20:3000`.

## Production Setup

Set:

- `AUTH_SECRET`
- `DATABASE_URL`
- `INTERNAL_USERS_JSON`
- `PUBLIC_INTAKE_SECRET` for public website contact form forwarding.
- SMTP secrets such as `SMTP_USERNAME` and `SMTP_PASSWORD` if SMTP is enabled.
- IMAP secrets such as `IMAP_USERNAME` and `IMAP_PASSWORD` if inbound mail intake is enabled.
- SMS secrets such as `SMS_API_KEY` and `SMS_WEBHOOK_SECRET` if SMS is enabled.
- Calendar secrets such as `CALENDAR_API_KEY` if calendar sync is enabled.
- Storage secrets such as `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` if R2/S3 storage is enabled.

The Settings page stores provider choices, SMTP/IMAP hosts and ports, TLS modes, mailbox names, sender details, bucket names and the names of secret environment variables. It does not store secret values in browser storage.

## Public Website Contact Intake

The internal app exposes `POST /api/public-contact-intake` for the public website to forward contact form submissions. Requests must be `multipart/form-data` and include:

- Header: `x-sct-public-intake-secret: <shared secret>`
- Fields: `name`, `email`, `phone`, `suburb`, `service`, `message`, `device`, `preferredSupport`, `companyWebsite`
- Files: `photos`, up to 4 PNG/JPEG/WebP files, maximum 5MB each

The honeypot field `companyWebsite` must be empty. Valid `service` values are:

```text
Computer Repair, Computer Upgrade, PC Build, Home Tech Support, Digital Literacy,
Wi-Fi / Networking, Printer, Security Cameras, Smart Home, Business IT,
3D Printing, Remote Support, Other
```

Valid `preferredSupport` values are:

```text
On-site, Remote, Collection/drop-off, Not sure
```

Public website environment variables:

```bash
SCT_INTERNAL_INTAKE_URL="https://internal.example.com/api/public-contact-intake"
SCT_PUBLIC_INTAKE_SECRET="same-value-as-internal-PUBLIC_INTAKE_SECRET"
```

Forwarding format from the public website:

```ts
const upstream = await fetch(process.env.SCT_INTERNAL_INTAKE_URL!, {
  method: "POST",
  headers: {
    "x-sct-public-intake-secret": process.env.SCT_PUBLIC_INTAKE_SECRET!,
  },
  body: formData,
});
```

The endpoint returns only:

```json
{ "ok": true, "intakeId": "...", "jobId": "..." }
```

or:

```json
{ "ok": false, "message": "..." }
```

Uploaded photo metadata is recorded on the intake job. Persisting uploaded photo files is intentionally marked as a TODO until the file storage backend is implemented.

Generate a staff password hash:

```bash
npm install
npm run auth:hash-password -- "a-long-password"
```

Run checks:

```bash
npm test
npm run lint
npm run db:validate
npm run build
```
