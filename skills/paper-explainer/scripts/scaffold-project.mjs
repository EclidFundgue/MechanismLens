#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

function usage() {
  console.log(`Usage:
  node scaffold-project.mjs <output-dir> [--title <paper-title>] [--source <url>]

Creates a self-contained paper-explainer project. The target must be empty or
missing; existing files are never overwritten.`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
  usage();
  process.exit(0);
}

const targetArg = args[0];
let title = "Untitled paper";
let source = "";
for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--title") title = args[++index] ?? title;
  else if (arg.startsWith("--title=")) title = arg.slice("--title=".length);
  else if (arg === "--source") source = args[++index] ?? source;
  else if (arg.startsWith("--source=")) source = arg.slice("--source=".length);
  else throw new Error(`Unknown argument: ${arg}`);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "../assets/project-template");
const targetDir = path.resolve(process.cwd(), targetArg);

async function assertEmptyOrMissing(dir) {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) throw new Error(`Target exists and is not a directory: ${dir}`);
    const entries = await readdir(dir);
    if (entries.length > 0) throw new Error(`Target directory is not empty: ${dir}`);
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

await assertEmptyOrMissing(targetDir);
await mkdir(targetDir, { recursive: true });
// The destination root is created just above so chmod and metadata handling are
// consistent on every platform. Individual template files still never exist at
// this point because assertEmptyOrMissing rejected non-empty targets.
await cp(templateDir, targetDir, { recursive: true, force: false });

const paperIrPath = path.join(targetDir, "content", "paper-ir.json");
const paperIr = JSON.parse(await readFile(paperIrPath, "utf8"));
paperIr.paper.title = title;
paperIr.paper.originalUrl = source;
paperIr.paper.pdfUrl = source.includes("arxiv.org/abs/")
  ? source.replace("/abs/", "/pdf/")
  : source;
await writeFile(paperIrPath, `${JSON.stringify(paperIr, null, 2)}\n`);

if (process.platform !== "win32") {
  const { chmod } = await import("node:fs/promises");
  await chmod(path.join(targetDir, "open.sh"), 0o755);
  await chmod(path.join(targetDir, "open.command"), 0o755);
}

console.log(`Created: ${targetDir}`);
console.log("Next:");
console.log("  1. Replace content/paper-ir.json and content/scene-ir.json");
console.log(`  2. node "${path.join(scriptDir, "build-project.mjs")}" "${targetDir}"`);
console.log("  3. Double-click open.cmd (Windows) or open.command (macOS), or run ./open.sh (Linux)");
