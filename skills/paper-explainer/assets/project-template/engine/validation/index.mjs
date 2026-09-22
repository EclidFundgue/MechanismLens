import { add, checkRefs, collect, finite, isObject, requireArray, requireObject, requireString } from "./helpers.mjs";

const paperGroups = ["evidence", "claims", "contributions", "concepts", "modules", "relations", "equations", "algorithms", "experiments", "figures"];
const objectKinds = new Set(["group", "node", "card", "annotation", "equation", "code", "chart", "image"]);
const transitions = new Set(["direct", "viaOverview"]);
const viewModes = new Set(["overview", "focus", "detail", "compare"]);
const intentVersions = new Set(["2.0", "2.1"]);
const sceneVersions = new Set(["2.0", "2.1"]);
const cameraReasons = new Set(["required_content_unreadable", "inspect_source_detail", "restore_spatial_context"]);
const treatments = new Set(["static_emphasis", "progressive_reveal", "parts_then_whole", "overview_detail_spotlight"]);
const readabilityProfiles = [
  { id: "desktop", width: 1080, height: 540, minimumPx: 18 },
  { id: "narrow", width: 360, height: 300, minimumPx: 14 },
];

function validatePaper(paperValue, errors) {
  const paper = requireObject(paperValue, "", errors);
  if (paper.schemaVersion !== "2.0") add(errors, "UNSUPPORTED_SCHEMA_VERSION", "/schemaVersion", `paper.schemaVersion must be 2.0`);
  const meta = requireObject(paper.paper, "/paper", errors);
  requireString(meta.id, "/paper/id", errors);
  requireString(meta.title, "/paper/title", errors);
  const sets = new Map();
  const values = new Map();
  for (const group of paperGroups) {
    const result = collect(paper[group], `/${group}`, errors, { layer: "paper" });
    sets.set(group, result.ids);
    values.set(group, result.items);
  }
  const evidence = sets.get("evidence");
  for (const group of paperGroups.filter((name) => name !== "evidence")) {
    for (const [index, item] of values.get(group).entries()) {
      if (!isObject(item)) continue;
      checkRefs(item.evidenceIds, evidence, `/${group}/${index}/evidenceIds`, errors, { layer: "paper", objectId: item.id }, { optional: group !== "claims" && group !== "contributions" });
    }
  }
  const semanticIds = new Set(paperGroups.filter((name) => name !== "evidence").flatMap((name) => [...sets.get(name)]));
  return { paper, meta, evidence, claims: sets.get("claims"), semanticIds };
}

function collectVisualIds(world, worldPath, errors, context) {
  const { items: objects, ids: objectIds } = collect(world.objects, `${worldPath}/objects`, errors, context);
  const visualIds = new Set(objectIds);
  const ownerByVisual = new Map([...objectIds].map((id) => [id, id]));
  for (const [index, object] of objects.entries()) {
    if (!isObject(object)) continue;
    for (const [key, nested] of [["parts", object.parts], ["lines", object.lines], ["items", object.items], ["regions", object.regions]]) {
      if (nested === undefined) continue;
      const result = collect(nested, `${worldPath}/objects/${index}/${key}`, errors, { ...context, objectId: object.id });
      for (const id of result.ids) {
        if (visualIds.has(id)) add(errors, "DUPLICATE_ID", `${worldPath}/objects/${index}/${key}`, `visual id is already used in world: ${id}`, context);
        visualIds.add(id);
        ownerByVisual.set(id, object.id);
      }
    }
  }
  return { objects, objectIds, visualIds, ownerByVisual };
}

function parentCycles(objects, objectMap, worldPath, errors, context) {
  for (const [index, object] of objects.entries()) {
    if (!isObject(object) || typeof object.id !== "string") continue;
    const visited = new Set([object.id]);
    let cursor = object;
    while (typeof cursor.parentId === "string") {
      if (visited.has(cursor.parentId)) {
        add(errors, "PARENT_CYCLE", `${worldPath}/objects/${index}/parentId`, `parent cycle includes ${cursor.parentId}`, { ...context, objectId: object.id });
        break;
      }
      visited.add(cursor.parentId);
      cursor = objectMap.get(cursor.parentId);
      if (!cursor) break;
    }
  }
}

function validateWorld(worldValue, index, catalogMap, paperInfo, errors, warnings, intentVersion) {
  const path = `/worlds/${index}`;
  const world = requireObject(worldValue, path, errors, { layer: "intent" });
  const id = requireString(world.id, `${path}/id`, errors, { layer: "intent" });
  const templateId = requireString(world.templateId, `${path}/templateId`, errors, { layer: "intent", worldId: id });
  const context = { layer: "intent", worldId: id, templateId };
  const template = catalogMap.get(templateId);
  if (templateId && !template) add(errors, "UNKNOWN_TEMPLATE", `${path}/templateId`, `unknown template: ${templateId}`, context);
  const { objects, objectIds, visualIds, ownerByVisual } = collectVisualIds(world, path, errors, context);
  const objectMap = new Map(objects.filter(isObject).map((object) => [object.id, object]));
  const kinds = new Set();
  for (const [objectIndex, object] of objects.entries()) {
    if (!isObject(object)) continue;
    const objectPath = `${path}/objects/${objectIndex}`;
    const objectContext = { ...context, objectId: object.id };
    if (!objectKinds.has(object.kind)) add(errors, "UNKNOWN_PRIMITIVE", `${objectPath}/kind`, `unknown primitive kind: ${object.kind}`, objectContext);
    else kinds.add(object.kind);
    if (template && !template.allowedKinds.includes(object.kind)) add(errors, "TEMPLATE_KIND_MISMATCH", `${objectPath}/kind`, `${templateId} does not allow ${object.kind}`, objectContext);
    if (object.parentId !== undefined) {
      if (!objectIds.has(object.parentId)) add(errors, "MISSING_REFERENCE", `${objectPath}/parentId`, `missing parent: ${object.parentId}`, objectContext);
      else if (objectMap.get(object.parentId)?.kind !== "group") add(errors, "INVALID_PARENT", `${objectPath}/parentId`, `parent must be a group: ${object.parentId}`, objectContext);
    }
    if (object.paperRef !== undefined && !paperInfo.semanticIds.has(object.paperRef)) add(errors, "MISSING_REFERENCE", `${objectPath}/paperRef`, `missing Paper IR object: ${object.paperRef}`, objectContext);
    checkRefs(object.evidenceIds, paperInfo.evidence, `${objectPath}/evidenceIds`, errors, objectContext);
    if (object.kind === "chart" && Array.isArray(object.items) && object.items.length > 7) add(warnings, "DENSE_COMPARISON", `${objectPath}/items`, `chart ${object.id} has ${object.items.length} items`, objectContext);
    if (object.kind === "image" && Array.isArray(object.regions)) {
      for (const [regionIndex, region] of object.regions.entries()) {
        if (!isObject(region)) continue;
        const values = [region.x, region.y, region.width, region.height];
        if (!values.every(finite) || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 || region.x + region.width > 1 || region.y + region.height > 1) {
          add(errors, "INVALID_REGION", `${objectPath}/regions/${regionIndex}`, `region ${region.id} must stay inside normalized image bounds`, objectContext);
        }
      }
    }
  }
  parentCycles(objects, objectMap, path, errors, context);
  if (template) for (const kind of template.requiredKinds) {
    if (!kinds.has(kind)) add(errors, "MISSING_TEMPLATE_SLOT", `${path}/objects`, `${templateId} requires at least one ${kind}`, context);
  }
  const relations = collect(world.relations ?? [], `${path}/relations`, errors, context);
  for (const [relationIndex, relation] of relations.items.entries()) {
    if (!isObject(relation)) continue;
    if (!objectIds.has(relation.from)) add(errors, "MISSING_REFERENCE", `${path}/relations/${relationIndex}/from`, `missing relation source: ${relation.from}`, context);
    if (!objectIds.has(relation.to)) add(errors, "MISSING_REFERENCE", `${path}/relations/${relationIndex}/to`, `missing relation target: ${relation.to}`, context);
    checkRefs(relation.evidenceIds, paperInfo.evidence, `${path}/relations/${relationIndex}/evidenceIds`, errors, { ...context, objectId: relation.id });
  }
  const detailViews = collect(world.detailViews ?? [], `${path}/detailViews`, errors, context);
  for (const [detailIndex, detail] of detailViews.items.entries()) {
    if (!isObject(detail)) continue;
    if (!visualIds.has(detail.explainsObjectId)) add(errors, "MISSING_REFERENCE", `${path}/detailViews/${detailIndex}/explainsObjectId`, `detail view target is missing: ${detail.explainsObjectId}`, context);
    collectVisualIds(detail, `${path}/detailViews/${detailIndex}`, errors, context);
  }
  const frames = collect(world.frames ?? [], `${path}/frames`, errors, context);
  if (intentVersion === "2.1" && frames.items.length === 0) add(errors, "MISSING_FRAMES", `${path}/frames`, `Visual Intent 2.1 world ${id} must define at least one fixed frame`, context);
  const frameMap = new Map();
  for (const [frameIndex, frame] of frames.items.entries()) {
    if (!isObject(frame)) continue;
    const framePath = `${path}/frames/${frameIndex}`;
    const frameContext = { ...context, frameId: frame.id };
    checkRefs(frame.targetIds, visualIds, `${framePath}/targetIds`, errors, frameContext, { optional: false });
    checkRefs(frame.requiredReadableIds, visualIds, `${framePath}/requiredReadableIds`, errors, frameContext, { optional: false });
    if (!new Set(["fit", "tight", "contextual"]).has(frame.mode)) add(errors, "INVALID_FRAME_MODE", `${framePath}/mode`, `unsupported frame mode: ${frame.mode}`, frameContext);
    if (frame.request?.reason !== undefined && !cameraReasons.has(frame.request.reason)) add(errors, "INVALID_CAMERA_REASON", `${framePath}/request/reason`, `unsupported camera request reason: ${frame.request.reason}`, frameContext);
    if (typeof frame.id === "string") frameMap.set(frame.id, frame);
  }
  return { id, world, template, objectIds, visualIds, ownerByVisual, objectMap, relationIds: relations.ids, detailIds: detailViews.ids, frameIds: frames.ids, frameMap };
}

export function validateSource(paperValue, intentValue, catalogValue) {
  const errors = [], warnings = [];
  const paperInfo = validatePaper(paperValue, errors);
  const intent = requireObject(intentValue, "", errors);
  if (!intentVersions.has(intent.schemaVersion)) add(errors, "UNSUPPORTED_SCHEMA_VERSION", "/schemaVersion", `visual intent schemaVersion must be 2.0 or 2.1`, { layer: "intent" });
  if (intent.paperId !== paperInfo.meta.id) add(errors, "PAPER_ID_MISMATCH", "/paperId", `visual intent paperId must match paper.paper.id`, { layer: "intent" });
  const catalog = requireObject(catalogValue, "", errors);
  const templates = collect(catalog.templates, "/templates", errors, { layer: "catalog" });
  const catalogMap = new Map(templates.items.filter(isObject).map((template) => [template.id, template]));
  const worlds = requireArray(intent.worlds, "/worlds", errors, { layer: "intent" });
  const worldRecords = worlds.map((world, index) => validateWorld(world, index, catalogMap, paperInfo, errors, warnings, intent.schemaVersion));
  const worldMap = new Map();
  for (const [index, record] of worldRecords.entries()) {
    if (!record.id) continue;
    if (worldMap.has(record.id)) add(errors, "DUPLICATE_ID", `/worlds/${index}/id`, `duplicate world id: ${record.id}`, { layer: "intent" });
    else worldMap.set(record.id, record);
  }

  const scenes = requireArray(intent.scenes, "/scenes", errors, { layer: "intent" });
  const sceneIds = new Set();
  for (const [sceneIndex, sceneValue] of scenes.entries()) {
    const path = `/scenes/${sceneIndex}`;
    const scene = requireObject(sceneValue, path, errors, { layer: "intent" });
    const id = requireString(scene.id, `${path}/id`, errors, { layer: "intent" });
    const context = { layer: "intent", sceneId: id };
    if (id && sceneIds.has(id)) add(errors, "DUPLICATE_ID", `${path}/id`, `duplicate scene id: ${id}`, context);
    if (id) sceneIds.add(id);
    requireString(scene.title, `${path}/title`, errors, context);
    const world = worldMap.get(scene.worldId);
    if (!world) add(errors, "MISSING_REFERENCE", `${path}/worldId`, `missing world: ${scene.worldId}`, context);
    checkRefs(scene.claimIds, paperInfo.claims, `${path}/claimIds`, errors, context);
    checkRefs(scene.evidenceIds, paperInfo.evidence, `${path}/evidenceIds`, errors, context);
    if (intent.schemaVersion === "2.1") {
      const presentation = requireObject(scene.presentation, `${path}/presentation`, errors, context);
      if (!treatments.has(presentation.treatment)) add(errors, "INVALID_TREATMENT", `${path}/presentation/treatment`, `unsupported treatment: ${presentation.treatment}`, context);
      if (presentation.cameraPolicy !== "static_first") add(errors, "INVALID_CAMERA_POLICY", `${path}/presentation/cameraPolicy`, `Visual Intent 2.1 requires cameraPolicy static_first`, context);
      if (world && !world.frameIds.has(presentation.defaultFrameId)) add(errors, "MISSING_REFERENCE", `${path}/presentation/defaultFrameId`, `missing default frame: ${presentation.defaultFrameId}`, context);
      if (world?.template && Array.isArray(world.template.supportedTreatments) && !world.template.supportedTreatments.includes(presentation.treatment)) add(errors, "UNSUPPORTED_TREATMENT", `${path}/presentation/treatment`, `${world.world.templateId} does not support treatment ${presentation.treatment}`, context);
    }
    const steps = requireArray(scene.steps, `${path}/steps`, errors, context);
    if (steps.length === 0) add(errors, "EMPTY_STEPS", `${path}/steps`, `scene ${id} must contain a step`, context);
    const stepIds = new Set();
    for (const [stepIndex, stepValue] of steps.entries()) {
      const stepPath = `${path}/steps/${stepIndex}`;
      const step = requireObject(stepValue, stepPath, errors, context);
      const stepId = requireString(step.id, `${stepPath}/id`, errors, context);
      const stepContext = { ...context, stepId };
      if (stepId && stepIds.has(stepId)) add(errors, "DUPLICATE_ID", `${stepPath}/id`, `duplicate step id: ${stepId}`, stepContext);
      if (stepId) stepIds.add(stepId);
      requireString(step.narration, `${stepPath}/narration`, errors, stepContext);
      if (step.viewMode !== undefined && !viewModes.has(step.viewMode)) add(errors, "INVALID_VIEW_MODE", `${stepPath}/viewMode`, `unsupported viewMode: ${step.viewMode}`, stepContext);
      if (intent.schemaVersion === "2.1" && (step.focusIds !== undefined || step.viewMode !== undefined || step.focusMode !== undefined)) add(errors, "LEGACY_CAMERA_FIELDS", stepPath, `Visual Intent 2.1 uses frameId and emphasisIds instead of focusIds/viewMode/focusMode`, stepContext);
      if (world) {
        checkRefs(step.focusIds, world.visualIds, `${stepPath}/focusIds`, errors, stepContext);
        checkRefs(step.emphasisIds, world.visualIds, `${stepPath}/emphasisIds`, errors, stepContext);
        checkRefs(step.requiredReadableIds, world.visualIds, `${stepPath}/requiredReadableIds`, errors, stepContext);
        checkRefs(step.visibleIds, world.objectIds, `${stepPath}/visibleIds`, errors, stepContext);
        checkRefs(step.activeRelationIds, world.relationIds, `${stepPath}/activeRelationIds`, errors, stepContext);
        if (intent.schemaVersion === "2.1") {
          const frameId = requireString(step.frameId, `${stepPath}/frameId`, errors, stepContext);
          if (frameId && !world.frameIds.has(frameId)) add(errors, "MISSING_REFERENCE", `${stepPath}/frameId`, `missing frame: ${frameId}`, stepContext);
          const frame = world.frameMap.get(frameId);
          if (frameId && frameId !== scene.presentation?.defaultFrameId && !cameraReasons.has(frame?.request?.reason)) add(errors, "CAMERA_REASON_REQUIRED", `${stepPath}/frameId`, `non-default frame ${frameId} requires a readability or spatial-context reason`, stepContext);
          if (step.transition?.strategy === "viaOverview" && stepIndex > 0 && steps[stepIndex - 1]?.frameId === frameId) add(warnings, "UNNECESSARY_VIA_OVERVIEW", `${stepPath}/transition/strategy`, `same-frame step ${step.id} does not need viaOverview`, stepContext);
          if (frame && Array.isArray(step.requiredReadableIds)) {
            const frameReadable = new Set(frame.requiredReadableIds ?? []);
            for (const [readableIndex, readableId] of step.requiredReadableIds.entries()) if (!frameReadable.has(readableId)) add(errors, "FRAME_REQUIRED_CONTENT_MISMATCH", `${stepPath}/requiredReadableIds/${readableIndex}`, `step required content ${readableId} is not declared by frame ${frameId}`, stepContext);
          }
          if (Array.isArray(step.visibleIds) && frame) {
            const visible = new Set(step.visibleIds);
            for (const [readableIndex, readableId] of (step.requiredReadableIds ?? frame.requiredReadableIds ?? []).entries()) {
              const ownerId = world.ownerByVisual.get(readableId);
              if (ownerId && !visible.has(ownerId)) add(errors, "REQUIRED_CONTENT_HIDDEN", `${stepPath}/visibleIds`, `required readable target ${readableId} belongs to hidden object ${ownerId}`, { ...stepContext, frameId, readableIndex });
            }
          }
        }
        if (step.detailViewId !== undefined && step.detailViewId !== null && !world.detailIds.has(step.detailViewId)) add(errors, "MISSING_REFERENCE", `${stepPath}/detailViewId`, `missing detail view: ${step.detailViewId}`, stepContext);
        if (Array.isArray(step.visibleIds) && Array.isArray(step.focusIds)) {
          const visible = new Set(step.visibleIds);
          for (const [focusIndex, focusId] of step.focusIds.entries()) {
            const ownerId = world.ownerByVisual.get(focusId);
            if (ownerId && !visible.has(ownerId)) add(errors, "FOCUS_HIDDEN", `${stepPath}/focusIds/${focusIndex}`, `focus ${focusId} belongs to hidden object ${ownerId}`, stepContext);
          }
        }
        if (Array.isArray(step.visibleIds) && Array.isArray(step.emphasisIds)) {
          const visible = new Set(step.visibleIds);
          for (const [emphasisIndex, emphasisId] of step.emphasisIds.entries()) {
            const ownerId = world.ownerByVisual.get(emphasisId);
            if (ownerId && !visible.has(ownerId)) add(errors, "EMPHASIS_HIDDEN", `${stepPath}/emphasisIds/${emphasisIndex}`, `emphasis ${emphasisId} belongs to hidden object ${ownerId}`, stepContext);
          }
        }
        if (Array.isArray(step.visibleIds) && Array.isArray(step.requiredReadableIds)) {
          const visible = new Set(step.visibleIds);
          for (const [readableIndex, readableId] of step.requiredReadableIds.entries()) {
            const ownerId = world.ownerByVisual.get(readableId);
            if (ownerId && !visible.has(ownerId)) add(errors, "REQUIRED_CONTENT_HIDDEN", `${stepPath}/requiredReadableIds/${readableIndex}`, `required content ${readableId} belongs to hidden object ${ownerId}`, stepContext);
          }
        }
        const state = isObject(step.state) ? step.state : {};
        if (isObject(state.visibleItems)) for (const [objectId, itemIds] of Object.entries(state.visibleItems)) {
          const object = world.objectMap.get(objectId);
          if (!object || object.kind !== "chart") add(errors, "INVALID_STATE_TARGET", `${stepPath}/state/visibleItems/${objectId}`, `visibleItems target must be a chart: ${objectId}`, stepContext);
          else if (Array.isArray(itemIds)) {
            const knownItems = new Set((object.items ?? []).map((item) => item.id));
            checkRefs(itemIds, knownItems, `${stepPath}/state/visibleItems/${objectId}`, errors, stepContext, { optional: false });
            if (!itemIds.includes(object.baselineId)) add(errors, "BASELINE_HIDDEN", `${stepPath}/state/visibleItems/${objectId}`, `chart baseline must remain visible: ${object.baselineId}`, stepContext);
            for (const readableId of step.requiredReadableIds ?? []) if (world.ownerByVisual.get(readableId) === objectId && !itemIds.includes(readableId)) add(errors, "REQUIRED_CONTENT_HIDDEN", `${stepPath}/state/visibleItems/${objectId}`, `required chart item must be visible: ${readableId}`, stepContext);
          } else add(errors, "EXPECTED_ARRAY", `${stepPath}/state/visibleItems/${objectId}`, `visibleItems state must be an array`, stepContext);
        }
        if (isObject(state.selectedRegions)) for (const [objectId, regionId] of Object.entries(state.selectedRegions)) {
          const object = world.objectMap.get(objectId);
          const knownRegions = new Set((object?.kind === "image" ? object.regions ?? [] : []).map((region) => region.id));
          if (!object || object.kind !== "image") add(errors, "INVALID_STATE_TARGET", `${stepPath}/state/selectedRegions/${objectId}`, `selectedRegions target must be an image: ${objectId}`, stepContext);
          else if (regionId !== null && (typeof regionId !== "string" || !knownRegions.has(regionId))) add(errors, "MISSING_REFERENCE", `${stepPath}/state/selectedRegions/${objectId}`, `missing image region: ${regionId}`, stepContext);
        }
      }
      checkRefs(step.evidenceIds, paperInfo.evidence, `${stepPath}/evidenceIds`, errors, stepContext);
      if (step.transition?.strategy !== undefined && !transitions.has(step.transition.strategy)) add(errors, "INVALID_TRANSITION", `${stepPath}/transition/strategy`, `unsupported transition: ${step.transition.strategy}`, stepContext);
    }
  }
  return { errors, warnings };
}

function validateBounds(bounds, path, errors, context) {
  const object = requireObject(bounds, path, errors, context);
  if (![object.x, object.y, object.width, object.height].every(finite) || object.width <= 0 || object.height <= 0) {
    add(errors, "INVALID_BOUNDS", path, `${path} must contain finite positive bounds`, context);
  }
}

function containsBounds(container, item, epsilon = .01) {
  return item.x >= container.x - epsilon && item.y >= container.y - epsilon && item.x + item.width <= container.x + container.width + epsilon && item.y + item.height <= container.y + container.height + epsilon;
}

function readableBasePx(object) {
  if (!object) return 14;
  if (["node", "card", "annotation"].includes(object.kind)) return 21;
  if (object.kind === "group") return 17;
  if (object.kind === "equation") return 20;
  if (object.kind === "chart" || object.kind === "code") return 21;
  if (object.kind === "image") return 18;
  return 14;
}

export function validateSceneGraph(sceneValue) {
  const errors = [], warnings = [];
  const scene = requireObject(sceneValue, "", errors);
  if (!sceneVersions.has(scene.schemaVersion)) add(errors, "UNSUPPORTED_SCHEMA_VERSION", "/schemaVersion", `scene schemaVersion must be 2.0 or 2.1`, { layer: "scene" });
  const worlds = collect(scene.worlds, "/worlds", errors, { layer: "scene" });
  const worldMap = new Map();
  for (const [worldIndex, worldValue] of worlds.items.entries()) {
    if (!isObject(worldValue)) continue;
    const path = `/worlds/${worldIndex}`;
    const context = { layer: "scene", worldId: worldValue.id, templateId: worldValue.templateId };
    validateBounds(worldValue.bounds, `${path}/bounds`, errors, context);
    const objects = collect(worldValue.objects, `${path}/objects`, errors, context);
    const objectMap = new Map(objects.items.filter(isObject).map((object) => [object.id, object]));
    for (const [objectIndex, object] of objects.items.entries()) {
      if (!isObject(object)) continue;
      validateBounds(object, `${path}/objects/${objectIndex}`, errors, { ...context, objectId: object.id });
    }
    const anchors = collect(worldValue.anchors, `${path}/anchors`, errors, context);
    for (const [anchorIndex, anchor] of anchors.items.entries()) if (isObject(anchor)) validateBounds(anchor.bounds, `${path}/anchors/${anchorIndex}/bounds`, errors, context);
    const relations = collect(worldValue.relations ?? [], `${path}/relations`, errors, context);
    for (const [relationIndex, relation] of relations.items.entries()) {
      if (!isObject(relation)) continue;
      if (!objectMap.has(relation.from) || !objectMap.has(relation.to) || typeof relation.path !== "string") add(errors, "INVALID_RELATION_GEOMETRY", `${path}/relations/${relationIndex}`, `compiled relation must have valid endpoints and a path`, context);
    }
    const anchorMap = new Map(anchors.items.filter(isObject).map((anchor) => [anchor.id, anchor]));
    const visualIds = new Set([...objects.ids, ...anchors.ids]);
    const frames = collect(worldValue.frames ?? [], `${path}/frames`, errors, context);
    const frameMap = new Map();
    for (const [frameIndex, frame] of frames.items.entries()) {
      if (!isObject(frame)) continue;
      const framePath = `${path}/frames/${frameIndex}`;
      const frameContext = { ...context, frameId: frame.id };
      validateBounds(frame.bounds, `${framePath}/bounds`, errors, frameContext);
      checkRefs(frame.targetIds, visualIds, `${framePath}/targetIds`, errors, frameContext, { optional: false });
      checkRefs(frame.requiredReadableIds, visualIds, `${framePath}/requiredReadableIds`, errors, frameContext, { optional: false });
      const readableObjects = [];
      for (const [readableIndex, readableId] of (frame.requiredReadableIds ?? []).entries()) {
        const object = objectMap.get(readableId) ?? objectMap.get(anchorMap.get(readableId)?.ownerId);
        const bounds = objectMap.get(readableId) ?? anchorMap.get(readableId)?.bounds;
        if (bounds && isObject(frame.bounds) && !containsBounds(frame.bounds, bounds)) add(errors, "FRAME_REQUIRED_CONTENT_CLIPPED", `${framePath}/requiredReadableIds/${readableIndex}`, `frame ${frame.id} does not fully contain required content ${readableId}`, frameContext);
        if (object) readableObjects.push(object);
      }
      if (isObject(frame.bounds) && readableObjects.length > 0) for (const profile of readabilityProfiles) {
        const scale = Math.min(profile.width / frame.bounds.width, profile.height / frame.bounds.height);
        const projected = Math.min(...readableObjects.map((object) => readableBasePx(object) * scale));
        if (projected < profile.minimumPx) add(warnings, "READABILITY_RISK", `${framePath}/requiredReadableIds`, `${frame.id} projects required text to about ${projected.toFixed(1)}px in ${profile.id}; target is ${profile.minimumPx}px`, { ...frameContext, profile: profile.id });
      }
      if (typeof frame.id === "string") frameMap.set(frame.id, frame);
    }
    worldMap.set(worldValue.id, { objectIds: objects.ids, visualIds, relationIds: relations.ids, frameIds: frames.ids, frameMap });
  }
  const scenes = collect(scene.scenes, "/scenes", errors, { layer: "scene" });
  for (const [sceneIndex, sceneItem] of scenes.items.entries()) {
    if (!isObject(sceneItem)) continue;
    const path = `/scenes/${sceneIndex}`;
    const context = { layer: "scene", sceneId: sceneItem.id };
    const world = worldMap.get(sceneItem.worldId);
    if (!world) add(errors, "MISSING_REFERENCE", `${path}/worldId`, `compiled scene references missing world: ${sceneItem.worldId}`, context);
    const steps = collect(sceneItem.steps, `${path}/steps`, errors, context);
    for (const [stepIndex, step] of steps.items.entries()) {
      if (!isObject(step)) continue;
      const stepPath = `${path}/steps/${stepIndex}`;
      validateBounds(step.camera?.bounds, `${stepPath}/camera/bounds`, errors, { ...context, stepId: step.id });
      if (world) {
        checkRefs(step.visual?.visibleIds, world.objectIds, `${stepPath}/visual/visibleIds`, errors, context, { optional: false });
        checkRefs(step.visual?.emphasisIds, world.visualIds, `${stepPath}/visual/emphasisIds`, errors, context, { optional: false });
        checkRefs(step.visual?.activeRelationIds, world.relationIds, `${stepPath}/visual/activeRelationIds`, errors, context, { optional: false });
        checkRefs(step.visual?.requiredReadableIds, world.visualIds, `${stepPath}/visual/requiredReadableIds`, errors, context, { optional: false });
        if (scene.schemaVersion === "2.1" && !world.frameIds.has(step.camera?.frameId)) add(errors, "MISSING_REFERENCE", `${stepPath}/camera/frameId`, `compiled camera references missing frame: ${step.camera?.frameId}`, context);
      }
    }
  }
  return { errors, warnings };
}

export function validateData(paper, intent, scene, catalog) {
  const source = validateSource(paper, intent, catalog);
  if (!scene) return source;
  const compiled = validateSceneGraph(scene);
  return { errors: [...source.errors, ...compiled.errors], warnings: [...source.warnings, ...compiled.warnings] };
}
