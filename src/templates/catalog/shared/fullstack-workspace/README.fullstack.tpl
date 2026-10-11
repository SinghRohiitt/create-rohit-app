# {{projectName}}

Full-stack {{language}} project with a {{frontend}} frontend and {{backend}}
backend.

## Project structure

- `frontend/` contains the independently runnable web application.
- `backend/` contains the API, database integration, and authentication.
- Root scripts coordinate both workspace applications.

## Development

Install dependencies once from the workspace root:

```sh
{{packageManager}} install
```

Copy `frontend/.env.example` to `frontend/.env` and
`backend/.env.example` to `backend/.env`. Start both applications together:

```sh
{{packageManager}} run dev
```

Run only one application with `{{packageManager}} run dev:frontend` or
`{{packageManager}} run dev:backend`. Build, test, lint, and typecheck all
available workspaces from the root with `{{packageManager}} run build`,
`{{packageManager}} test`, `{{packageManager}} run lint`, and
`{{packageManager}} run typecheck`.

## Environment and API

The backend listens on port 3000 and serves its API under `/api`. React + Vite
runs on port 5173 and proxies `/api` to the backend; Next.js runs on port 3001.
The frontend API client targets `http://localhost:3000/api`. Update `VITE_API_URL` or
`NEXT_PUBLIC_API_URL` in the frontend `.env` if the API uses another URL.
`CORS_ORIGIN` in the backend environment allows both generated frontend
development origins by default.
Keep server secrets in the backend `.env` only, and never commit `.env` files.

## Database setup

Selected database: {{database}}. For PostgreSQL, run
`{{packageManager}} run db:generate` and
`{{packageManager}} run db:migrate:dev -- --name init` from the workspace root
after configuring the backend `DATABASE_URL`. MongoDB projects use the
backend `DATABASE_URL` connection string and connect during API startup.

## Authentication

Selected authentication: {{authentication}}. When backend JWT is enabled, set
`JWT_SECRET` in `backend/.env` to at least 32 random bytes. Register and log in
through the backend API; protected routes accept bearer access tokens, which
expire after 15 minutes. Logout is stateless: the frontend discards the token.

## Root scripts

- `{{packageManager}} run dev` starts frontend and backend concurrently.
- `{{packageManager}} run dev:frontend` starts only the frontend.
- `{{packageManager}} run dev:backend` starts only the backend.
- `{{packageManager}} run build` builds both applications.
- `{{packageManager}} run db:generate` generates database client artifacts when configured.
- `{{packageManager}} run db:migrate:dev` applies development database migrations when configured.
