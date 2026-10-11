import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PrismaModule } from "./database/prisma.module.js";
import { validateEnvironment } from "./config/environment.validation.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
