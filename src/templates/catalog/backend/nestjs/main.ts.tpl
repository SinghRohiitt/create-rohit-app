import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/http-exception.filter.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origins = config
    .get<string>("CORS_ORIGIN", "http://localhost:5173,http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(helmet());
  app.enableCors({ origin: origins });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(config.get<number>("PORT", 3000), "0.0.0.0");
}

void bootstrap();
