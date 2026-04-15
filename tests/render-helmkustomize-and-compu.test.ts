import { describe, it, expect } from "vitest";
import { GitopsServicemeshDiff } from "../src";

describe("GitopsServicemeshDiff", () => {
  it("should create an instance with default options", () => {
    const instance = new GitopsServicemeshDiff();
    expect(instance).toBeDefined();
  });

  it("should accept custom options", () => {
    const instance = new GitopsServicemeshDiff({ verbose: true });
    expect(instance).toBeDefined();
  });

  it("should run successfully", async () => {
    const instance = new GitopsServicemeshDiff();
    const result = await instance.run();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
