#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

function usage() {
  console.log(`Usage:
  node scaffold-project.mjs <output-dir> [--mode paper|code|paper-code]
    [--title <title>] [--source <paper-or-repository-url>]
    [--repository <repository-url-or-path>] [--question <mechanism-question>]

Creates a self-contained MechanismLens project. URL repositories are shallow-
cloned into sources/code/repository by the code intake and retained there.`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) { usage(); process.exit(0); }

const targetArg = args[0];
let mode = "paper", title = "Untitled explanation", source = "", repository = "", question = "Explain how this mechanism works.";
for (let index = 1; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--mode") mode = args[++index] ?? mode;
  else if (arg.startsWith("--mode=")) mode = arg.slice("--mode=".length);
  else if (arg === "--title") title = args[++index] ?? title;
  else if (arg.startsWith("--title=")) title = arg.slice("--title=".length);
  else if (arg === "--source") source = args[++index] ?? source;
  else if (arg.startsWith("--source=")) source = arg.slice("--source=".length);
  else if (arg === "--repository") repository = args[++index] ?? repository;
  else if (arg.startsWith("--repository=")) repository = arg.slice("--repository=".length);
  else if (arg === "--question") question = args[++index] ?? question;
  else if (arg.startsWith("--question=")) question = arg.slice("--question=".length);
  else throw new Error(`Unknown argument: ${arg}`);
}
if (!new Set(["paper", "code", "paper-code"]).has(mode)) throw new Error(`Unsupported mode: ${mode}`);
if (mode === "code" && !repository) repository = source;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "../assets/project-template");
const targetDir = path.resolve(process.cwd(), targetArg);

async function assertEmptyOrMissing(dir) {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) throw new Error(`Target exists and is not a directory: ${dir}`);
    if ((await readdir(dir)).length > 0) throw new Error(`Target directory is not empty: ${dir}`);
  } catch (error) { if (error?.code === "ENOENT") return; throw error; }
}

function run(command, commandArgs, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function runCodeIntake(input) {
  const script = path.join(scriptDir, "intake-code.py");
  const tail = [script, input, targetDir, "--question", question, "--title", title];
  const candidates = process.platform === "win32" ? [["py", ["-3", ...tail]], ["python", tail]] : [["python3", tail], ["python", tail]];
  let missing;
  for (const [command, commandArgs] of candidates) {
    try { await run(command, commandArgs, targetDir); return; }
    catch (error) { if (error?.code === "ENOENT") { missing = error; continue; } throw error; }
  }
  throw new Error(`Python is required for Code Intake: ${missing?.message ?? "no Python executable found"}`);
}

await assertEmptyOrMissing(targetDir);
await mkdir(targetDir, { recursive: true });
await cp(templateDir, targetDir, { recursive: true, force: false });
await mkdir(path.join(targetDir, "sources"), { recursive: true });

const paperIrPath = path.join(targetDir, "content", "paper-ir.json");
const mechanismPath = path.join(targetDir, "content", "mechanism-ir.json");
if (mode !== "code") {
  const paperIr = JSON.parse(await readFile(paperIrPath, "utf8"));
  paperIr.paper.title = title;
  paperIr.paper.originalUrl = source;
  paperIr.paper.pdfUrl = source.includes("arxiv.org/abs/") ? source.replace("/abs/", "/pdf/") : source;
  await writeFile(paperIrPath, `${JSON.stringify(paperIr, null, 2)}\n`);
}
const mechanism = JSON.parse(await readFile(mechanismPath, "utf8"));
mechanism.title = title;
mechanism.question = question;
await writeFile(mechanismPath, `${JSON.stringify(mechanism, null, 2)}\n`);

if (mode === "code") await unlink(paperIrPath);
if (repository) await runCodeIntake(repository);

if (mode === "paper") {
  await run(process.execPath, [path.join(targetDir, "runtime", "compile-content.mjs"), path.join(targetDir, "content")], targetDir);
} else {
  await unlink(path.join(targetDir, "content", "scene-ir.json")).catch(() => {});
  await unlink(path.join(targetDir, "content", "source-bundle.json")).catch(() => {});
}

if (process.platform !== "win32") {
  const { chmod } = await import("node:fs/promises");
  await chmod(path.join(targetDir, "open.sh"), 0o755);
  await chmod(path.join(targetDir, "open.command"), 0o755);
}

console.log(`Created: ${targetDir}`);
console.log(`Mode: ${mode}`);
if (mode !== "paper") console.log("Replace the demonstration Mechanism IR and Visual Intent with the code-grounded explanation before building.");
console.log(`Build: node "${path.join(scriptDir, "build-project.mjs")}" "${targetDir}"`);
