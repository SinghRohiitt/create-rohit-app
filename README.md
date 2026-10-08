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

With only a project name, the CLI identifies the request as interactive and
prints the resolved default configuration. Supplying options selects explicit
CLI mode. Project generation and interactive prompts are not implemented yet.

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
