#!/usr/bin/env node

import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileContent } from "../engine/compiler/index.mjs";
import { validateSceneGraph, validateSource } from "../engine/validation/index.mjs";

const root = path.resolve(process.cwd(), process.argv[2] ?? "../content");
const templateRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

function printIssues(title, issues) {
  if (issues.length === 0) return;
  console.error(title);
  for (const issue of issues) console.error(`  - [${issue.code}] ${issue.path}: ${issue.message}`);
}

function readableScript(intent) {
  const lines = ["# Script", "", "Generated from `visual-intent.json`. Do not edit this copy.", ""];
  for (const scene of intent.scenes) {
    lines.push(`## ${scene.title} \`${scene.id}\``, "");
    for (const step of scene.steps) lines.push(`### ${step.title ?? step.goal ?? step.id} \`${step.id}\``, "", step.narration, "");
  }
  return `${lines.join("\n").trim()}\n`;
}

function readableOutline(intent) {
  const lines = ["# Outline", "", "Generated from `visual-intent.json`. Do not edit this copy.", ""];
  for (const scene of intent.scenes) {
    lines.push(`- ${scene.title} \`${scene.id}\``);
    for (const step of scene.steps) lines.push(`  - ${step.title ?? step.goal ?? step.id} \`${step.id}\``);
  }
  return `${lines.join("\n")}\n`;
}

try {
  const paper = await readJson(path.join(root, "paper-ir.json"));
  const intent = await readJson(path.join(root, "visual-intent.json"));
  const catalog = await readJson(path.join(templateRoot, "templates", "catalog.json"));
  const sourceReport = validateSource(paper, intent, catalog);
  printIssues("MechanismLens source validation failed:", sourceReport.errors);
  if (sourceReport.errors.length > 0) process.exitCode = 1;
  else {
    const scene = compileContent(paper, intent, catalog);
    const sceneReport = validateSceneGraph(scene);
    printIssues("MechanismLens compiled scene validation failed:", sceneReport.errors);
    if (sceneReport.errors.length > 0) process.exitCode = 1;
    else {
      const destination = path.join(root, "scene-ir.json");
      const temporary = `${destination}.tmp`;
      await writeFile(temporary, `${JSON.stringify(scene, null, 2)}\n`, "utf8");
      await rename(temporary, destination);
      await writeFile(path.join(root, "script.md"), readableScript(intent), "utf8");
      await writeFile(path.join(root, "outline.md"), readableOutline(intent), "utf8");
      console.log(`Compiled Scene IR: ${scene.scenes.length} scenes / ${scene.scenes.reduce((sum, item) => sum + item.steps.length, 0)} steps`);
      for (const warning of [...sourceReport.warnings, ...sceneReport.warnings]) console.warn(`  - [${warning.code}] ${warning.path}: ${warning.message}`);
    }
  }
} catch (error) {
  console.error(`MechanismLens compilation failed: ${error.message}`);
  process.exitCode = 1;
}
