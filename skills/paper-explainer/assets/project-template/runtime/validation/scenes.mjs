import {
  addIssue,
  checkRefs,
  collectIds,
  isObject,
  optionalArray,
  optionalString,
  requireFinite,
  requireObject,
  requireString,
  warnMissingText,
} from "./helpers.mjs";

const allowedTypes = new Set([
  "concept",
  "architecture_execution",
  "equation_walkthrough",
  "algorithm_trace",
  "ablation_comparison",
  "figure_inspector",
]);

function collection(payload, key, scenePath, errors, context) {
  return collectIds(payload[key], `scene.${context.sceneId}.payload.${key}`, `${scenePath}/payload/${key}`, errors, context);
}

function payloadIds(payload, scenePath, errors, context) {
  const result = new Set();
  const owners = new Map();
  for (const [key, value] of Object.entries(payload)) {
    if (!Array.isArray(value)) continue;
    for (const [index, item] of value.entries()) {
      if (!isObject(item) || typeof item.id !== "string" || item.id.trim() === "") continue;
      const owner = owners.get(item.id);
      if (owner !== undefined && owner !== key) {
        addIssue(errors, "DUPLICATE_ID", `${scenePath}/payload/${key}/${index}/id`, `scene.${context.sceneId}.payload contains duplicate id: ${item.id}`, context);
      } else {
        owners.set(item.id, key);
        result.add(item.id);
      }
    }
  }
  return result;
}

function validateEdges(payload, nodes, scenePath, errors, warnings, context) {
  const edgeItems = optionalArray(payload.edges, `scene.${context.sceneId}.payload.edges`, `${scenePath}/payload/edges`, errors, context);
  const edges = new Map();
  for (const [index, value] of edgeItems.entries()) {
    const edgePath = `${scenePath}/payload/edges/${index}`;
    const edge = requireObject(value, `scene.${context.sceneId}.payload.edges[${index}]`, edgePath, errors, context);
    if (!edge) continue;
    const from = requireString(edge.from, `scene.${context.sceneId}.payload.edges[${index}].from`, `${edgePath}/from`, errors, context);
    const to = requireString(edge.to, `scene.${context.sceneId}.payload.edges[${index}].to`, `${edgePath}/to`, errors, context);
    if (from && !nodes.has(from)) addIssue(errors, "MISSING_REFERENCE", `${edgePath}/from`, `scene.${context.sceneId}.edge.${edge.id ?? index} references missing node: ${from}`, context);
    if (to && !nodes.has(to)) addIssue(errors, "MISSING_REFERENCE", `${edgePath}/to`, `scene.${context.sceneId}.edge.${edge.id ?? index} references missing node: ${to}`, context);
    const id = edge.id === undefined
      ? (from && to ? `${from}->${to}` : null)
      : requireString(edge.id, `scene.${context.sceneId}.payload.edges[${index}].id`, `${edgePath}/id`, errors, context);
    if (!id) continue;
    if (edges.has(id)) addIssue(errors, "DUPLICATE_ID", `${edgePath}/id`, `duplicate scene.${context.sceneId}.payload.edges id: ${id}`, context);
    else edges.set(id, edge);
    if (from && from === to) addIssue(warnings, "SELF_LOOP_RENDERING", edgePath, `scene.${context.sceneId}.edge.${id} is a self-loop and may not render distinctly`, context);
  }
  return edges;
}

function validateArchitecture(scene, payload, steps, scenePath, errors, warnings, context) {
  const { ids: nodes, items: nodeItems } = collection(payload, "nodes", scenePath, errors, context);
  for (const [index, value] of nodeItems.entries()) {
    if (!isObject(value)) continue;
    warnMissingText(value.label, `scene.${scene.id}.node.${value.id}.label`, `${scenePath}/payload/nodes/${index}/label`, warnings, context);
    const bounds = [value.x, value.y, value.width, value.height];
    if (bounds.some((item) => item !== undefined)) {
      const labels = ["x", "y", "width", "height"];
      const checked = bounds.map((item, boundIndex) => requireFinite(item, `scene.${scene.id}.node.${value.id}.${labels[boundIndex]}`, `${scenePath}/payload/nodes/${index}/${labels[boundIndex]}`, errors, context));
      if (checked.every((item) => item !== null)) {
        const [x, y, width, height] = checked;
        if (width <= 16 || height <= 8 || x < 0 || y < 0 || x + width > 960 || y + height > 480) {
          addIssue(errors, "INVALID_BOUNDS", `${scenePath}/payload/nodes/${index}`, `scene.${scene.id}.node.${value.id} needs valid bounds inside 960x480`, context);
        }
      }
    }
  }
  const edges = validateEdges(payload, nodes, scenePath, errors, warnings, context);
  return { nodes, edges };
}

function validateEquation(scene, payload, scenePath, errors, warnings, context) {
  if (payload.tex !== undefined && (typeof payload.tex !== "string" || payload.tex.trim() === "")) {
    addIssue(errors, "INVALID_TEX", `${scenePath}/payload/tex`, `scene.${scene.id}.payload.tex must not be empty`, context);
  }
  const { ids: parts, items } = collection(payload, "parts", scenePath, errors, context);
  for (const [index, value] of items.entries()) {
    if (!isObject(value)) continue;
    warnMissingText(value.explanation, `scene.${scene.id}.part.${value.id}.explanation`, `${scenePath}/payload/parts/${index}/explanation`, warnings, context);
  }
  return parts;
}

function validateAlgorithm(scene, payload, scenePath, errors, warnings, context) {
  const { ids: lines, items } = collection(payload, "lines", scenePath, errors, context);
  for (const [index, value] of items.entries()) {
    if (!isObject(value)) continue;
    warnMissingText(value.explanation, `scene.${scene.id}.line.${value.id}.explanation`, `${scenePath}/payload/lines/${index}/explanation`, warnings, context);
  }
  return lines;
}

function validateComparison(scene, payload, scenePath, errors, warnings, context) {
  const { ids: items, items: values } = collection(payload, "items", scenePath, errors, context);
  if (values.length > 7) addIssue(warnings, "DENSE_COMPARISON", `${scenePath}/payload/items`, `scene.${scene.id}.payload.items has ${values.length} variants and may be hard to read`, context);
  for (const [index, value] of values.entries()) {
    if (!isObject(value)) continue;
    warnMissingText(value.label, `scene.${scene.id}.item.${value.id}.label`, `${scenePath}/payload/items/${index}/label`, warnings, context);
    requireFinite(value.value, `scene.${scene.id}.item.${value.id}.value`, `${scenePath}/payload/items/${index}/value`, errors, context);
  }

  let metric = null;
  if (payload.metric !== undefined) {
    metric = requireObject(payload.metric, `scene.${scene.id}.payload.metric`, `${scenePath}/payload/metric`, errors, context);
    if (metric) {
      requireString(metric.label, `scene.${scene.id}.metric.label`, `${scenePath}/payload/metric/label`, errors, context);
      requireString(metric.unit, `scene.${scene.id}.metric.unit`, `${scenePath}/payload/metric/unit`, errors, context);
      optionalString(metric.deltaUnit, `scene.${scene.id}.metric.deltaUnit`, `${scenePath}/payload/metric/deltaUnit`, errors, context);
      if (!["higher", "lower"].includes(metric.direction)) addIssue(errors, "INVALID_METRIC", `${scenePath}/payload/metric/direction`, `scene.${scene.id}.metric.direction must be higher or lower`, context);
      if (!Number.isInteger(metric.decimals) || metric.decimals < 0 || metric.decimals > 6) addIssue(errors, "INVALID_METRIC", `${scenePath}/payload/metric/decimals`, `scene.${scene.id}.metric.decimals must be an integer from 0 to 6`, context);
    }
  }

  if (metric) {
    const baselineId = requireString(payload.baselineId, `scene.${scene.id}.baselineId`, `${scenePath}/payload/baselineId`, errors, context);
    if (baselineId && !items.has(baselineId)) addIssue(errors, "MISSING_REFERENCE", `${scenePath}/payload/baselineId`, `scene.${scene.id}.baselineId references missing item`, context);
  }
  return { items, hasMetric: Boolean(metric) };
}

function validateFigure(scene, payload, scenePath, errors, warnings, context) {
  let regions = new Set();
  if (payload.image !== undefined) {
    const image = requireObject(payload.image, `scene.${scene.id}.payload.image`, `${scenePath}/payload/image`, errors, context);
    if (image) {
      requireString(image.src, `scene.${scene.id}.image.src`, `${scenePath}/payload/image/src`, errors, context);
      requireString(image.alt, `scene.${scene.id}.image.alt`, `${scenePath}/payload/image/alt`, errors, context);
      const width = requireFinite(image.width, `scene.${scene.id}.image.width`, `${scenePath}/payload/image/width`, errors, context);
      const height = requireFinite(image.height, `scene.${scene.id}.image.height`, `${scenePath}/payload/image/height`, errors, context);
      if ((width !== null && width <= 0) || (height !== null && height <= 0)) addIssue(errors, "INVALID_IMAGE", `${scenePath}/payload/image`, `scene.${scene.id}.image needs positive original dimensions`, context);
    }
    const result = collection(payload, "regions", scenePath, errors, context);
    regions = result.ids;
    for (const [index, value] of result.items.entries()) {
      if (!isObject(value)) continue;
      warnMissingText(value.label, `scene.${scene.id}.region.${value.id}.label`, `${scenePath}/payload/regions/${index}/label`, warnings, context);
      const fields = ["x", "y", "width", "height"];
      const coordinates = fields.map((field) => requireFinite(value[field], `scene.${scene.id}.region.${value.id}.${field}`, `${scenePath}/payload/regions/${index}/${field}`, errors, context));
      if (coordinates.every((item) => item !== null)) {
        const [x, y, width, height] = coordinates;
        if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 + 1e-9 || y + height > 1 + 1e-9) {
          addIssue(errors, "INVALID_REGION", `${scenePath}/payload/regions/${index}`, `scene.${scene.id}.region.${value.id} must fit within 0..1`, context);
        }
      }
    }
  } else {
    optionalString(payload.src, `scene.${scene.id}.payload.src`, `${scenePath}/payload/src`, errors, context);
    const result = collection(payload, "callouts", scenePath, errors, context);
    for (const [index, value] of result.items.entries()) {
      if (!isObject(value)) continue;
      warnMissingText(value.label, `scene.${scene.id}.callout.${value.id}.label`, `${scenePath}/payload/callouts/${index}/label`, warnings, context);
      const fields = ["x", "y", "width", "height"];
      const provided = fields.some((field) => value[field] !== undefined);
      if (!provided) continue;
      const coordinates = fields.map((field) => requireFinite(value[field], `scene.${scene.id}.callout.${value.id}.${field}`, `${scenePath}/payload/callouts/${index}/${field}`, errors, context));
      if (coordinates.every((item) => item !== null)) {
        const [x, y, width, height] = coordinates;
        if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 100 || y + height > 100) {
          addIssue(errors, "INVALID_CALLOUT", `${scenePath}/payload/callouts/${index}`, `scene.${scene.id}.callout.${value.id} must fit within 0..100 percent`, context);
        }
      }
    }
  }
  return regions;
}

function hiddenFocus(step, focusIds, known, visible, key, stepPath, errors, context) {
  if (visible === undefined || visible === null || focusIds === null) return;
  const visibleSet = new Set(visible);
  for (const [index, id] of (focusIds ?? []).entries()) if (known.has(id) && !visibleSet.has(id)) {
    addIssue(errors, "FOCUS_HIDDEN", `${stepPath}/focusIds/${index}`, `scene.${context.sceneId}.step.${step.id}.focus ${id} is hidden by ${key}`, context);
  }
}

function validateSteps(scene, steps, payload, known, scenePath, errors) {
  const stepIds = new Set();
  for (const [stepIndex, value] of steps.entries()) {
    const stepPath = `${scenePath}/steps/${stepIndex}`;
    const baseContext = { sceneId: scene.id };
    const step = requireObject(value, `scene.${scene.id}.steps[${stepIndex}]`, stepPath, errors, baseContext);
    if (!step) continue;
    const context = { sceneId: scene.id, stepId: step.id };
    const stepId = requireString(step.id, `scene.${scene.id}.steps[${stepIndex}].id`, `${stepPath}/id`, errors, context);
    requireString(step.narration, `scene.${scene.id}.steps[${stepIndex}].narration`, `${stepPath}/narration`, errors, context);
    if (stepId) {
      if (stepIds.has(stepId)) addIssue(errors, "DUPLICATE_ID", `${stepPath}/id`, `duplicate step id in ${scene.id}: ${stepId}`, context);
      else stepIds.add(stepId);
    }
    checkRefs(step.evidenceIds, known.evidence, `scene.${scene.id}.step.${step.id}.evidenceIds`, `${stepPath}/evidenceIds`, errors, context);
    const focusIds = checkRefs(step.focusIds, known.payload, `scene.${scene.id}.step.${step.id}.focusIds`, `${stepPath}/focusIds`, errors, context);

    if (Object.prototype.hasOwnProperty.call(step, "state")) {
      addIssue(errors, "UNSUPPORTED_STEP_STATE", `${stepPath}/state`, `scene.${scene.id}.step.${step.id}.state is unsupported; use visual instead`, context);
    }
    if (step.visual === undefined) continue;
    const visual = requireObject(step.visual, `scene.${scene.id}.step.${step.id}.visual`, `${stepPath}/visual`, errors, context);
    if (!visual) continue;

    const visibleNodes = checkRefs(visual.visibleNodeIds, known.nodes, `scene.${scene.id}.step.${step.id}.visibleNodeIds`, `${stepPath}/visual/visibleNodeIds`, errors, context);
    const visibleParts = checkRefs(visual.visiblePartIds, known.parts, `scene.${scene.id}.step.${step.id}.visiblePartIds`, `${stepPath}/visual/visiblePartIds`, errors, context);
    const visibleItems = checkRefs(visual.visibleItemIds, known.items, `scene.${scene.id}.step.${step.id}.visibleItemIds`, `${stepPath}/visual/visibleItemIds`, errors, context);
    const activeEdges = checkRefs(visual.activeEdgeIds, new Set(known.edges.keys()), `scene.${scene.id}.step.${step.id}.activeEdgeIds`, `${stepPath}/visual/activeEdgeIds`, errors, context);

    hiddenFocus(step, focusIds, known.nodes, visibleNodes, "visibleNodeIds", stepPath, errors, context);
    hiddenFocus(step, focusIds, known.parts, visibleParts, "visiblePartIds", stepPath, errors, context);
    hiddenFocus(step, focusIds, known.items, visibleItems, "visibleItemIds", stepPath, errors, context);

    if (visibleNodes !== undefined && visibleNodes !== null && activeEdges !== undefined && activeEdges !== null) {
      const visible = new Set(visibleNodes);
      for (const [index, id] of activeEdges.entries()) {
        const edge = known.edges.get(id);
        if (edge && (!visible.has(edge.from) || !visible.has(edge.to))) {
          addIssue(errors, "INVISIBLE_EDGE_ENDPOINT", `${stepPath}/visual/activeEdgeIds/${index}`, `scene.${scene.id}.step.${step.id}.active edge ${id} has invisible endpoint`, context);
        }
      }
    }
    if (known.hasMetric && visibleItems !== undefined && visibleItems !== null && !visibleItems.includes(payload.baselineId)) {
      addIssue(errors, "BASELINE_HIDDEN", `${stepPath}/visual/visibleItemIds`, `scene.${scene.id}.step.${step.id}.baseline must stay visible`, context);
    }
    if (visual.tex !== undefined && (typeof visual.tex !== "string" || visual.tex.trim() === "")) addIssue(errors, "INVALID_TEX", `${stepPath}/visual/tex`, `scene.${scene.id}.step.${step.id}.tex must not be empty`, context);
    if (visual.output !== undefined && typeof visual.output !== "string") addIssue(errors, "EXPECTED_STRING", `${stepPath}/visual/output`, `scene.${scene.id}.step.${step.id}.output must be a string`, context);
    if (visual.variables !== undefined) {
      const variables = requireObject(visual.variables, `scene.${scene.id}.step.${step.id}.variables`, `${stepPath}/visual/variables`, errors, context);
      if (variables) for (const [name, variable] of Object.entries(variables)) {
        if (!name.trim() || !["string", "number", "boolean"].includes(typeof variable) || (typeof variable === "number" && !Number.isFinite(variable))) {
          addIssue(errors, "INVALID_VARIABLE", `${stepPath}/visual/variables/${name}`, `scene.${scene.id}.step.${step.id}.variable.${name} is invalid`, context);
        }
      }
    }
    if (visual.regionId !== undefined && visual.regionId !== null) {
      if (typeof visual.regionId !== "string" || visual.regionId.trim() === "") addIssue(errors, "INVALID_ID", `${stepPath}/visual/regionId`, `scene.${scene.id}.step.${step.id}.regionId must be a string or null`, context);
      else if (!known.regions.has(visual.regionId)) addIssue(errors, "MISSING_REFERENCE", `${stepPath}/visual/regionId`, `scene.${scene.id}.step.${step.id}.regionId references missing region`, context);
    }
  }
}

export function validateScenes(storyboardValue, idSets, errors, warnings) {
  if (!isObject(storyboardValue)) return;
  const storyboard = storyboardValue;
  if (!Array.isArray(storyboard.scenes)) {
    addIssue(errors, "EXPECTED_ARRAY", "/scenes", "scene.scenes must be an array");
    return;
  }
  if (storyboard.scenes.length === 0) addIssue(errors, "EMPTY_SCENES", "/scenes", "scene.scenes must contain at least one scene");

  const evidence = idSets.get("evidence") ?? new Set();
  const claims = idSets.get("claims") ?? new Set();
  const sceneIds = new Set();
  for (const [sceneIndex, value] of storyboard.scenes.entries()) {
    const scenePath = `/scenes/${sceneIndex}`;
    const scene = requireObject(value, `scene.scenes[${sceneIndex}]`, scenePath, errors);
    if (!scene) continue;
    const context = { sceneId: scene.id };
    const sceneId = requireString(scene.id, `scene.scenes[${sceneIndex}].id`, `${scenePath}/id`, errors, context);
    requireString(scene.title, `scene.scenes[${sceneIndex}].title`, `${scenePath}/title`, errors, context);
    const type = requireString(scene.type, `scene.scenes[${sceneIndex}].type`, `${scenePath}/type`, errors, context);
    if (type && !allowedTypes.has(type)) addIssue(errors, "UNSUPPORTED_SCENE_TYPE", `${scenePath}/type`, `scene.${scene.id ?? sceneIndex}.type is unsupported: ${type}`, context);
    if (sceneId) {
      if (sceneIds.has(sceneId)) addIssue(errors, "DUPLICATE_ID", `${scenePath}/id`, `duplicate scene id: ${sceneId}`, context);
      else sceneIds.add(sceneId);
    }
    checkRefs(scene.claimIds, claims, `scene.${scene.id}.claimIds`, `${scenePath}/claimIds`, errors, context);
    checkRefs(scene.evidenceIds, evidence, `scene.${scene.id}.evidenceIds`, `${scenePath}/evidenceIds`, errors, context);

    const payload = requireObject(scene.payload, `scene.${scene.id}.payload`, `${scenePath}/payload`, errors, context) ?? {};
    let steps = [];
    if (!Array.isArray(scene.steps)) addIssue(errors, "EXPECTED_ARRAY", `${scenePath}/steps`, `scene.${scene.id}.steps must be an array`, context);
    else {
      steps = scene.steps;
      if (steps.length === 0) addIssue(errors, "EMPTY_STEPS", `${scenePath}/steps`, `scene.${scene.id}.steps must not be empty`, context);
    }

    const known = {
      evidence,
      payload: payloadIds(payload, scenePath, errors, context),
      nodes: new Set(),
      edges: new Map(),
      parts: new Set(),
      items: new Set(),
      regions: new Set(),
      hasMetric: false,
    };
    if (scene.type === "concept") {
      const points = collection(payload, "points", scenePath, errors, context);
      for (const [index, point] of points.items.entries()) if (isObject(point)) warnMissingText(point.label, `scene.${scene.id}.point.${point.id}.label`, `${scenePath}/payload/points/${index}/label`, warnings, context);
    } else if (scene.type === "architecture_execution") {
      Object.assign(known, validateArchitecture(scene, payload, steps, scenePath, errors, warnings, context));
    } else if (scene.type === "equation_walkthrough") {
      known.parts = validateEquation(scene, payload, scenePath, errors, warnings, context);
    } else if (scene.type === "algorithm_trace") {
      validateAlgorithm(scene, payload, scenePath, errors, warnings, context);
    } else if (scene.type === "ablation_comparison") {
      Object.assign(known, validateComparison(scene, payload, scenePath, errors, warnings, context));
    } else if (scene.type === "figure_inspector") {
      known.regions = validateFigure(scene, payload, scenePath, errors, warnings, context);
    }
    validateSteps(scene, steps, payload, known, scenePath, errors);
  }
}
