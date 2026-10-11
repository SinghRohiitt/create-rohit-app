{
  "dependencies": {
    "@prisma/client": "^6.19.3"
  },
  "devDependencies": {
    "prisma": "^6.19.3"
  },
  "scripts": {
    "db:generate": "prisma generate",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "postinstall": "prisma generate"
  }
}
