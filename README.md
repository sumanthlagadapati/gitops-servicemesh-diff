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

## Architecture Design

```mermaid
graph TD
    A[Input Manifests (Raw YAML, Helm, Kustomize)] --> B(Renderer)
    B --> C[Istio Resource Extractor]
    C --> D[Semantic Diff Engine]
    D --> E[Policy/Rule Engine]
    E --> F[Diff Results & Annotations]
```

- **Renderer**: Renders manifests using Helm, Kustomize, or passes raw YAML.
- **Istio Resource Extractor**: Filters for Istio CRDs (VirtualService, DestinationRule, etc).
- **Semantic Diff Engine**: Computes meaningful diffs between old/new Istio resources.
- **Policy/Rule Engine**: Applies OPA/Kyverno-style rules for mesh guardrails.
- **Diff Results & Annotations**: Outputs results, including GitHub Actions-compatible annotations.

## Features

- Render Helm/Kustomize and compute semantic diffs for Istio resources
- Detect breaking traffic-policy changes (VirtualService/DestinationRule/PeerAuthentication)
- OPA/Kyverno-style rule engine for custom mesh guardrails
- GitHub Actions-compatible CLI output with annotations

---

## CLI Usage

You can use the CLI directly with npx:

```bash
npx gitops-servicemesh-diff --old <old.yaml> --new <new.yaml> [--renderer helm|kustomize|raw] [--output json|gha]
```

### Options

- `--old`        Path to old manifest (YAML, chart, or overlay)
- `--new`        Path to new manifest (YAML, chart, or overlay)
- `--renderer`   Renderer type: `helm`, `kustomize`, or `raw` (default: `raw`)
- `--output`     Output format: `json` (default), `gha` (GitHub Actions annotations)
- `-h`, `--help` Show help

#### Example (raw YAML):
```bash
npx gitops-servicemesh-diff --old old.yaml --new new.yaml
```

#### Example (Helm):
```bash
npx gitops-servicemesh-diff --old ./charts/old --new ./charts/new --renderer helm
```

#### Example (Kustomize):
```bash
npx gitops-servicemesh-diff --old ./overlays/old --new ./overlays/new --renderer kustomize
```

### CLI Output for GitHub Actions

To annotate PRs with semantic diff results, use the `--output gha` flag:

```sh
npx gitops-servicemesh-diff --old old.yaml --new new.yaml --renderer raw
```

## Build & Publish

To build the package for publishing (outputs to `dist/`):

```sh
npm run build
```

To type-check:

```sh
npm run lint
```

To run tests:

```sh
npm test
```

To publish to npm (after build):

```sh
npm publish
```

This will print GitHub Actions annotation lines like:
```
::warning file=VirtualService/my-vs::Changed fields: spec.hosts, spec.http
```

You can use this in your workflow to surface mesh changes directly in PRs.

---

---

## GitHub Actions Integration

You can use this SDK in your GitHub Actions workflow to validate mesh changes before merge. Example workflow:

```yaml
name: Istio Mesh Diff
on:
  pull_request:
    paths:
      - 'manifests/**'
      - 'charts/**'
      - 'overlays/**'

jobs:
  mesh-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run mesh diff
        run: |
          npx tsx examples/basic-usage.ts > diff-output.json || true
          cat diff-output.json
      - name: Annotate PR with diff results
        run: |
          node scripts/annotate-gha.js diff-output.json
```

**Tip:** Use the GitHub Actions annotation format (`::error::`, `::warning::`) in your output to surface issues directly in the PR UI.

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
