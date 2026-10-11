{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.19.0" },
  "scripts": {
    "dev": "npm run start:dev",
    "start:dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/src/main.js",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^11.1.6",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.1.6",
    "@nestjs/platform-express": "^11.1.6",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.2",
    "dotenv": "^16.6.1",
    "helmet": "^8.1.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@nestjs/testing": "^11.1.6",
    "@types/node": "^26.6.4",
    "@types/express": "^5.0.3",
    "@types/supertest": "^6.0.3",
    "eslint": "^10.12.0",
    "globals": "^16.4.0",
    "supertest": "^7.2.1",
    "tsx": "^4.23.15",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.71.1",
    "vitest": "^5.0.3"
  }
}
