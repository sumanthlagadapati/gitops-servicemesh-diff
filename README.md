# GitOps Service Mesh Diff Tool

A powerful tool for analyzing and comparing Kubernetes Service Mesh configurations across different environments using GitOps principles. Track configuration diffs, validate mesh deployments, and ensure consistency across your infrastructure.

## Table of Contents
1. [Features](#features)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)
7. [API Reference](#api-reference)
8. [Supported Resources](#supported-resources)
9. [Troubleshooting](#troubleshooting)
10. [Error Handling](#error-handling)
11. [Contributing](#contributing)
12. [License](#license)

## Features

- **Configuration Diffing**: Compare Service Mesh configurations across multiple environments
- **GitOps Integration**: Seamless integration with Git-based workflows for infrastructure as code
- **Multi-Mesh Support**: Works with Istio, Linkerd, and other popular service mesh implementations
- **Validation Engine**: Automatic validation of mesh configurations against best practices
- **CLI & API**: Both command-line and RESTful API interfaces available
- **Real-time Monitoring**: Track changes as they happen in your Git repositories

## Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **Docker**: v20.10+ (optional, for containerized deployment)
- **Git**: v2.30+ for repository access
- **kubectl**: v1.20+ (for Kubernetes cluster interaction)

## Installation

### Option 1: Local Installation

```bash
# Clone the repository
git clone https://github.com/sumanthlagadapati/gitops-servicemesh-diff.git
cd gitops-servicemesh-diff

# Install dependencies
npm install

# Run the installation script
npm run install

# Verify installation
npm run verify
```

### Option 2: Docker

```bash
# Build the Docker image
docker build -t gitops-servicemesh-diff:latest .

# Run the container
docker run -v ~/.kube/config:/root/.kube/config gitops-servicemesh-diff:latest
```

### Verify Installation

```bash
npm run verify
# Expected output: ✓ All dependencies installed correctly
```

## Quick Start

```bash
# Compare configurations between staging and production
gitops-diff compare --source staging --target production

# Validate current mesh configuration
gitops-diff validate --environment production

# Generate a detailed report
gitops-diff report --output report.json
```

## Configuration

Configuration is managed through `config.yaml`. Create this file in your project root:

```yaml
# config.yaml
meshType: istio
environments:
  staging:
    kubeconfig: ~/.kube/staging-config
    namespace: istio-system
  production:
    kubeconfig: ~/.kube/prod-config
    namespace: istio-system

git:
  repository: https://github.com/your-org/mesh-configs.git
  branch: main
  path: configs/

validation:
  enableStrictMode: true
  validateVirtualServices: true
  validateDestinationRules: true
  validateGateways: true

api:
  port: 8080
  host: localhost
  enableAuth: false
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `meshType` | string | `istio` | Service mesh type (istio, linkerd) |
| `validation.enableStrictMode` | boolean | `true` | Enable strict validation rules |
| `api.port` | number | `8080` | API server port |
| `api.enableAuth` | boolean | `false` | Enable API authentication |

## Usage Examples

### Compare Two Environments

```bash
gitops-diff compare \
  --source staging \
  --target production \
  --resource VirtualService
```

### Validate Configuration

```bash
gitops-diff validate \
  --environment production \
  --strict
```

### Generate Report

```bash
gitops-diff report \
  --from staging \
  --to production \
  --format json \
  --output diffs.json
```

## API Reference

### Compare Configurations

**Endpoint**: `POST /api/v1/mesh/diff`

**Request**:
```json
{
  "sourceEnvironment": "staging",
  "targetEnvironment": "production",
  "resourceType": "VirtualService"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "differences": [
      {
        "resource": "api-gateway",
        "type": "VirtualService",
        "changes": [
          {
            "field": "spec.hosts",
            "source": ["api.staging.example.com"],
            "target": ["api.prod.example.com"],
            "type": "modified"
          }
        ]
      }
    ],
    "summary": {
      "added": 2,
      "modified": 5,
      "removed": 0
    }
  },
  "timestamp": "2026-04-16T10:30:00Z"
}
```

### Validate Configuration

**Endpoint**: `POST /api/v1/mesh/validate`

**Request**:
```json
{
  "environment": "production",
  "strictMode": true
}
```

**Response**:
```json
{
  "status": "success",
  "valid": true,
  "data": {
    "validatedResources": 45,
    "issues": [],
    "warnings": [
      "VirtualService 'payment-svc' missing timeout specification"
    ]
  }
}
```

### Get Resource Details

**Endpoint**: `GET /api/v1/resources/{environment}/{resourceType}/{name}`

**Response**:
```json
{
  "status": "success",
  "data": {
    "name": "api-gateway",
    "type": "VirtualService",
    "environment": "production",
    "spec": {
      "hosts": ["api.prod.example.com"],
      "http": [
        {
          "match": [{"uri": {"prefix": "/v1"}}],
          "route": [{"destination": {"host": "api-service", "port": {"number": 8080}}}]
        }
      ]
    }
  }
}
```

## Supported Resources

This tool supports the following Kubernetes and Service Mesh resources:

### Istio Resources
- **VirtualService**: Traffic routing and load balancing rules
- **DestinationRule**: Load balancer settings and connection pool configurations
- **Gateway**: Ingress gateway definitions
- **PeerAuthentication**: Mutual TLS policies
- **RequestAuthentication**: Request authentication policies
- **AuthorizationPolicy**: Access control policies
- **Telemetry**: Telemetry configuration

### Kubernetes Resources
- **Service**: Kubernetes service definitions
- **Deployment**: Application deployment configurations
- **ConfigMap**: Configuration data
- **Secret**: Sensitive data storage

## Troubleshooting

### Issue: Connection refused to Kubernetes cluster

**Solution**:
```bash
# Verify kubeconfig is accessible
kubectl cluster-info --kubeconfig=~/.kube/config

# Update kubeconfig path in config.yaml
# Ensure KUBECONFIG environment variable is set
export KUBECONFIG=~/.kube/config
```

### Issue: Configuration validation fails

**Check**:
- Verify YAML syntax: `kubectl apply --dry-run=client -f config.yaml`
- Review validation errors in logs: `npm run logs`
- Disable strict mode temporarily: `validation.enableStrictMode: false`

### Issue: API port already in use

**Solution**:
```bash
# Change API port in config.yaml
api:
  port: 8081

# Or kill existing process
lsof -ti:8080 | xargs kill -9
```

## Error Handling

Detailed error documentation is available in `ERRORS.md`.

### Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | Bad Request | Verify request JSON format and required fields |
| 401 | Unauthorized | Check API authentication credentials |
| 404 | Resource Not Found | Verify environment name and resource type |
| 500 | Internal Server Error | Check logs with `npm run logs` and retry |
| 503 | Service Unavailable | Kubernetes cluster may be unreachable |

### Getting Help

- 📖 [Documentation](./docs)
- 🐛 [Report Issues](https://github.com/sumanthlagadapati/gitops-servicemesh-diff/issues)
- 💬 [Discussions](https://github.com/sumanthlagadapati/gitops-servicemesh-diff/discussions)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

Please ensure:
- Code follows the project style guide
- Tests pass: `npm run test`
- Documentation is updated

## License

MIT License - see [LICENSE](./LICENSE) file for details

---

**Questions?** Open an [issue](https://github.com/sumanthlagadapati/gitops-servicemesh-diff/issues) or start a [discussion](https://github.com/sumanthlagadapati/gitops-servicemesh-diff/discussions).