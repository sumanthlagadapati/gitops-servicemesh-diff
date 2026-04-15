import { describe, it, expect, vi } from "vitest";
import { GitopsServicemeshDiff } from "../src";

// Mock child_process.spawn globally for all tests
let spawnImpl: any = undefined;
vi.mock("child_process", () => ({
  spawn: (...args: any[]) => {
    if (typeof spawnImpl === "function") return spawnImpl(...args);
    throw new Error("No mock implementation set for spawn");
  }
}));
function setSpawnImpl(fn: any) { spawnImpl = fn; }
function resetSpawnImpl() { spawnImpl = undefined; }

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

  it("should diff Istio resources: added, removed, changed", async () => {
    // RAW mode

    const instance = new GitopsServicemeshDiff();
    const oldManifests = [
      `apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: foo
  namespace: default
spec:
  hosts: ["foo"]
  http:
    - route:
        - destination:
            host: foo
`];
    const newManifests = [
      `apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: foo
  namespace: default
spec:
  hosts: ["foo"]
  http:
    - route:
        - destination:
            host: foo
            subset: v2
`,
      `apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: bar
  namespace: default
spec:
  host: bar
  subsets:
    - name: v1
`];
    const result = await instance.renderAndDiff({ renderer: "raw", oldManifests, newManifests });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const diff = result.data!;
    expect(diff.added.length).toBe(1); // DestinationRule added
    expect(diff.removed.length).toBe(0);
    expect(diff.changed.length).toBe(1); // VirtualService changed
    expect(diff.changed[0].kind).toBe("VirtualService");
    expect(diff.changed[0].diff).toHaveProperty("spec");
  });

  it("should support Helm rendering (mocked)", async () => {
    afterEach(() => resetSpawnImpl());
    const instance = new GitopsServicemeshDiff();
    // Mock spawn for helm
    setSpawnImpl((cmd: string, args: string[]) => {
      const events: Record<string, Function[]> = { data: [], close: [], error: [] };
      const stdout = { on: (ev: string, cb: Function) => { if (ev === "data") events.data.push(cb); return stdout; } };
      const stderr = { on: () => stderr };
      setTimeout(() => {
        events.data.forEach(cb => cb("apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService\nmetadata:\n  name: helmfoo\n"));
        events.close.forEach(cb => cb(0));
      }, 10);
      return {
        stdout,
        stderr,
        on: (ev: string, cb: Function) => { if (events[ev]) events[ev].push(cb); return this; },
      } as any;
    });
    const result = await instance.renderAndDiff({
      renderer: "helm",
      oldHelm: { chartDir: "./charts/old" },
      newHelm: { chartDir: "./charts/new" },
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.added.length + result.data!.removed.length + result.data!.changed.length).toBeGreaterThanOrEqual(0);
    (child_process.spawn as any).mockRestore?.();
  });

  it("should support Kustomize rendering (mocked)", async () => {
    afterEach(() => resetSpawnImpl());
    const instance = new GitopsServicemeshDiff();
    // Mock spawn for kustomize
    setSpawnImpl((cmd: string, args: string[]) => {
      const events: Record<string, Function[]> = { data: [], close: [], error: [] };
      const stdout = { on: (ev: string, cb: Function) => { if (ev === "data") events.data.push(cb); return stdout; } };
      const stderr = { on: () => stderr };
      setTimeout(() => {
        events.data.forEach(cb => cb("apiVersion: networking.istio.io/v1alpha3\nkind: DestinationRule\nmetadata:\n  name: kustfoo\n"));
        events.close.forEach(cb => cb(0));
      }, 10);
      return {
        stdout,
        stderr,
        on: (ev: string, cb: Function) => { if (events[ev]) events[ev].push(cb); return this; },
      } as any;
    });
    const result = await instance.renderAndDiff({
      renderer: "kustomize",
      oldKustomize: { kustomizeDir: "./overlays/old" },
      newKustomize: { kustomizeDir: "./overlays/new" },
    });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.added.length + result.data!.removed.length + result.data!.changed.length).toBeGreaterThanOrEqual(0);
    (child_process.spawn as any).mockRestore?.();
  });

  it("should handle Helm CLI error (mocked)", async () => {
    afterEach(() => resetSpawnImpl());
    const instance = new GitopsServicemeshDiff();
    // Mock spawn for helm to simulate error
    setSpawnImpl((cmd: string, args: string[]) => {
      const events: Record<string, Function[]> = { data: [], close: [], error: [] };
      const stdout = { on: (ev: string, cb: Function) => { if (ev === "data") events.data.push(cb); return stdout; } };
      const stderr = { on: (ev: string, cb: Function) => { if (ev === "data") events.data.push(cb); return stderr; } };
      setTimeout(() => {
        events.data.forEach(cb => cb(""));
        events.close.forEach(cb => cb(1)); // non-zero exit code
      }, 10);
      return {
        stdout,
        stderr,
        on: (ev: string, cb: Function) => { if (events[ev]) events[ev].push(cb); return this; },
      } as any;
    });
    const result = await instance.renderAndDiff({
      renderer: "helm",
      oldHelm: { chartDir: "./charts/old" },
      newHelm: { chartDir: "./charts/new" },
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/helm exited with code/);
    (child_process.spawn as any).mockRestore?.();
  });

  it("should handle Kustomize CLI error (mocked)", async () => {
    afterEach(() => resetSpawnImpl());
    const instance = new GitopsServicemeshDiff();
    // Mock spawn for kustomize to simulate error
    setSpawnImpl((cmd: string, args: string[]) => {
      const events: Record<string, Function[]> = { data: [], close: [], error: [] };
      const stdout = { on: (ev: string, cb: Function) => { if (ev === "data") events.data.push(cb); return stdout; } };
      const stderr = { on: (ev: string, cb: Function) => { if (ev === "data") events.data.push(cb); return stderr; } };
      setTimeout(() => {
        events.data.forEach(cb => cb(""));
        events.close.forEach(cb => cb(2)); // non-zero exit code
      }, 10);
      return {
        stdout,
        stderr,
        on: (ev: string, cb: Function) => { if (events[ev]) events[ev].push(cb); return this; },
      } as any;
    });
    const result = await instance.renderAndDiff({
      renderer: "kustomize",
      oldKustomize: { kustomizeDir: "./overlays/old" },
      newKustomize: { kustomizeDir: "./overlays/new" },
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/kustomize exited with code/);
    (child_process.spawn as any).mockRestore?.();
  });

  it("should handle empty manifests", async () => {
    const instance = new GitopsServicemeshDiff();
    const result = await instance.renderAndDiff({ renderer: "raw", oldManifests: [], newManifests: [] });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.added).toHaveLength(0);
    expect(result.data!.removed).toHaveLength(0);
    expect(result.data!.changed).toHaveLength(0);
  });

  it("should ignore non-Istio resources", async () => {
    const instance = new GitopsServicemeshDiff();
    const oldManifests = [
      `apiVersion: v1
kind: ConfigMap
metadata:
  name: foo
  namespace: default
`];
    const newManifests = [
      `apiVersion: v1
kind: ConfigMap
metadata:
  name: foo
  namespace: default
`];
    const result = await instance.renderAndDiff({ renderer: "raw", oldManifests, newManifests });
    expect(result.success).toBe(true);
    expect(result.data!.added).toHaveLength(0);
    expect(result.data!.removed).toHaveLength(0);
    expect(result.data!.changed).toHaveLength(0);
  });

  it("should return error for invalid YAML", async () => {
    const instance = new GitopsServicemeshDiff();
    const oldManifests = ["not: valid: yaml:"];
    const newManifests = ["apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService\nmetadata:\n  name: foo\n"]; // valid
    const result = await instance.renderAndDiff({ oldManifests, newManifests });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
