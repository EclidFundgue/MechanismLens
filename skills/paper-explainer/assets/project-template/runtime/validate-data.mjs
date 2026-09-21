#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), process.argv[2] ?? "../content");
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), "utf8"));
const paper = await readJson("paper-ir.json");
const storyboard = await readJson("scene-ir.json");
const errors = [];

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
const requireString = (value, label) => { if (typeof value !== "string" || value.trim() === "") errors.push(`${label} must be a non-empty string`); };
const requireFinite = (value, label) => { if (typeof value !== "number" || !Number.isFinite(value)) errors.push(`${label} must be finite`); };
const checkRefs = (ids, known, label) => {
  if (ids === undefined) return;
  if (!isStringArray(ids)) { errors.push(`${label} must be an array of ids`); return; }
  if (new Set(ids).size !== ids.length) errors.push(`${label} must not contain duplicate ids`);
  for (const id of ids) if (!known.has(id)) errors.push(`${label} references missing id: ${id}`);
};
const idsOf = (items, label) => {
  const result = new Set();
  if (!Array.isArray(items)) { errors.push(`${label} must be an array`); return result; }
  for (const [index, item] of items.entries()) {
    requireString(item?.id, `${label}[${index}].id`);
    if (result.has(item?.id)) errors.push(`duplicate ${label} id: ${item?.id}`);
    result.add(item?.id);
  }
  return result;
};

requireString(paper.schemaVersion, "paper.schemaVersion");
requireString(paper.paper?.id, "paper.paper.id");
requireString(paper.paper?.title, "paper.paper.title");
requireString(storyboard.schemaVersion, "scene.schemaVersion");
requireString(storyboard.paperId, "scene.paperId");
if (storyboard.paperId !== paper.paper?.id) errors.push("scene.paperId must match paper.paper.id");

const groups = ["evidence", "claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"];
const idSets = new Map();
for (const group of groups) idSets.set(group, idsOf(paper[group], `paper.${group}`));
const evidenceIds = idSets.get("evidence") ?? new Set(), claimIds = idSets.get("claims") ?? new Set();
for (const group of ["claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"]) {
  for (const item of paper[group] ?? []) {
    checkRefs(item.evidenceIds, evidenceIds, `${group}.${item.id}.evidenceIds`);
    if ((group === "claims" || group === "contributions") && (!Array.isArray(item.evidenceIds) || item.evidenceIds.length === 0)) errors.push(`${group}.${item.id}.evidenceIds must not be empty`);
  }
}

function validateArchitecture(scene, payload, steps) {
  const nodes = idsOf(payload.nodes, `scene.${scene.id}.payload.nodes`);
  const edges = new Set();
  if (!Array.isArray(payload.edges)) errors.push(`scene.${scene.id}.payload.edges must be an array`);
  for (const [index, edge] of (payload.edges ?? []).entries()) {
    // Older focus-only scenes did not assign IDs to their informational edges.
    // IDs become mandatory only when a step wants to activate an edge.
    if (edge?.id === undefined) continue;
    requireString(edge.id, `scene.${scene.id}.payload.edges[${index}].id`);
    if (edges.has(edge.id)) errors.push(`duplicate scene.${scene.id}.payload.edges id: ${edge.id}`);
    edges.add(edge.id);
  }
  for (const node of payload.nodes ?? []) {
    requireString(node?.label, `scene.${scene.id}.node.${node?.id}.label`);
    const bounds = [node?.x, node?.y, node?.width, node?.height];
    if (bounds.some((value) => value !== undefined)) {
      bounds.forEach((value, index) => requireFinite(value, `scene.${scene.id}.node.${node?.id}.bounds[${index}]`));
      if (node.x < 0 || node.y < 0 || node.width <= 0 || node.height <= 0 || node.x + node.width > 960 || node.y + node.height > 480) errors.push(`scene.${scene.id}.node.${node.id} must fit inside a 960x480 graph`);
    }
  }
  for (const edge of payload.edges ?? []) {
    checkRefs([edge?.from], nodes, `scene.${scene.id}.edge.${edge?.id}.from`);
    checkRefs([edge?.to], nodes, `scene.${scene.id}.edge.${edge?.id}.to`);
    if (edge?.from === edge?.to) errors.push(`scene.${scene.id}.edge.${edge?.id} must not self-reference`);
  }
  for (const step of steps) {
    const state = step.state ?? {}, visible = new Set(state.visibleNodeIds ?? [...nodes]);
    checkRefs(state.visibleNodeIds, nodes, `scene.${scene.id}.step.${step.id}.state.visibleNodeIds`);
    checkRefs(step.focusIds?.filter((id) => nodes.has(id)), visible, `scene.${scene.id}.step.${step.id}.focusIds`);
    checkRefs(state.activeEdgeIds, edges, `scene.${scene.id}.step.${step.id}.state.activeEdgeIds`);
    for (const edge of payload.edges ?? []) if ((state.activeEdgeIds ?? []).includes(edge.id) && (!visible.has(edge.from) || !visible.has(edge.to))) errors.push(`scene.${scene.id}.step.${step.id} activates edge ${edge.id} with an invisible endpoint`);
  }
}

function validateEquation(scene, payload, steps) {
  requireString(payload.tex, `scene.${scene.id}.payload.tex`);
  const parts = idsOf(payload.parts, `scene.${scene.id}.payload.parts`);
  for (const part of payload.parts ?? []) { requireString(part?.tex, `scene.${scene.id}.part.${part?.id}.tex`); requireString(part?.explanation, `scene.${scene.id}.part.${part?.id}.explanation`); }
  for (const step of steps) {
    if (step.state?.tex !== undefined) requireString(step.state.tex, `scene.${scene.id}.step.${step.id}.state.tex`);
    checkRefs(step.state?.visiblePartIds, parts, `scene.${scene.id}.step.${step.id}.state.visiblePartIds`);
  }
}

function validateAlgorithm(scene, payload, steps) {
  const lines = idsOf(payload.lines, `scene.${scene.id}.payload.lines`);
  for (const line of payload.lines ?? []) requireString(line?.code, `scene.${scene.id}.line.${line?.id}.code`);
  for (const step of steps) {
    checkRefs(step.focusIds, lines, `scene.${scene.id}.step.${step.id}.focusIds`);
    if (step.state?.variables !== undefined) {
      if (!isObject(step.state.variables)) errors.push(`scene.${scene.id}.step.${step.id}.state.variables must be an object`);
      else for (const [name, value] of Object.entries(step.state.variables)) {
        requireString(name, `scene.${scene.id}.step.${step.id}.state.variables key`);
        if (!["string", "number", "boolean"].includes(typeof value) || (typeof value === "number" && !Number.isFinite(value))) errors.push(`scene.${scene.id}.step.${step.id}.state.variables.${name} must be a finite scalar`);
      }
    }
  }
}

function validateComparison(scene, payload, steps) {
  const items = idsOf(payload.items, `scene.${scene.id}.payload.items`);
  if (items.size < 2 || items.size > 7) errors.push(`scene.${scene.id}.payload.items must contain 2–7 variants`);
  for (const item of payload.items ?? []) { requireString(item?.label, `scene.${scene.id}.item.${item?.id}.label`); requireFinite(item?.value, `scene.${scene.id}.item.${item?.id}.value`); }
  if (payload.baselineId !== undefined) checkRefs([payload.baselineId], items, `scene.${scene.id}.payload.baselineId`);
  if (payload.metric !== undefined) {
    if (!isObject(payload.metric)) errors.push(`scene.${scene.id}.payload.metric must be an object`);
    else {
      requireString(payload.metric.label, `scene.${scene.id}.payload.metric.label`);
      if (!["higher", "lower"].includes(payload.metric.direction)) errors.push(`scene.${scene.id}.payload.metric.direction must be higher or lower`);
      if (!Number.isInteger(payload.metric.decimals) || payload.metric.decimals < 0 || payload.metric.decimals > 6) errors.push(`scene.${scene.id}.payload.metric.decimals must be 0–6`);
    }
  }
  for (const step of steps) {
    const visible = new Set(step.state?.visibleItemIds ?? [...items]);
    checkRefs(step.state?.visibleItemIds, items, `scene.${scene.id}.step.${step.id}.state.visibleItemIds`);
    if (payload.baselineId && !visible.has(payload.baselineId)) errors.push(`scene.${scene.id}.step.${step.id} must retain its baseline`);
  }
}

function validateFigure(scene, payload, steps) {
  if (payload.src !== undefined && typeof payload.src !== "string") errors.push(`scene.${scene.id}.payload.src must be a string`);
  if (typeof payload.src === "string" && /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(payload.src) && !/^https:\/\//i.test(payload.src)) errors.push(`scene.${scene.id}.payload.src must be a local path or HTTPS URL`);
  const callouts = idsOf(payload.callouts, `scene.${scene.id}.payload.callouts`);
  for (const callout of payload.callouts ?? []) {
    requireString(callout?.label, `scene.${scene.id}.callout.${callout?.id}.label`);
    ["x", "y", "width", "height"].forEach((field) => requireFinite(callout?.[field], `scene.${scene.id}.callout.${callout?.id}.${field}`));
    if (callout.x < 0 || callout.y < 0 || callout.width <= 0 || callout.height <= 0 || callout.x + callout.width > 100 || callout.y + callout.height > 100) errors.push(`scene.${scene.id}.callout.${callout.id} must fit inside the image (0–100%)`);
  }
  for (const step of steps) checkRefs(step.state?.zoomRegionId === null ? [] : [step.state?.zoomRegionId].filter(Boolean), callouts, `scene.${scene.id}.step.${step.id}.state.zoomRegionId`);
}

if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) errors.push("scene.scenes must contain at least one scene");
const sceneIds = new Set();
const allowedTypes = new Set(["concept", "architecture_execution", "equation_walkthrough", "algorithm_trace", "ablation_comparison", "figure_inspector"]);
for (const [sceneIndex, scene] of (storyboard.scenes ?? []).entries()) {
  requireString(scene?.id, `scene.scenes[${sceneIndex}].id`); requireString(scene?.title, `scene.scenes[${sceneIndex}].title`); requireString(scene?.type, `scene.scenes[${sceneIndex}].type`);
  if (!allowedTypes.has(scene?.type)) errors.push(`scene.${scene?.id ?? sceneIndex}.type is unsupported: ${scene?.type}`);
  if (sceneIds.has(scene?.id)) errors.push(`duplicate scene id: ${scene.id}`); sceneIds.add(scene?.id);
  checkRefs(scene.claimIds, claimIds, `scene.${scene.id}.claimIds`); checkRefs(scene.evidenceIds, evidenceIds, `scene.${scene.id}.evidenceIds`);
  if (!Array.isArray(scene.steps) || scene.steps.length === 0) errors.push(`scene.${scene.id}.steps must not be empty`);
  if (!isObject(scene.payload)) errors.push(`scene.${scene.id}.payload must be an object`);
  const payloadIds = new Set();
  for (const value of Object.values(scene.payload ?? {})) if (Array.isArray(value)) for (const item of value) if (item && typeof item.id === "string") payloadIds.add(item.id);
  const stepIds = new Set();
  for (const [stepIndex, step] of (scene.steps ?? []).entries()) {
    requireString(step?.id, `scene.${scene.id}.steps[${stepIndex}].id`); requireString(step?.narration, `scene.${scene.id}.steps[${stepIndex}].narration`);
    if (stepIds.has(step?.id)) errors.push(`duplicate step id in ${scene.id}: ${step.id}`); stepIds.add(step?.id);
    checkRefs(step.evidenceIds, evidenceIds, `scene.${scene.id}.step.${step.id}.evidenceIds`); checkRefs(step.focusIds, payloadIds, `scene.${scene.id}.step.${step.id}.focusIds`);
    if (step.state !== undefined && !isObject(step.state)) errors.push(`scene.${scene.id}.step.${step.id}.state must be an object`);
  }
  if (!isObject(scene.payload)) continue;
  if (scene.type === "architecture_execution") validateArchitecture(scene, scene.payload, scene.steps ?? []);
  if (scene.type === "equation_walkthrough") validateEquation(scene, scene.payload, scene.steps ?? []);
  if (scene.type === "algorithm_trace") validateAlgorithm(scene, scene.payload, scene.steps ?? []);
  if (scene.type === "ablation_comparison") validateComparison(scene, scene.payload, scene.steps ?? []);
  if (scene.type === "figure_inspector") validateFigure(scene, scene.payload, scene.steps ?? []);
}

if (errors.length > 0) {
  console.error("Paper Explainer data validation failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`Paper IR valid: ${paper.paper.title}`);
console.log(`Scene IR valid: ${storyboard.scenes.length} scenes / ${storyboard.scenes.reduce((n, scene) => n + scene.steps.length, 0)} steps`);
