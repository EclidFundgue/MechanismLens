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
    for (const item of value) if (item && typeof item.id === "string") {
      if (payloadIds.has(item.id)) errors.push(`scene.${scene.id}.payload contains duplicate id: ${item.id}`);
      payloadIds.add(item.id);
    }
  }
  const payload = scene.payload ?? {};
  const ids = (key) => new Set(Array.isArray(payload[key]) ? payload[key].map((item) => item?.id) : []);
  const nodes = ids("nodes"), parts = ids("parts"), items = ids("items"), regions = ids("regions");
  const edges = new Map((Array.isArray(payload.edges) ? payload.edges : []).map((edge) => [edge.id ?? `${edge.from}->${edge.to}`, edge]));
  for (const [id, edge] of edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) errors.push(`scene.${scene.id}.edge.${id} references missing node`);
  }
  if (scene.type === "architecture_execution") for (const node of payload.nodes ?? []) {
    if ([node.x, node.y, node.width, node.height].some((value) => value !== undefined)) {
      if (![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 16 || node.height <= 8 || node.x < 0 || node.y < 0 || node.x + node.width > 960 || node.y + node.height > 480) {
        errors.push(`scene.${scene.id}.node.${node.id} needs valid bounds inside 960x480`);
      }
    }
  }
  if (scene.type === "ablation_comparison" && payload.metric) {
    const metric = payload.metric;
    if (typeof metric.label !== "string" || !["higher", "lower"].includes(metric.direction) || !Number.isInteger(metric.decimals) || metric.decimals < 0 || metric.decimals > 6 || typeof metric.unit !== "string") errors.push(`scene.${scene.id}.metric is invalid`);
    if (!items.has(payload.baselineId)) errors.push(`scene.${scene.id}.baselineId references missing item`);
  }
  if (scene.type === "ablation_comparison") for (const item of payload.items ?? []) {
    if (!Number.isFinite(item.value)) errors.push(`scene.${scene.id}.item.${item.id}.value must be finite`);
  }
  if (scene.type === "figure_inspector" && payload.image) {
    const image = payload.image;
    if (typeof image.src !== "string" || !image.src.trim() || typeof image.alt !== "string" || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0) errors.push(`scene.${scene.id}.image needs src, alt and positive original dimensions`);
    for (const region of payload.regions ?? []) {
      if (![region.x, region.y, region.width, region.height].every(Number.isFinite) || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 || region.x + region.width > 1 + 1e-9 || region.y + region.height > 1 + 1e-9) errors.push(`scene.${scene.id}.region.${region.id} must fit within 0..1`);
    }
  }
  const stepIds = new Set();
  for (const [stepIndex, step] of (scene.steps ?? []).entries()) {
    requireString(step?.id, `scene.${scene.id}.steps[${stepIndex}].id`);
    requireString(step?.narration, `scene.${scene.id}.steps[${stepIndex}].narration`);
    if (stepIds.has(step?.id)) errors.push(`duplicate step id in ${scene.id}: ${step.id}`);
    stepIds.add(step?.id);
    checkRefs(step.evidenceIds, evidenceIds, `scene.${scene.id}.step.${step.id}.evidenceIds`);
    checkRefs(step.focusIds, payloadIds, `scene.${scene.id}.step.${step.id}.focusIds`);
    const visual = step.visual;
    if (visual !== undefined && (!visual || typeof visual !== "object" || Array.isArray(visual))) {
      errors.push(`scene.${scene.id}.step.${step.id}.visual must be an object`);
      continue;
    }
    if (!visual) continue;
    for (const [key, known] of [["visibleNodeIds", nodes], ["visiblePartIds", parts], ["visibleItemIds", items]]) {
      if (visual[key] !== undefined && !Array.isArray(visual[key])) errors.push(`scene.${scene.id}.step.${step.id}.${key} must be an array`);
      else checkRefs(visual[key], known, `scene.${scene.id}.step.${step.id}.${key}`);
    }
    if (visual.activeEdgeIds !== undefined && !Array.isArray(visual.activeEdgeIds)) errors.push(`scene.${scene.id}.step.${step.id}.activeEdgeIds must be an array`);
    else checkRefs(visual.activeEdgeIds, new Set(edges.keys()), `scene.${scene.id}.step.${step.id}.activeEdgeIds`);
    if (visual.visibleNodeIds && visual.activeEdgeIds) for (const id of visual.activeEdgeIds) {
      const edge = edges.get(id);
      if (edge && (!visual.visibleNodeIds.includes(edge.from) || !visual.visibleNodeIds.includes(edge.to))) errors.push(`scene.${scene.id}.step.${step.id}.active edge ${id} has invisible endpoint`);
    }
    if (visual.visiblePartIds) for (const id of step.focusIds ?? []) if (parts.has(id) && !visual.visiblePartIds.includes(id)) errors.push(`scene.${scene.id}.step.${step.id}.focus ${id} is hidden`);
    if (visual.visibleNodeIds) for (const id of step.focusIds ?? []) if (nodes.has(id) && !visual.visibleNodeIds.includes(id)) errors.push(`scene.${scene.id}.step.${step.id}.focus ${id} is hidden`);
    if (visual.visibleItemIds) {
      if (payload.metric && !visual.visibleItemIds.includes(payload.baselineId)) errors.push(`scene.${scene.id}.step.${step.id}.baseline must stay visible`);
      for (const id of step.focusIds ?? []) if (items.has(id) && !visual.visibleItemIds.includes(id)) errors.push(`scene.${scene.id}.step.${step.id}.focus ${id} is hidden`);
    }
    if (visual.tex !== undefined && (typeof visual.tex !== "string" || !visual.tex.trim())) errors.push(`scene.${scene.id}.step.${step.id}.tex must not be empty`);
    if (visual.variables !== undefined) {
      if (!visual.variables || typeof visual.variables !== "object" || Array.isArray(visual.variables)) errors.push(`scene.${scene.id}.step.${step.id}.variables must be an object`);
      else for (const [name, value] of Object.entries(visual.variables)) if (!name.trim() || !["string", "number", "boolean"].includes(typeof value) || (typeof value === "number" && !Number.isFinite(value))) errors.push(`scene.${scene.id}.step.${step.id}.variable.${name} is invalid`);
    }
    if (visual.regionId !== undefined && visual.regionId !== null && !regions.has(visual.regionId)) errors.push(`scene.${scene.id}.step.${step.id}.regionId references missing region`);
  }
}

if (errors.length > 0) {
  console.error("Paper Explainer data validation failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Paper IR valid: ${paper.paper.title}`);
console.log(`Scene IR valid: ${storyboard.scenes.length} scenes / ${storyboard.scenes.reduce((n, scene) => n + scene.steps.length, 0)} steps`);
