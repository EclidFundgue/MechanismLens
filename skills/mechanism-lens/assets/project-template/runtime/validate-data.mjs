import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateData } from "../engine/validation/index.mjs";

const root = path.resolve(process.cwd(), process.argv[2] ?? "../content");
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function readJson(file) { return JSON.parse(await readFile(file, "utf8")); }
async function readOptional(file) { try { return await readJson(file); } catch (error) { if (error?.code === "ENOENT") return null; throw error; } }

const source = {
  paper: await readOptional(path.join(root, "paper-ir.json")),
  code: await readOptional(path.join(root, "code-ir.json")),
  mechanism: await readJson(path.join(root, "mechanism-ir.json")),
  intent: await readJson(path.join(root, "visual-intent.json")),
  catalog: await readJson(path.join(projectRoot, "templates", "catalog.json")),
};
const scene = await readOptional(path.join(root, "scene-ir.json"));
const report = validateData(source, scene);
for (const warning of report.warnings) console.warn(`[${warning.code}] ${warning.path}: ${warning.message}`);
for (const error of report.errors) console.error(`[${error.code}] ${error.path}: ${error.message}`);
if (report.errors.length > 0) process.exitCode = 1;
else console.log(`Validated ${source.mechanism.id}: ${report.warnings.length} warnings`);
