# {{projectName}}

NestJS backend generated with create-rohitsingh0408-app.

## Start

```sh
cp .env.example .env
npm install
npm run start:dev
```

The API is served under `http://localhost:3000/api`; the health check is
`GET /api/health`.
Set `CORS_ORIGIN` in `.env` to the browser origin used by your frontend.

## Database

{{database}}

For PostgreSQL, configure `DATABASE_URL`, then run `npm run db:migrate:dev`.
For MongoDB, configure `DATABASE_URL` with a reachable MongoDB connection
string. Database connections are opened by Nest during application bootstrap.

## Authentication

{{authentication}}

When JWT is enabled, set `JWT_SECRET` to a random secret of at least 32 bytes.
The API includes `POST /api/auth/register`, `POST /api/auth/login`, and
Bearer-protected `GET /api/auth/me`. Passwords are hashed with bcrypt. Access
tokens use HS256 and expire after 15 minutes. Logout is stateless; clients
discard the token.

DTO validation rejects invalid fields and unknown request properties.
Nest's global exception filter returns a consistent HTTP error envelope.
