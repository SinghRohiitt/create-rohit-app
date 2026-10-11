# Express backend

This directory contains the Node.js API for **{{projectName}}**. Install its
dependencies from the project root and start the server with
`{{packageManager}} run dev`. Build with `{{packageManager}} run build`, then
start the production server with `{{packageManager}} start`.

Copy `.env.example` to `.env` and set a database connection string when a
database is selected. For JWT projects, set `JWT_SECRET` to at least 32 bytes
of cryptographically random secret material (for example, generate it with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`).
Never commit `.env`.

For PostgreSQL, generate the client and apply the initial development
migration with `{{packageManager}} run db:migrate:dev -- --name init`. MongoDB
connects at startup and creates its user collection/index as needed.

## API

- `GET /api/health` — liveness check.
- `POST /api/auth/register` — register with a valid email and password of at
  least 12 characters.
- `POST /api/auth/login` — issue a short-lived access token.
- `GET /api/auth/me` — return the authenticated user.
- `POST /api/auth/logout` — stateless JWT logout. Clients must discard the
  token; it remains valid until its 15-minute expiration.

Authentication routes are only generated when JWT is selected. Passwords are
hashed with bcrypt and never returned by the API. Prisma projects require a
database migration before first start; see `prisma/schema.prisma`.
