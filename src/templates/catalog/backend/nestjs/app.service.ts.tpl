import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getStatus(): { status: "ok" } {
    return { status: "ok" };
  }
}
