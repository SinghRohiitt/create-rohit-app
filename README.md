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
conditionally include files with `when` selectors. The catalog includes the
shared project files, a React + Vite frontend, and a Next.js App Router
frontend. Both frontends support JavaScript or TypeScript.

The React application includes Vite, ESLint, a typed or JavaScript API service,
environment configuration, and starter component/page/hook/store/lib/type/
asset directories. The Next.js application uses the App Router, ESLint, a
typed or JavaScript API service, environment configuration, and starter
component/hook/lib/type/public directories. Both frontends are structured to
consume a separately generated backend through their API base URL.

Selecting JWT with React adds a client-side token session helper and
Bearer-token API requests; it does not create or imply a backend or implement
login endpoints. Access tokens remain in memory by default.

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
```
