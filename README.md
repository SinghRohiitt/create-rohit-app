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
dependencies. A frontend-only project only allows no database and no
authentication because those require a backend.

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

Use `--javascript`, `--database none`, `--auth none`, or `--no-install` for
explicit alternatives. If prompts are still needed, run the CLI in a terminal
with interactive input. Project generation is not implemented yet; after
configuration, the CLI prints the resolved typed configuration.

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
