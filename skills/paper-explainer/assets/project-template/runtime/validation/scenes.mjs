import { addIssue, checkRefs, requireString } from "./helpers.mjs";

const allowedTypes = new Set([
  "concept",
  "architecture_execution",
  "equation_walkthrough",
  "algorithm_trace",
  "ablation_comparison",
  "figure_inspector",
]);

export function validateScenes(storyboard, idSets, errors) {
  const evidenceIds = idSets.get("evidence") ?? new Set();
  const claimIds = idSets.get("claims") ?? new Set();
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) {
    addIssue(errors, "EMPTY_SCENES", "/scenes", "scene.scenes must contain at least one scene");
  }

  const sceneIds = new Set();
  for (const [sceneIndex, scene] of (storyboard.scenes ?? []).entries()) {
    const scenePath = `/scenes/${sceneIndex}`;
    const sceneContext = { sceneId: scene?.id };
    requireString(scene?.id, `scene.scenes[${sceneIndex}].id`, `${scenePath}/id`, errors, sceneContext);
    requireString(scene?.title, `scene.scenes[${sceneIndex}].title`, `${scenePath}/title`, errors, sceneContext);
    requireString(scene?.type, `scene.scenes[${sceneIndex}].type`, `${scenePath}/type`, errors, sceneContext);
    if (!allowedTypes.has(scene?.type)) {
      addIssue(errors, "UNSUPPORTED_SCENE_TYPE", `${scenePath}/type`, `scene.${scene?.id ?? sceneIndex}.type is unsupported: ${scene?.type}`, sceneContext);
    }
    if (sceneIds.has(scene?.id)) addIssue(errors, "DUPLICATE_ID", `${scenePath}/id`, `duplicate scene id: ${scene.id}`, sceneContext);
    sceneIds.add(scene?.id);
    checkRefs(scene.claimIds, claimIds, `scene.${scene.id}.claimIds`, `${scenePath}/claimIds`, errors, sceneContext);
    checkRefs(scene.evidenceIds, evidenceIds, `scene.${scene.id}.evidenceIds`, `${scenePath}/evidenceIds`, errors, sceneContext);
    if (!Array.isArray(scene.steps) || scene.steps.length === 0) {
      addIssue(errors, "EMPTY_STEPS", `${scenePath}/steps`, `scene.${scene.id}.steps must not be empty`, sceneContext);
    }

    const payloadIds = new Set();
    for (const value of Object.values(scene.payload ?? {})) {
      if (!Array.isArray(value)) continue;
      for (const item of value) if (item && typeof item.id === "string") {
        if (payloadIds.has(item.id)) addIssue(errors, "DUPLICATE_ID", `${scenePath}/payload`, `scene.${scene.id}.payload contains duplicate id: ${item.id}`, sceneContext);
        payloadIds.add(item.id);
      }
    }

    const payload = scene.payload ?? {};
    const ids = (key) => new Set(Array.isArray(payload[key]) ? payload[key].map((item) => item?.id) : []);
    const nodes = ids("nodes"), parts = ids("parts"), items = ids("items"), regions = ids("regions");
    const edgeList = Array.isArray(payload.edges) ? payload.edges : [];
    const edges = new Map(edgeList.map((edge) => [edge.id ?? `${edge.from}->${edge.to}`, edge]));

    for (const [id, edge] of edges) {
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
        addIssue(errors, "MISSING_REFERENCE", `${scenePath}/payload/edges`, `scene.${scene.id}.edge.${id} references missing node`, sceneContext);
      }
    }

    if (scene.type === "architecture_execution") for (const [nodeIndex, node] of (payload.nodes ?? []).entries()) {
      if ([node.x, node.y, node.width, node.height].some((value) => value !== undefined)) {
        if (![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 16 || node.height <= 8 || node.x < 0 || node.y < 0 || node.x + node.width > 960 || node.y + node.height > 480) {
          addIssue(errors, "INVALID_BOUNDS", `${scenePath}/payload/nodes/${nodeIndex}`, `scene.${scene.id}.node.${node.id} needs valid bounds inside 960x480`, sceneContext);
        }
      }
    }

    if (scene.type === "ablation_comparison" && payload.metric) {
      const metric = payload.metric;
      if (typeof metric.label !== "string" || !["higher", "lower"].includes(metric.direction) || !Number.isInteger(metric.decimals) || metric.decimals < 0 || metric.decimals > 6 || typeof metric.unit !== "string") {
        addIssue(errors, "INVALID_METRIC", `${scenePath}/payload/metric`, `scene.${scene.id}.metric is invalid`, sceneContext);
      }
      if (!items.has(payload.baselineId)) addIssue(errors, "MISSING_REFERENCE", `${scenePath}/payload/baselineId`, `scene.${scene.id}.baselineId references missing item`, sceneContext);
    }

    if (scene.type === "ablation_comparison") for (const [itemIndex, item] of (payload.items ?? []).entries()) {
      if (!Number.isFinite(item.value)) addIssue(errors, "INVALID_NUMBER", `${scenePath}/payload/items/${itemIndex}/value`, `scene.${scene.id}.item.${item.id}.value must be finite`, sceneContext);
    }

    if (scene.type === "figure_inspector" && payload.image) {
      const image = payload.image;
      if (typeof image.src !== "string" || !image.src.trim() || typeof image.alt !== "string" || !Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width <= 0 || image.height <= 0) {
        addIssue(errors, "INVALID_IMAGE", `${scenePath}/payload/image`, `scene.${scene.id}.image needs src, alt and positive original dimensions`, sceneContext);
      }
      for (const [regionIndex, region] of (payload.regions ?? []).entries()) {
        if (![region.x, region.y, region.width, region.height].every(Number.isFinite) || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 || region.x + region.width > 1 + 1e-9 || region.y + region.height > 1 + 1e-9) {
          addIssue(errors, "INVALID_REGION", `${scenePath}/payload/regions/${regionIndex}`, `scene.${scene.id}.region.${region.id} must fit within 0..1`, sceneContext);
        }
      }
    }

    const stepIds = new Set();
    for (const [stepIndex, step] of (scene.steps ?? []).entries()) {
      const stepPath = `${scenePath}/steps/${stepIndex}`;
      const context = { sceneId: scene.id, stepId: step?.id };
      requireString(step?.id, `scene.${scene.id}.steps[${stepIndex}].id`, `${stepPath}/id`, errors, context);
      requireString(step?.narration, `scene.${scene.id}.steps[${stepIndex}].narration`, `${stepPath}/narration`, errors, context);
      if (stepIds.has(step?.id)) addIssue(errors, "DUPLICATE_ID", `${stepPath}/id`, `duplicate step id in ${scene.id}: ${step.id}`, context);
      stepIds.add(step?.id);
      checkRefs(step.evidenceIds, evidenceIds, `scene.${scene.id}.step.${step.id}.evidenceIds`, `${stepPath}/evidenceIds`, errors, context);
      checkRefs(step.focusIds, payloadIds, `scene.${scene.id}.step.${step.id}.focusIds`, `${stepPath}/focusIds`, errors, context);

      const visual = step.visual;
      if (visual !== undefined && (!visual || typeof visual !== "object" || Array.isArray(visual))) {
        addIssue(errors, "INVALID_VISUAL", `${stepPath}/visual`, `scene.${scene.id}.step.${step.id}.visual must be an object`, context);
        continue;
      }
      if (!visual) continue;

      for (const [key, known] of [["visibleNodeIds", nodes], ["visiblePartIds", parts], ["visibleItemIds", items]]) {
        if (visual[key] !== undefined && !Array.isArray(visual[key])) {
          addIssue(errors, "EXPECTED_ARRAY", `${stepPath}/visual/${key}`, `scene.${scene.id}.step.${step.id}.${key} must be an array`, context);
        } else {
          checkRefs(visual[key], known, `scene.${scene.id}.step.${step.id}.${key}`, `${stepPath}/visual/${key}`, errors, context);
        }
      }

      if (visual.activeEdgeIds !== undefined && !Array.isArray(visual.activeEdgeIds)) {
        addIssue(errors, "EXPECTED_ARRAY", `${stepPath}/visual/activeEdgeIds`, `scene.${scene.id}.step.${step.id}.activeEdgeIds must be an array`, context);
      } else {
        checkRefs(visual.activeEdgeIds, new Set(edges.keys()), `scene.${scene.id}.step.${step.id}.activeEdgeIds`, `${stepPath}/visual/activeEdgeIds`, errors, context);
      }

      if (visual.visibleNodeIds && visual.activeEdgeIds) for (const [edgeIndex, id] of visual.activeEdgeIds.entries()) {
        const edge = edges.get(id);
        if (edge && (!visual.visibleNodeIds.includes(edge.from) || !visual.visibleNodeIds.includes(edge.to))) {
          addIssue(errors, "INVISIBLE_EDGE_ENDPOINT", `${stepPath}/visual/activeEdgeIds/${edgeIndex}`, `scene.${scene.id}.step.${step.id}.active edge ${id} has invisible endpoint`, context);
        }
      }
      if (visual.visiblePartIds) for (const [focusIndex, id] of (step.focusIds ?? []).entries()) if (parts.has(id) && !visual.visiblePartIds.includes(id)) {
        addIssue(errors, "FOCUS_HIDDEN", `${stepPath}/focusIds/${focusIndex}`, `scene.${scene.id}.step.${step.id}.focus ${id} is hidden`, context);
      }
      if (visual.visibleNodeIds) for (const [focusIndex, id] of (step.focusIds ?? []).entries()) if (nodes.has(id) && !visual.visibleNodeIds.includes(id)) {
        addIssue(errors, "FOCUS_HIDDEN", `${stepPath}/focusIds/${focusIndex}`, `scene.${scene.id}.step.${step.id}.focus ${id} is hidden`, context);
      }
      if (visual.visibleItemIds) {
        if (payload.metric && !visual.visibleItemIds.includes(payload.baselineId)) {
          addIssue(errors, "BASELINE_HIDDEN", `${stepPath}/visual/visibleItemIds`, `scene.${scene.id}.step.${step.id}.baseline must stay visible`, context);
        }
        for (const [focusIndex, id] of (step.focusIds ?? []).entries()) if (items.has(id) && !visual.visibleItemIds.includes(id)) {
          addIssue(errors, "FOCUS_HIDDEN", `${stepPath}/focusIds/${focusIndex}`, `scene.${scene.id}.step.${step.id}.focus ${id} is hidden`, context);
        }
      }
      if (visual.tex !== undefined && (typeof visual.tex !== "string" || !visual.tex.trim())) {
        addIssue(errors, "INVALID_TEX", `${stepPath}/visual/tex`, `scene.${scene.id}.step.${step.id}.tex must not be empty`, context);
      }
      if (visual.variables !== undefined) {
        if (!visual.variables || typeof visual.variables !== "object" || Array.isArray(visual.variables)) {
          addIssue(errors, "INVALID_VARIABLES", `${stepPath}/visual/variables`, `scene.${scene.id}.step.${step.id}.variables must be an object`, context);
        } else for (const [name, value] of Object.entries(visual.variables)) if (!name.trim() || !["string", "number", "boolean"].includes(typeof value) || (typeof value === "number" && !Number.isFinite(value))) {
          addIssue(errors, "INVALID_VARIABLE", `${stepPath}/visual/variables/${name}`, `scene.${scene.id}.step.${step.id}.variable.${name} is invalid`, context);
        }
      }
      if (visual.regionId !== undefined && visual.regionId !== null && !regions.has(visual.regionId)) {
        addIssue(errors, "MISSING_REFERENCE", `${stepPath}/visual/regionId`, `scene.${scene.id}.step.${step.id}.regionId references missing region`, context);
      }
    }
  }
}
