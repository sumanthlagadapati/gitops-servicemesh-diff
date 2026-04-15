# gitops-servicemesh-diff

Diff and validate Istio/GitOps changes with policy checks before merge and sync.

## Installation

```bash
npm install gitops-servicemesh-diff
```

## Quick Start

```typescript
import { GitopsServicemeshDiff } from "gitops-servicemesh-diff";

const instance = new GitopsServicemeshDiff();
const result = await instance.run();
console.log(result);
```

## Features

- Render Helm/Kustomize and compute semantic diffs for Istio resources
- Detect breaking traffic-policy changes (VirtualService/DestinationRule/PeerAuthentication)
- OPA/Kyverno-style rule engine for custom mesh guardrails
- GitHub Actions-compatible CLI output with annotations

## Error Handling

All errors thrown by this SDK are descriptive and use custom error classes extending `GitopsServicemeshDiffError`. No generic `throw` is used. Errors include a machine-readable `code` property for programmatic handling.

### Error Classes

- `GitopsServicemeshDiffError` (base class)
- `ConfigurationError` (misconfiguration)
- `ValidationError` (input validation failure)
- `TimeoutError` (operation exceeded time limit)

### Example: Handling Errors

```typescript
import { GitopsServicemeshDiff, GitopsServicemeshDiffError } from "gitops-servicemesh-diff";

const instance = new GitopsServicemeshDiff();
try {
  const result = await instance.renderAndDiff({ /* ... */ });
  if (!result.success) {
    // result.error is a string message
    throw new Error(result.error);
  }
  // Use result.data
} catch (err) {
  if (err instanceof GitopsServicemeshDiffError) {
    console.error("Custom error:", err.code, err.message);
  } else {
    console.error("Unknown error:", err);
  }
}
```

#### Helm/Kustomize CLI Errors

When using Helm or Kustomize rendering, errors from the CLI (e.g., missing binary, invalid chart/overlay, CLI failure, or timeout) are wrapped in a `GitopsServicemeshDiffError` with a descriptive message and code. Example error codes:

- `GITOPSSERVICEMESHDIFF_ERROR` (generic)
- `TIMEOUT_ERROR` (CLI timed out)
- `CONFIGURATION_ERROR` (invalid/missing chart or overlay path)

---

## API Reference

### `GitopsServicemeshDiff`

#### Constructor

```typescript
new GitopsServicemeshDiff(options?: GitopsServicemeshDiffOptions)
```

#### Methods

- `run()` - Execute the main operation. Returns `Promise<GitopsServicemeshDiffResult>`.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build

# Type check
npm run lint
```

## Publishing

1. Update version in `package.json`
2. Create a GitHub release with tag `v0.x.0`
3. The GitHub Action will automatically publish to npm

## License

MIT
