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
