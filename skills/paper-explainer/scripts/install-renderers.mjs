#!/usr/bin/env node
// Cross-platform template installer; never modifies the host's package.json or chapters.
import { readdirSync, readFileSync, existsSync, statSync, mkdirSync, copyFileSync, realpathSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node install-renderers.mjs <presentation-dir> [--force]\nCopies assets/renderers to src/renderers. Existing edits require --force.');
  process.exit(0);
}
try {
  const positional = args.filter((a) => a !== '--force');
  if (positional.length !== 1 || positional[0].startsWith('--')) throw new Error('Usage: node install-renderers.mjs <presentation-dir> [--force]');
  const root = resolve(positional[0]), src = join(root, 'src');
  if (!existsSync(src) || !statSync(src).isDirectory()) throw new Error(`${src} is missing; scaffold the presentation first.`);
  const templates = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/renderers');
  const target = join(src, 'renderers');
  if (existsSync(target) && realpathSync(target) === realpathSync(templates)) throw new Error('Source and destination must differ.');
  const files = readdirSync(templates).filter((name) => statSync(join(templates, name)).isFile());
  // Preflight the whole copy: do not partially update an edited installation.
  for (const name of files) {
    const dest = join(target, name);
    if (existsSync(dest) && !readFileSync(dest).equals(readFileSync(join(templates, name))) && !args.includes('--force')) {
      throw new Error(`${dest} differs. Review local changes before using --force.`);
    }
  }
  mkdirSync(target, { recursive: true });
  for (const name of files) {
    const dest = join(target, name), original = join(templates, name);
    if (!existsSync(dest) || !readFileSync(dest).equals(readFileSync(original))) copyFileSync(original, dest);
  }
  console.log(`Installed ${files.length} renderer files in ${target}`);
  console.log('In the presentation directory: npm install katex && npm install -D @types/katex');
  console.log('Then follow references/RENDERERS.md to wire a chapter to SceneRenderer.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
