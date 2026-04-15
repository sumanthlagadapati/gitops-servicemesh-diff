/**
 * Configuration options for GitopsServicemeshDiff.
 */
/**
 * Supported manifest renderer types.
 */
export type RendererType = "helm" | "kustomize" | "raw";

/**
 * Options for rendering Helm charts.
 */
export interface HelmRenderOptions {
  /** Path to the Helm chart directory */
  chartDir: string;
  /** Optional values file paths */
  valuesFiles?: string[];
  /** Optional set values (key=value) */
  setValues?: Record<string, string | number | boolean>;
  /** Release name (default: "release") */
  releaseName?: string;
  /** Namespace (default: "default") */
  namespace?: string;
}

/**
 * Options for rendering Kustomize overlays.
 */
export interface KustomizeRenderOptions {
  /** Path to the Kustomization directory */
  kustomizeDir: string;
}

export interface GitopsServicemeshDiffOptions {
  /**
   * Enable verbose logging for debugging.
   * @default false
   */
  verbose?: boolean;

  /**
   * Configuration for: Render Helm/Kustomize and compute semantic diffs for Istio resources
   */
  feature1?: Record<string, unknown>;

  /**
   * Configuration for: Detect breaking traffic-policy changes (VirtualService/DestinationRule/PeerAuthentication)
   */
  feature2?: Record<string, unknown>;

  /**
   * Configuration for: OPA/Kyverno-style rule engine for custom mesh guardrails
   */
  feature3?: Record<string, unknown>;

  /**
   * Configuration for: GitHub Actions-compatible CLI output with annotations
   */
  feature4?: Record<string, unknown>;
}

/**
 * Parameters for renderAndDiff.
 */
export type RenderAndDiffParams =
  | {
      renderer: "raw";
      oldManifests: string[];
      newManifests: string[];
    }
  | {
      renderer: "helm";
      oldHelm: HelmRenderOptions;
      newHelm: HelmRenderOptions;
    }
  | {
      renderer: "kustomize";
      oldKustomize: KustomizeRenderOptions;
      newKustomize: KustomizeRenderOptions;
    };

/**
 * Result returned by GitopsServicemeshDiff operations.
 */
export interface GitopsServicemeshDiffResult<T = unknown> {
  /** Whether the operation succeeded. */
  success: boolean;
  /** The result data, if successful. */
  data?: T;
  /** Error message, if the operation failed. */
  error?: string;
}

/**
 * Semantic diff result for Istio resources.
 */
export interface IstioSemanticDiffResult {
  /** List of added Istio resources */
  added: IstioResource[];
  /** List of removed Istio resources */
  removed: IstioResource[];
  /** List of changed Istio resources with before/after */
  changed: Array<{
    kind: string;
    name: string;
    namespace?: string;
    before: IstioResource;
    after: IstioResource;
    diff: object;
  }>;
}

/**
 * Minimal representation of an Istio resource.
 */
export interface IstioResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    [key: string]: unknown;
  };
  spec?: Record<string, unknown>;
  [key: string]: unknown;
}

