#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), process.argv[2] ?? "../content");
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), "utf8"));
const paper = await readJson("paper-ir.json");
const storyboard = await readJson("scene-ir.json");
const errors = [];

const requireString = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") errors.push(`${label} must be a non-empty string`);
};

requireString(paper.schemaVersion, "paper.schemaVersion");
requireString(paper.paper?.id, "paper.paper.id");
requireString(paper.paper?.title, "paper.paper.title");
requireString(storyboard.schemaVersion, "scene.schemaVersion");
requireString(storyboard.paperId, "scene.paperId");
if (storyboard.paperId !== paper.paper?.id) errors.push("scene.paperId must match paper.paper.id");

const groups = ["evidence", "claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"];
const idSets = new Map();
for (const group of groups) {
  const items = paper[group] ?? [];
  if (!Array.isArray(items)) {
    errors.push(`paper.${group} must be an array`);
    continue;
  }
  const ids = new Set();
  for (const [index, item] of items.entries()) {
    requireString(item?.id, `paper.${group}[${index}].id`);
    if (ids.has(item?.id)) errors.push(`duplicate ${group} id: ${item.id}`);
    ids.add(item?.id);
  }
  idSets.set(group, ids);
}

const evidenceIds = idSets.get("evidence") ?? new Set();
const claimIds = idSets.get("claims") ?? new Set();
const checkRefs = (ids, known, label) => {
  for (const id of ids ?? []) if (!known.has(id)) errors.push(`${label} references missing id: ${id}`);
};

for (const group of ["claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"]) {
  for (const item of paper[group] ?? []) {
    checkRefs(item.evidenceIds, evidenceIds, `${group}.${item.id}.evidenceIds`);
    if ((group === "claims" || group === "contributions") && (!Array.isArray(item.evidenceIds) || item.evidenceIds.length === 0)) {
      errors.push(`${group}.${item.id}.evidenceIds must not be empty`);
    }
  }
}

if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) errors.push("scene.scenes must contain at least one scene");
const sceneIds = new Set();
const allowedTypes = new Set(["concept", "architecture_execution", "equation_walkthrough", "algorithm_trace", "ablation_comparison", "figure_inspector"]);
for (const [sceneIndex, scene] of (storyboard.scenes ?? []).entries()) {
  requireString(scene?.id, `scene.scenes[${sceneIndex}].id`);
  requireString(scene?.title, `scene.scenes[${sceneIndex}].title`);
  requireString(scene?.type, `scene.scenes[${sceneIndex}].type`);
  if (!allowedTypes.has(scene?.type)) errors.push(`scene.${scene?.id ?? sceneIndex}.type is unsupported: ${scene?.type}`);
  if (sceneIds.has(scene?.id)) errors.push(`duplicate scene id: ${scene.id}`);
  sceneIds.add(scene?.id);
  checkRefs(scene.claimIds, claimIds, `scene.${scene.id}.claimIds`);
  checkRefs(scene.evidenceIds, evidenceIds, `scene.${scene.id}.evidenceIds`);
  if (!Array.isArray(scene.steps) || scene.steps.length === 0) errors.push(`scene.${scene.id}.steps must not be empty`);
  const payloadIds = new Set();
  for (const value of Object.values(scene.payload ?? {})) {
    if (!Array.isArray(value)) continue;
    for (const item of value) if (item && typeof item.id === "string") payloadIds.add(item.id);
  }
  const stepIds = new Set();
  for (const [stepIndex, step] of (scene.steps ?? []).entries()) {
    requireString(step?.id, `scene.${scene.id}.steps[${stepIndex}].id`);
    requireString(step?.narration, `scene.${scene.id}.steps[${stepIndex}].narration`);
    if (stepIds.has(step?.id)) errors.push(`duplicate step id in ${scene.id}: ${step.id}`);
    stepIds.add(step?.id);
    checkRefs(step.evidenceIds, evidenceIds, `scene.${scene.id}.step.${step.id}.evidenceIds`);
    checkRefs(step.focusIds, payloadIds, `scene.${scene.id}.step.${step.id}.focusIds`);
  }
}

if (errors.length > 0) {
  console.error("Paper Explainer data validation failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Paper IR valid: ${paper.paper.title}`);
console.log(`Scene IR valid: ${storyboard.scenes.length} scenes / ${storyboard.scenes.reduce((n, scene) => n + scene.steps.length, 0)} steps`);
