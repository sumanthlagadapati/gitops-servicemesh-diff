/**
 * Configuration options for GitopsServicemeshDiff.
 */
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
