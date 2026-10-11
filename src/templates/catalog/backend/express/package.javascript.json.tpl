{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.19.0" },
  "scripts": {
    "dev": "node --watch src/server.js",
    "build": "node --check src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^5.2.1",
    "helmet": "^8.1.0",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/supertest": "^6.0.3",
    "eslint": "^10.12.0",
    "globals": "^16.4.0",
    "supertest": "^7.2.1",
    "vitest": "^5.0.3"
  }
}
