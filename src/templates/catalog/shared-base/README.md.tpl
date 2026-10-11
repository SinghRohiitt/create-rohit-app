# {{projectName}}

An application generated with `create-rohitsingh0408-app`.

## Getting started

Install dependencies and start the local development server:

```sh
{{packageManager}} install
{{packageManager}} run dev
```

Build the production bundle with `{{packageManager}} run build`.

## Configuration

- Project type: {{projectType}}
- Frontend: {{frontend}}
- Backend: {{backend}}
- Language: {{language}}
- Database: {{database}}
- Authentication: {{authentication}}

Copy `.env.example` from the application directory to `.env` and set the
required values. Keep server secrets private and never commit `.env`.

When a frontend is included, its API client uses a separately configured
backend URL. Update the frontend-specific URL in `.env` if the backend is
running on a different host or port.

## Available commands

- `{{packageManager}} run dev` starts the development server.
- `{{packageManager}} run build` creates a production build.
- `{{packageManager}} run lint` checks the source files.
