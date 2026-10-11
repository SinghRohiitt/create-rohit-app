import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

if (process.env.JWT_SECRET === undefined) {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-bytes-long";
}
const app = createApp();

describe("HTTP application", () => {
  it("reports health and returns a structured not-found response", async () => {
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });

    const missing = await request(app).get("/does-not-exist");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });
});
