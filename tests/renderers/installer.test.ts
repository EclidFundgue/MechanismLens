import { it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

it('installs all five renderers, repeats safely, refuses edited destinations before copying', () => {
  const root = mkdtempSync(join(tmpdir(), 'pe-renderer-install-'));
  const script = resolve('skills/paper-explainer/scripts/install-renderers.mjs');
  const run = (...args: string[]) => spawnSync(process.execPath, [script, root, ...args], { encoding: 'utf8' });
  try {
    expect(run().status).toBe(1);
    mkdirSync(join(root, 'src'));
    const installed = run();
    expect(installed.stderr).toBe(''); expect(installed.status).toBe(0);
    const files = readdirSync(join(root, 'src/renderers'));
    for (const name of ['ArchitectureExecution.tsx', 'EquationWalkthrough.tsx', 'AlgorithmTrace.tsx', 'AblationComparison.tsx', 'FigureInspector.tsx']) expect(files).toContain(name);
    expect(run().status).toBe(0);
    const edited = join(root, 'src/renderers/model.ts');
    writeFileSync(edited, '// user changes');
    expect(run().status).toBe(1);
    expect(readFileSync(edited, 'utf8')).toBe('// user changes');
    expect(run('--force').status).toBe(0);
    expect(readFileSync(edited, 'utf8')).toContain('defineScene');
  } finally {
    // Only this test's mkdtemp directory is removed.
    rmSync(root, { recursive: true, force: true });
  }
});
