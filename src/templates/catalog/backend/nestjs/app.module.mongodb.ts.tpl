import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { validateEnvironment } from "./config/environment.validation.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>("DATABASE_URL"),
      }),
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
