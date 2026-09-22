#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateData } from "../engine/validation/index.mjs";
import { compileContent } from "../engine/compiler/index.mjs";

const root = path.resolve(process.cwd(), process.argv[2] ?? "../content");

async function readJson(name) {
  const filename = path.join(root, name);
  let source;
  try {
    source = await readFile(filename, "utf8");
  } catch (error) {
    throw new Error(`Unable to read ${filename}: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Unable to parse ${filename}: ${error.message}`);
  }
}

try {
  const paper = await readJson("paper-ir.json");
  const intent = await readJson("visual-intent.json");
  const storyboard = await readJson("scene-ir.json");
  const catalog = JSON.parse(await readFile(path.resolve(root, "../templates/catalog.json"), "utf8"));
  const report = validateData(paper, intent, storyboard, catalog);
  try {
    const expected = compileContent(paper, intent, catalog);
    if (JSON.stringify(expected) !== JSON.stringify(storyboard)) {
      report.errors.push({
        code: "GENERATED_SCENE_OUTDATED",
        path: "/build/sourceHash",
        message: "scene-ir.json is not the current deterministic compile output; run npm run compile",
        layer: "scene",
      });
    }
  } catch { /* source validation already reports malformed input */ }

  if (report.errors.length > 0) {
    console.error("Paper Explainer data validation failed:");
    for (const issue of report.errors) console.error(`  - ${issue.message}`);
    process.exitCode = 1;
  } else {
    console.log(`Paper IR + Visual Intent valid: ${paper.paper.title}`);
    console.log(`Generated Scene IR valid: ${storyboard.scenes.length} scenes / ${storyboard.scenes.reduce((total, scene) => total + scene.steps.length, 0)} steps`);
  }

  if (report.warnings.length > 0) {
    console.warn("Paper Explainer data validation warnings:");
    for (const issue of report.warnings) console.warn(`  - ${issue.message}`);
  }
} catch (error) {
  console.error(`Paper Explainer data validation failed: ${error.message}`);
  process.exitCode = 1;
}
