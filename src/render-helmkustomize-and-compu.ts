import type { GitopsServicemeshDiffOptions, GitopsServicemeshDiffResult, IstioSemanticDiffResult, IstioResource, RenderAndDiffParams, HelmRenderOptions, KustomizeRenderOptions } from "./types";
import { GitopsServicemeshDiffError } from "./errors";
import yaml from "js-yaml";
import { spawn } from "child_process";
import { existsSync } from "fs";

/**
 * GitopsServicemeshDiff - Diff and validate Istio/GitOps changes with policy checks before merge and sync.
 *
 * @example
 * ```typescript
 * import { GitopsServicemeshDiff } from "gitops-servicemesh-diff";
 *
 * const instance = new GitopsServicemeshDiff();
 * const result = await instance.run();
 * console.log(result);
 * ```
 */
export class GitopsServicemeshDiff {
  private options: GitopsServicemeshDiffOptions;

  constructor(options: GitopsServicemeshDiffOptions = {}) {
    this.options = options;
  }

  /**
   * Render Helm/Kustomize manifests and compute semantic diffs for Istio resources.
   *
   * @param params - Input parameters for rendering and diffing
   * @returns Semantic diff result
   * @example
   * ```typescript
   * // RAW YAML
   * const diff = await instance.renderAndDiff({
   *   renderer: "raw",
   *   oldManifests: ["apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService..."],
   *   newManifests: ["apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService..."],
   * });
   *
   * // HELM
   * const diff = await instance.renderAndDiff({
   *   renderer: "helm",
   *   oldHelm: { chartDir: "./charts/old", valuesFiles: ["./old-values.yaml"] },
   *   newHelm: { chartDir: "./charts/new", valuesFiles: ["./new-values.yaml"] },
   * });
   *
   * // KUSTOMIZE
   * const diff = await instance.renderAndDiff({
   *   renderer: "kustomize",
   *   oldKustomize: { kustomizeDir: "./overlays/old" },
   *   newKustomize: { kustomizeDir: "./overlays/new" },
   * });
   * ```
   */
  async renderAndDiff(params: RenderAndDiffParams): Promise<GitopsServicemeshDiffResult<IstioSemanticDiffResult>> {
    try {
      let oldManifests: string[] = [];
      let newManifests: string[] = [];
      if (params.renderer === "raw") {
        oldManifests = params.oldManifests || [];
        newManifests = params.newManifests || [];
      } else if (params.renderer === "helm") {
        oldManifests = [await renderHelm(params.oldHelm)];
        newManifests = [await renderHelm(params.newHelm)];
      } else if (params.renderer === "kustomize") {
        oldManifests = [await renderKustomize(params.oldKustomize)];
        newManifests = [await renderKustomize(params.newKustomize)];
      } else {
        throw new GitopsServicemeshDiffError("Unknown renderer type");
      }
      // Parse YAML manifests
      let oldObjs: IstioResource[] = [];
      let newObjs: IstioResource[] = [];
      try {
        oldObjs = parseIstioManifests(oldManifests);
        newObjs = parseIstioManifests(newManifests);
      } catch (yamlErr) {
        return {
          success: false,
          error: yamlErr instanceof Error ? yamlErr.message : String(yamlErr),
        };
      }
      // Compute semantic diff
      const diff = computeIstioSemanticDiff(oldObjs, newObjs);
      return { success: true, data: diff };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async run(): Promise<GitopsServicemeshDiffResult> {
    return {
      success: true,
      data: { message: "GitopsServicemeshDiff is working!" },
    };
  }
}

/**
 * Render a Helm chart to YAML manifests using the Helm CLI.
 * @param opts - Helm render options
 * @returns Rendered YAML string
 * @throws GitopsServicemeshDiffError if Helm CLI fails
 */
async function renderHelm(opts: HelmRenderOptions): Promise<string> {
  if (!existsSync(opts.chartDir)) {
    throw new GitopsServicemeshDiffError(`Helm chart directory not found: ${opts.chartDir}`);
  }
  const args = [
    "template",
    opts.releaseName || "release",
    opts.chartDir,
    "--namespace",
    opts.namespace || "default",
  ];
  if (opts.valuesFiles) {
    for (const vf of opts.valuesFiles) {
      args.push("-f", vf);
    }
  }
  if (opts.setValues) {
    for (const [k, v] of Object.entries(opts.setValues)) {
      args.push("--set", `${k}=${v}`);
    }
  }
  const output = await execCommand("helm", args);
  if (!output) throw new GitopsServicemeshDiffError("Helm template produced no output");
  return output;
}

/**
 * Render a Kustomize overlay to YAML manifests using the Kustomize CLI.
 * @param opts - Kustomize render options
 * @returns Rendered YAML string
 * @throws GitopsServicemeshDiffError if Kustomize CLI fails
 */
async function renderKustomize(opts: KustomizeRenderOptions): Promise<string> {
  if (!existsSync(opts.kustomizeDir)) {
    throw new GitopsServicemeshDiffError(`Kustomize directory not found: ${opts.kustomizeDir}`);
  }
  const output = await execCommand("kustomize", ["build", opts.kustomizeDir]);
  if (!output) throw new GitopsServicemeshDiffError("Kustomize build produced no output");
  return output;
}

/**
 * Execute a CLI command and return stdout as string.
 * @param cmd - Command to run
 * @param args - Arguments
 * @returns stdout string
 * @throws GitopsServicemeshDiffError if command fails
 */
async function execCommand(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (err) => {
      reject(new GitopsServicemeshDiffError(`${cmd} failed to start: ${err.message}`));
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new GitopsServicemeshDiffError(`${cmd} exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
    // Optional: add timeout
    setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new GitopsServicemeshDiffError(`${cmd} timed out`));
    }, 30000);
  });
}

/**
 * Parse an array of YAML manifests into IstioResource objects, filtering only Istio resources.
 */
function parseIstioManifests(manifests: string[]): IstioResource[] {
  const istioKinds = [
    "VirtualService",
    "DestinationRule",
    "PeerAuthentication",
    // Add more Istio kinds as needed
  ];
  const resources: IstioResource[] = [];
  for (const manifest of manifests) {
    const docs = yaml.loadAll(manifest);
    for (const doc of docs) {
      if (
        doc &&
        typeof doc === "object" &&
        istioKinds.includes((doc as any).kind)
      ) {
        resources.push(doc as IstioResource);
      }
    }
  }
  return resources;
}

/**
 * Compute a semantic diff between two sets of Istio resources.
 */
function computeIstioSemanticDiff(
  oldObjs: IstioResource[],
  newObjs: IstioResource[]
): IstioSemanticDiffResult {
  // Index by kind+namespace+name
  function key(r: IstioResource) {
    return `${r.kind}:${r.metadata.namespace || "default"}:${r.metadata.name}`;
  }
  const oldMap = new Map<string, IstioResource>();
  for (const r of oldObjs) oldMap.set(key(r), r);
  const newMap = new Map<string, IstioResource>();
  for (const r of newObjs) newMap.set(key(r), r);

  const added: IstioResource[] = [];
  const removed: IstioResource[] = [];
  const changed: IstioSemanticDiffResult["changed"] = [];

  for (const [k, newRes] of newMap.entries()) {
    if (!oldMap.has(k)) {
      added.push(newRes);
    } else {
      const oldRes = oldMap.get(k)!;
      const diff = diffIstioResource(oldRes, newRes);
      if (diff && Object.keys(diff).length > 0) {
        changed.push({
          kind: newRes.kind,
          name: newRes.metadata.name,
          namespace: newRes.metadata.namespace,
          before: oldRes,
          after: newRes,
          diff,
        });
      }
    }
  }
  for (const [k, oldRes] of oldMap.entries()) {
    if (!newMap.has(k)) {
      removed.push(oldRes);
    }
  }
  return { added, removed, changed };
}

/**
 * Compute a deep diff between two Istio resources (excluding metadata.uid, resourceVersion, etc).
 */
function diffIstioResource(a: IstioResource, b: IstioResource): object {
  // Shallow implementation: compare spec and metadata (excluding known volatile fields)
  function clean(r: IstioResource) {
    const { metadata, spec, ...rest } = r;
    const cleanMeta = { ...metadata };
    delete cleanMeta.uid;
    delete cleanMeta.resourceVersion;
    delete cleanMeta.generation;
    delete cleanMeta.creationTimestamp;
    return { ...rest, metadata: cleanMeta, spec };
  }
  const ca = clean(a);
  const cb = clean(b);
  // Simple deep diff (replace with a library if needed)
  return simpleDeepDiff(ca, cb);
}

/**
 * Simple deep diff implementation for objects.
 */
function simpleDeepDiff(a: any, b: any): object {
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return {};
  const diff: any = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (typeof a[key] === "object" && typeof b[key] === "object" && a[key] && b[key]) {
      const d = simpleDeepDiff(a[key], b[key]);
      if (Object.keys(d).length > 0) diff[key] = d;
    } else if (a[key] !== b[key]) {
      diff[key] = { before: a[key], after: b[key] };
    }
  }
  return diff;
}
