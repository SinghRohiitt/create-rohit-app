# create-rohit-app

A command-line tool for scaffolding configurable full-stack applications.

## Usage

```sh
npx create-rohit-app my-app
npx create-rohit-app my-app \
  --frontend react \
  --backend express \
  --typescript \
  --database postgres \
  --auth jwt
```

With only a project name, the CLI starts an interactive configuration flow.
Choose a frontend, backend, language, database, authentication strategy, and
whether to install dependencies. Defaults are Full Stack, React + Vite,
Node.js + Express, TypeScript, no database, no authentication, and install
dependencies. Frontend-only projects do not support a database. Selecting JWT
for a React frontend adds a client-side token helper, but does not create a
backend or implement login endpoints.

CLI options override corresponding prompt answers, and those questions are
skipped. Framework flags imply project type: providing both frameworks selects
Full Stack; a frontend or backend flag alone selects that project type. For
example:

```sh
npx create-rohit-app my-app \
  --frontend react \
  --backend express \
  --typescript \
  --database postgres \
  --auth jwt \
  --install-dependencies
```

Use `--javascript`, `--database none`, `--auth none`, `--no-install`, or
`--dry-run` for explicit alternatives. If prompts are still needed, run the CLI
in a terminal with interactive input.

The generator discovers templates from the packaged catalog and composes all
templates whose `appliesTo` selectors match the resolved configuration.
Templates use a `template.json` manifest to map source files to safe relative
destination paths, optionally render `{{projectConfigKey}}` variables, and
conditionally include files with `when` selectors. Manifests can deep-merge
JSON package metadata. Full-stack projects use a root workspace with
independent `frontend/` and `backend/` applications. The catalog includes
React + Vite and Next.js App Router frontends, and Node.js backends with Express
or NestJS. Frontends and Express support JavaScript or TypeScript; NestJS uses
TypeScript. Both backends can use PostgreSQL with Prisma, MongoDB with Mongoose,
or no database.

The React application includes Vite, ESLint, a typed or JavaScript API service,
environment configuration, and starter component/page/hook/store/lib/type/
asset directories. The Next.js application uses the App Router, ESLint, a
typed or JavaScript API service, environment configuration, and starter
component/hook/lib/type/public directories. Both frontends are structured to
consume a separately generated backend through their API base URL.
Backend projects include `README.backend.md` with API and database setup
instructions. NestJS uses standard modules, providers, DTO validation, guards,
and a global exception filter.

Selecting JWT with React adds a client-side token session helper and
Bearer-token API requests; it does not create or imply a backend or implement
login endpoints. Access tokens remain in memory by default.

Backend JWT authentication generates registration and login endpoints, bcrypt
password hashing, short-lived JWTs, and a protected current-user endpoint.
Persistent storage is required; choose PostgreSQL or MongoDB when enabling
backend JWT authentication. Logout is stateless: clients discard their access
token, which expires after 15 minutes.

Existing non-empty destination directories are never overwritten. Use
`--dry-run` to print planned file paths without writing any files. Dependency
installation and Git initialization are configuration options but are not
executed by this release.

Use `--help` to list available options and `--version` to print the CLI version.
Project names must be lowercase and contain only letters, numbers, dots,
underscores, or hyphens. Installation and Git initialization default to enabled;
pass `--no-install` or `--no-git` to disable either behavior.

## Development

```sh
npm install
npm run dev -- my-app
npm run typecheck
npm run lint
npm test
npm run build
npm run test:templates
npm run test:backend-templates
npm run test:nestjs-templates
npm run test:fullstack-templates
```
