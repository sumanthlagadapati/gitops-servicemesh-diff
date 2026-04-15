/**
 * gitops-servicemesh-diff
 * Diff and validate Istio/GitOps changes with policy checks before merge and sync.
 */

export { GitopsServicemeshDiff } from "./render-helmkustomize-and-compu";
export type { GitopsServicemeshDiffOptions, GitopsServicemeshDiffResult } from "./types";
export { GitopsServicemeshDiffError, ConfigurationError, ValidationError } from "./errors";
