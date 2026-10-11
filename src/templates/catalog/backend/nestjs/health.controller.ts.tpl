import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly appService: AppService) {}

  @Get()
  check(): { status: "ok" } {
    return this.appService.getStatus();
  }
}
