import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { AppController } from "../src/app.controller.js";
import { AppService } from "../src/app.service.js";

describe("AppController", () => {
  it("returns the generated application name and status", async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    const controller = module.get(AppController);

    expect(controller.getRoot()).toEqual({ name: "{{projectName}}", status: "ok" });
  });
});
