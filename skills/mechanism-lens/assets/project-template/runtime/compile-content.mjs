import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileContent, compileSourceBundle } from "../engine/compiler/index.mjs";
import { validateSceneGraph, validateSource } from "../engine/validation/index.mjs";

const root = path.resolve(process.cwd(), process.argv[2] ?? "../content");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(file) { return JSON.parse(await readFile(file, "utf8")); }
async function readOptional(file) { try { return await readJson(file); } catch (error) { if (error?.code === "ENOENT") return null; throw error; } }
function printIssues(label, issues) {
  if (issues.length === 0) return;
  console.error(label);
  for (const item of issues) console.error(`  - [${item.code}] ${item.path}: ${item.message}`);
}
async function atomicJson(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try { await rename(temp, file); } catch (error) { await unlink(temp).catch(() => {}); throw error; }
}

const source = {
  paper: await readOptional(path.join(root, "paper-ir.json")),
  code: await readOptional(path.join(root, "code-ir.json")),
  mechanism: await readJson(path.join(root, "mechanism-ir.json")),
  intent: await readJson(path.join(root, "visual-intent.json")),
  catalog: await readJson(path.join(projectRoot, "templates", "catalog.json")),
};
const sourceReport = validateSource(source);
printIssues("MechanismLens source validation failed:", sourceReport.errors);
if (sourceReport.errors.length > 0) process.exitCode = 1;
else {
  const scene = compileContent(source.mechanism, source.intent, source.catalog);
  const sceneReport = validateSceneGraph(scene);
  printIssues("MechanismLens compiled scene validation failed:", sceneReport.errors);
  if (sceneReport.errors.length > 0) process.exitCode = 1;
  else {
    const bundle = compileSourceBundle(source, source.mechanism, scene);
    await atomicJson(path.join(root, "scene-ir.json"), scene);
    await atomicJson(path.join(root, "source-bundle.json"), bundle);
    for (const warning of [...sourceReport.warnings, ...sceneReport.warnings]) console.warn(`  - [${warning.code}] ${warning.path}: ${warning.message}`);
    console.log(`Compiled ${source.mechanism.id}: ${scene.scenes.length} scenes, ${bundle.evidence.length} evidence items`);
  }
}
