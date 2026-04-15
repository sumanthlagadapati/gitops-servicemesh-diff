/**
 * Custom error classes for gitops-servicemesh-diff.
 */

/**
 * Base error class for all GitopsServicemeshDiff errors.
 */
export class GitopsServicemeshDiffError extends Error {
  /** Machine-readable error code. */
  readonly code: string;

  constructor(message: string, code = "GITOPSSERVICEMESHDIFF_ERROR") {
    super(message);
    this.name = "GitopsServicemeshDiffError";
    this.code = code;
  }
}

/**
 * Raised when the SDK is misconfigured.
 */
export class ConfigurationError extends GitopsServicemeshDiffError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}

/**
 * Raised when input validation fails.
 */
export class ValidationError extends GitopsServicemeshDiffError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

/**
 * Raised when an operation exceeds its time limit.
 */
export class TimeoutError extends GitopsServicemeshDiffError {
  constructor(message: string) {
    super(message, "TIMEOUT_ERROR");
    this.name = "TimeoutError";
  }
}
