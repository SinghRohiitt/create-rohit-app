{
  "name": "@create-rohitsingh0408-app/workspace",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently -k -n backend,frontend -c blue,green \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:frontend": "npm run dev --workspace=./frontend",
    "dev:backend": "npm run dev --workspace=./backend",
    "start:backend": "npm run start --workspace=./backend",
    "db:generate": "npm run db:generate --workspace=./backend --if-present",
    "db:migrate:dev": "npm run db:migrate:dev --workspace=./backend --if-present",
    "db:migrate:deploy": "npm run db:migrate:deploy --workspace=./backend --if-present",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "devDependencies": {
    "concurrently": "^9.2.1"
  }
}
