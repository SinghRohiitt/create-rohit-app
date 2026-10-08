import { afterEach, describe, expect, it, vi } from "vitest";
import { showWelcome } from "./welcome.js";

describe("showWelcome", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints a welcome message", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    showWelcome();

    expect(log).toHaveBeenCalledWith("Welcome to create-rohit-app!");
    expect(log).toHaveBeenCalledWith(
      "Your next full-stack application starts here.",
    );
  });

  it("prints the requested project name when provided", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    showWelcome("my-app");

    expect(log).toHaveBeenCalledWith("Project name: my-app");
  });
});
