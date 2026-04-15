import { execa } from 'execa';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { describe, it, expect, afterAll } from 'vitest';

const CLI_PATH = path.resolve(__dirname, '../dist/cli.js');
const TMP_OLD = path.resolve(__dirname, 'tmp-old.yaml');
const TMP_NEW = path.resolve(__dirname, 'tmp-new.yaml');
const fs = require('fs');
const { execSync } = require('child_process');

describe('CLI Entrypoint', () => {
  beforeAll(() => {
    if (!fs.existsSync(CLI_PATH)) {
      // Build CLI if not present
      execSync('npm run build', { stdio: 'inherit' });
    }
  });
  afterAll(() => {
    try { unlinkSync(TMP_OLD); } catch {}
    try { unlinkSync(TMP_NEW); } catch {}
  });

  it('prints help with --help', async () => {
    const { stdout } = await execa('node', [CLI_PATH, '--help']);
    expect(stdout).toMatch(/gitops-servicemesh-diff CLI/);
    expect(stdout).toMatch(/--old/);
  });

  it('errors if required args missing', async () => {
    const { stderr, exitCode } = await execa('node', [CLI_PATH], { reject: false });
    expect(stderr).toMatch(/--old and --new are required/);
    expect(exitCode).toBe(1);
  });

  it('diffs two raw YAML manifests', async () => {
    writeFileSync(TMP_OLD, 'apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService\nmetadata:\n  name: foo\nspec:\n  hosts: [\'a\']\n');
    writeFileSync(TMP_NEW, 'apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService\nmetadata:\n  name: foo\nspec:\n  hosts: [\'b\']\n');
    const { stdout, exitCode } = await execa('node', [CLI_PATH, '--old', TMP_OLD, '--new', TMP_NEW]);
    expect(stdout).toMatch(/VirtualService/);
    expect(exitCode).toBe(1); // diff found
  });

  it('outputs GitHub Actions annotations', async () => {
    writeFileSync(TMP_OLD, 'apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService\nmetadata:\n  name: foo\nspec:\n  hosts: [\'a\']\n');
    writeFileSync(TMP_NEW, 'apiVersion: networking.istio.io/v1alpha3\nkind: VirtualService\nmetadata:\n  name: foo\nspec:\n  hosts: [\'b\']\n');
    const { stdout } = await execa('node', [CLI_PATH, '--old', TMP_OLD, '--new', TMP_NEW, '--output', 'gha'], { reject: false });
    expect(stdout).toMatch(/::warning file=VirtualService\/foo::Changed fields: spec.hosts/);
  });
});
