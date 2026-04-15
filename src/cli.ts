#!/usr/bin/env node
/**
 * CLI entrypoint for gitops-servicemesh-diff
 * Usage: npx gitops-servicemesh-diff [...options]
 *
 * @example
 * npx gitops-servicemesh-diff --old old.yaml --new new.yaml --renderer raw
 */
import { GitopsServicemeshDiff, GitopsServicemeshDiffError } from "./index";
import * as fs from "fs";

type Renderer = "helm" | "kustomize" | "raw";
type OutputFormat = "json" | "gha";

const VALID_RENDERERS: readonly Renderer[] = ["helm", "kustomize", "raw"];
const VALID_OUTPUTS: readonly OutputFormat[] = ["json", "gha"];

function printHelp() {
  console.log(`gitops-servicemesh-diff CLI\n\nUsage:\n  npx gitops-servicemesh-diff --old <old.yaml> --new <new.yaml> [--renderer helm|kustomize|raw] [--output json|gha]\n\nOptions:\n  --old      Path to old manifest/chart (required)\n  --new      Path to new manifest/chart (required)\n  --renderer Type of renderer: helm, kustomize, raw (default: raw)\n  --output   Output format: json, gha (default: json)\n  --help     Show this help message`);
}

function readFile(path: string): string {
  try {
    return fs.readFileSync(path, "utf8");
  } catch (err: any) {
    console.error(`Failed to read file ${path}: ${err.message}`);
    process.exit(1);
  }
}

function extractChangedFields(diff: any, prefix = ""): string[] {
  if (!diff || typeof diff !== "object") return [];
  return Object.entries(diff).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && Object.keys(v).length > 0 && !("before" in v && "after" in v)) {
      return extractChangedFields(v, path);
    }
    return [path];
  });
}

function checkHasChanges(result: any): boolean {
  return !!(result.data && ((result.data.added?.length > 0) || (result.data.removed?.length > 0) || (result.data.changed?.length > 0)));
}

function formatAsGHA(result: any): void {
  if (!result.success) {
    console.error(`::error::${result.error}`);
    process.exit(1);
  }
  result.data?.changed?.forEach((change: any) => {
    const changedFields = extractChangedFields(change.diff).join(", ");
    console.log(`::warning file=${change.kind}/${change.name}::Changed fields: ${changedFields}`);
  });
}

function parseArguments(args: string[]): { oldPath: string; newPath: string; renderer: Renderer; output: OutputFormat } {
  let oldPath = "";
  let newPath = "";
  let renderer: Renderer = "raw";
  let output: OutputFormat = "json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--old" && args[i + 1]) oldPath = args[++i];
    else if (args[i] === "--new" && args[i + 1]) newPath = args[++i];
    else if (args[i] === "--renderer" && args[i + 1]) {
      const value = args[++i];
      if (!VALID_RENDERERS.includes(value as Renderer)) {
        console.error(`Invalid renderer: ${value}. Must be one of: ${VALID_RENDERERS.join(", ")}`);
        process.exit(1);
      }
      renderer = value as Renderer;
    } else if (args[i] === "--output" && args[i + 1]) {
      const value = args[++i];
      if (!VALID_OUTPUTS.includes(value as OutputFormat)) {
        console.error(`Invalid output format: ${value}. Must be one of: ${VALID_OUTPUTS.join(", ")}`);
        process.exit(1);
      }
      output = value as OutputFormat;
    }
  }

  if (!oldPath || !newPath) {
    console.error("Error: --old and --new are required.");
    printHelp();
    process.exit(1);
  }

  return { oldPath, newPath, renderer, output };
}

interface DiffParams {
  renderer: Renderer;
  oldManifests?: string[];
  newManifests?: string[];
  oldHelm?: { chartDir: string };
  newHelm?: { chartDir: string };
  oldKustomize?: { kustomizeDir: string };
  newKustomize?: { kustomizeDir: string };
}

function buildDiffParams(oldPath: string, newPath: string, oldInput: string, newInput: string, renderer: Renderer): DiffParams {
  const params: DiffParams = { renderer };
  
  if (renderer === "raw") {
    params.oldManifests = [oldInput];
    params.newManifests = [newInput];
  } else if (renderer === "helm") {
    params.oldHelm = { chartDir: oldPath };
    params.newHelm = { chartDir: newPath };
  } else if (renderer === "kustomize") {
    params.oldKustomize = { kustomizeDir: oldPath };
    params.newKustomize = { kustomizeDir: newPath };
  }
  
  return params;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const { oldPath, newPath, renderer, output } = parseArguments(args);
  const oldInput = readFile(oldPath);
  const newInput = readFile(newPath);

  const diff = new GitopsServicemeshDiff();
  try {
    const params = buildDiffParams(oldPath, newPath, oldInput, newInput, renderer);
    const result = await diff.renderAndDiff(params);
    
    if (output === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else if (output === "gha") {
      formatAsGHA(result);
    }
    
    if (!result.success) process.exit(1);
    process.exit(checkHasChanges(result) ? 1 : 0);
  } catch (err: any) {
    if (err instanceof GitopsServicemeshDiffError) {
      console.error(`::error::${err.code}: ${err.message}`);
    } else {
      console.error("::error::", err);
    }
    process.exit(1);
  }
}

main();