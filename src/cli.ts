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

function printHelp() {
  console.log(`gitops-servicemesh-diff CLI\n\nUsage:\n  npx gitops-servicemesh-diff --old <old.yaml> --new <new.yaml> [--renderer helm|kustomize|raw] [--output json|gha]\n\nOptions:\n  --old        Path to old manifest (YAML, chart, or overlay)\n  --new        Path to new manifest (YAML, chart, or overlay)\n  --renderer   Renderer type: helm, kustomize, or raw (default: raw)\n  --output     Output format: json (default), gha (GitHub Actions annotations)\n  -h, --help   Show help\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  let oldPath = "";
  let newPath = "";
  let renderer: "helm" | "kustomize" | "raw" = "raw";
  let output: "json" | "gha" = "json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--old" && args[i + 1]) oldPath = args[++i];
    else if (args[i] === "--new" && args[i + 1]) newPath = args[++i];
    else if (args[i] === "--renderer" && args[i + 1]) renderer = args[++i] as any;
    else if (args[i] === "--output" && args[i + 1]) output = args[++i] as any;
  }

  if (!oldPath || !newPath) {
    console.error("Error: --old and --new are required.");
    printHelp();
    process.exit(1);
  }

  let oldInput = fs.readFileSync(oldPath, "utf8");
  let newInput = fs.readFileSync(newPath, "utf8");

  const diff = new GitopsServicemeshDiff();
  try {
    // Build params for all renderer types
    let params: any = { renderer };
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
    const result = await diff.renderAndDiff(params);
    if (output === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else if (output === "gha") {
      if (!result.success) {
        console.error(`::error::${result.error}`);
        process.exit(1);
      }
      if (result.data && result.data.changed) {
        for (const change of result.data.changed) {
          // Recursively get all changed field paths
          const getPaths = (obj: any, prefix = ""): string[] => {
            if (!obj || typeof obj !== "object") return [];
            return Object.entries(obj).flatMap(([k, v]) => {
              const path = prefix ? `${prefix}.${k}` : k;
              if (v && typeof v === "object" && Object.keys(v).length > 0 && !("before" in v && "after" in v)) {
                return getPaths(v, path);
              } else {
                return [path];
              }
            });
          };
          const changedFields = getPaths(change.diff).join(", ");
          console.log(`::warning file=${change.kind}/${change.name}::Changed fields: ${changedFields}`);
        }
      }
    }
    // Exit code: 1 if any changes, 0 if no changes and success, 1 if error
    if (!result.success) process.exit(1);
    const hasChanges = result.data && (
      (result.data.added && result.data.added.length > 0) ||
      (result.data.removed && result.data.removed.length > 0) ||
      (result.data.changed && result.data.changed.length > 0)
    );
    process.exit(hasChanges ? 1 : 0);
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
