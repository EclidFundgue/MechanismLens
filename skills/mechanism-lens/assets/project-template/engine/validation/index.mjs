import { add, checkRefs, collect, finite, isObject, requireArray, requireObject, requireString } from "./helpers.mjs";

const paperGroups = ["evidence", "claims", "contributions", "concepts", "modules", "relations", "equations", "algorithms", "experiments", "figures"];
const objectKinds = new Set(["group", "node", "card", "annotation", "equation", "code", "chart", "image"]);
const relationKinds = new Set(["direct_call", "function_reference", "registration", "import", "read", "write", "dynamic_candidate", "contains"]);
const evidenceBases = new Set(["source_fact", "static_inference", "runtime_observation"]);
const transitions = new Set(["direct", "viaOverview"]);
const cameraReasons = new Set(["required_content_unreadable", "inspect_source_detail", "restore_spatial_context"]);
const treatments = new Set(["static_emphasis", "progressive_reveal", "parts_then_whole", "overview_detail_spotlight"]);
const forbiddenMetadata = new Set(["schemaVersion", "compilerVersion", "templateCatalogVersion", "sourceHash", "fileHash", "contentHash", "commit", "branch", "snapshotId", "dirty"]);
const readabilityProfiles = [
  { id: "desktop", width: 1080, height: 540, minimumPx: 18 },
  { id: "narrow", width: 360, height: 300, minimumPx: 14 },
];

function rejectManagedMetadata(value, path, errors, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectManagedMetadata(item, `${path}/${index}`, errors, seen));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}/${key}`;
    if (forbiddenMetadata.has(key)) add(errors, "FORBIDDEN_METADATA", childPath, `${key} is not part of the current contract`);
    rejectManagedMetadata(child, childPath, errors, seen);
  }
}

function validatePaper(paperValue, errors) {
  const paper = requireObject(paperValue, "/paper-ir", errors, { layer: "paper" });
  rejectManagedMetadata(paper, "/paper-ir", errors);
  const meta = requireObject(paper.paper, "/paper-ir/paper", errors, { layer: "paper" });
  const id = requireString(meta.id, "/paper-ir/paper/id", errors, { layer: "paper" });
  requireString(meta.title, "/paper-ir/paper/title", errors, { layer: "paper" });
  const sets = new Map(), values = new Map();
  for (const group of paperGroups) {
    const result = collect(paper[group], `/paper-ir/${group}`, errors, { layer: "paper" });
    sets.set(group, result.ids);
    values.set(group, result.items);
  }
  const evidence = sets.get("evidence");
  for (const group of paperGroups.filter((name) => name !== "evidence")) for (const [index, item] of values.get(group).entries()) {
    if (isObject(item)) checkRefs(item.evidenceIds, evidence, `/paper-ir/${group}/${index}/evidenceIds`, errors, { layer: "paper", objectId: item.id }, { optional: group !== "claims" && group !== "contributions" });
  }
  const objectIds = new Set(paperGroups.filter((name) => name !== "evidence").flatMap((name) => [...sets.get(name)]));
  return { id, kind: "paper", title: meta.title, meta, evidence, objectIds, value: paper };
}

function validateCode(codeValue, errors) {
  const code = requireObject(codeValue, "/code-ir", errors, { layer: "code" });
  rejectManagedMetadata(code, "/code-ir", errors);
  const repository = requireObject(code.repository, "/code-ir/repository", errors, { layer: "code" });
  const id = requireString(repository.id, "/code-ir/repository/id", errors, { layer: "code" });
  requireString(repository.title, "/code-ir/repository/title", errors, { layer: "code" });
  requireString(repository.location, "/code-ir/repository/location", errors, { layer: "code" });
  requireString(code.question, "/code-ir/question", errors, { layer: "code" });
  const evidence = collect(code.evidence, "/code-ir/evidence", errors, { layer: "code" });
  for (const [index, item] of evidence.items.entries()) {
    if (!isObject(item)) continue;
    const path = `/code-ir/evidence/${index}`;
    requireString(item.path, `${path}/path`, errors, { layer: "code", objectId: item.id });
    requireString(item.excerpt, `${path}/excerpt`, errors, { layer: "code", objectId: item.id });
    if (!Number.isInteger(item.lineStart) || item.lineStart < 1 || !Number.isInteger(item.lineEnd) || item.lineEnd < item.lineStart) add(errors, "INVALID_LINE_RANGE", path, `code evidence ${item.id} has an invalid line range`, { layer: "code", objectId: item.id });
    if (!evidenceBases.has(item.basis)) add(errors, "INVALID_EVIDENCE_BASIS", `${path}/basis`, `unsupported evidence basis: ${item.basis}`, { layer: "code", objectId: item.id });
  }
  const entities = collect(code.entities, "/code-ir/entities", errors, { layer: "code" });
  for (const [index, item] of entities.items.entries()) if (isObject(item)) checkRefs(item.evidenceIds, evidence.ids, `/code-ir/entities/${index}/evidenceIds`, errors, { layer: "code", objectId: item.id }, { optional: false });
  const relations = collect(code.relations, "/code-ir/relations", errors, { layer: "code" });
  for (const [index, item] of relations.items.entries()) {
    if (!isObject(item)) continue;
    const path = `/code-ir/relations/${index}`;
    if (!relationKinds.has(item.kind)) add(errors, "INVALID_CODE_RELATION", `${path}/kind`, `unsupported code relation: ${item.kind}`, { layer: "code", objectId: item.id });
    if (!entities.ids.has(item.from)) add(errors, "MISSING_REFERENCE", `${path}/from`, `missing code entity: ${item.from}`, { layer: "code", objectId: item.id });
    if (!entities.ids.has(item.to)) add(errors, "MISSING_REFERENCE", `${path}/to`, `missing code entity: ${item.to}`, { layer: "code", objectId: item.id });
    checkRefs(item.evidenceIds, evidence.ids, `${path}/evidenceIds`, errors, { layer: "code", objectId: item.id }, { optional: false });
  }
  const entrypoints = collect(code.entrypoints, "/code-ir/entrypoints", errors, { layer: "code" });
  for (const [index, item] of entrypoints.items.entries()) if (isObject(item)) {
    if (!entities.ids.has(item.entityId)) add(errors, "MISSING_REFERENCE", `/code-ir/entrypoints/${index}/entityId`, `missing code entity: ${item.entityId}`, { layer: "code", objectId: item.id });
    checkRefs(item.evidenceIds, evidence.ids, `/code-ir/entrypoints/${index}/evidenceIds`, errors, { layer: "code", objectId: item.id }, { optional: false });
  }
  requireArray(code.unresolved, "/code-ir/unresolved", errors, { layer: "code" });
  const objectIds = new Set([...entities.ids, ...relations.ids, ...entrypoints.ids]);
  return { id, kind: "code", title: repository.title, meta: repository, evidence: evidence.ids, objectIds, value: code };
}

function validateEvidenceRefs(refsValue, path, sources, errors, context, { optional = true } = {}) {
  if (refsValue === undefined && optional) return;
  const refs = requireArray(refsValue, path, errors, context);
  for (const [index, refValue] of refs.entries()) {
    const ref = requireObject(refValue, `${path}/${index}`, errors, context);
    const source = sources.get(ref.sourceId);
    if (!source) add(errors, "MISSING_REFERENCE", `${path}/${index}/sourceId`, `missing source: ${ref.sourceId}`, context);
    else if (!source.evidence.has(ref.evidenceId)) add(errors, "MISSING_REFERENCE", `${path}/${index}/evidenceId`, `missing evidence ${ref.evidenceId} in ${ref.sourceId}`, context);
  }
}

function validateMechanism(mechanismValue, sources, errors) {
  const mechanism = requireObject(mechanismValue, "/mechanism-ir", errors, { layer: "mechanism" });
  rejectManagedMetadata(mechanism, "/mechanism-ir", errors);
  const id = requireString(mechanism.id, "/mechanism-ir/id", errors, { layer: "mechanism" });
  requireString(mechanism.title, "/mechanism-ir/title", errors, { layer: "mechanism" });
  requireString(mechanism.question, "/mechanism-ir/question", errors, { layer: "mechanism" });
  const declaredSources = requireArray(mechanism.sources, "/mechanism-ir/sources", errors, { layer: "mechanism" });
  const declaredSourceIds = new Set();
  for (const [index, source] of declaredSources.entries()) {
    const item = requireObject(source, `/mechanism-ir/sources/${index}`, errors, { layer: "mechanism" });
    if (declaredSourceIds.has(item.id)) add(errors, "DUPLICATE_ID", `/mechanism-ir/sources/${index}/id`, `duplicate source: ${item.id}`, { layer: "mechanism" });
    declaredSourceIds.add(item.id);
    const actual = sources.get(item.id);
    if (!actual) add(errors, "MISSING_REFERENCE", `/mechanism-ir/sources/${index}/id`, `source is not available: ${item.id}`, { layer: "mechanism" });
    else if (actual.kind !== item.kind) add(errors, "SOURCE_KIND_MISMATCH", `/mechanism-ir/sources/${index}/kind`, `${item.id} is ${actual.kind}, not ${item.kind}`, { layer: "mechanism" });
  }
  const participants = collect(mechanism.participants, "/mechanism-ir/participants", errors, { layer: "mechanism" });
  const states = collect(mechanism.states, "/mechanism-ir/states", errors, { layer: "mechanism" });
  const semanticIds = new Set([...participants.ids, ...states.ids]);
  for (const [group, result] of [["participants", participants], ["states", states]]) for (const [index, item] of result.items.entries()) {
    if (!isObject(item)) continue;
    validateEvidenceRefs(item.evidenceRefs, `/mechanism-ir/${group}/${index}/evidenceRefs`, sources, errors, { layer: "mechanism", objectId: item.id });
    for (const [refIndex, sourceRefValue] of requireArray(item.sourceRefs ?? [], `/mechanism-ir/${group}/${index}/sourceRefs`, errors, { layer: "mechanism", objectId: item.id }).entries()) {
      const sourceRef = requireObject(sourceRefValue, `/mechanism-ir/${group}/${index}/sourceRefs/${refIndex}`, errors, { layer: "mechanism", objectId: item.id });
      const source = sources.get(sourceRef.sourceId);
      if (!source || !source.objectIds.has(sourceRef.objectId)) add(errors, "MISSING_REFERENCE", `/mechanism-ir/${group}/${index}/sourceRefs/${refIndex}`, `missing source object ${sourceRef.sourceId}:${sourceRef.objectId}`, { layer: "mechanism", objectId: item.id });
    }
  }
  const scenarios = collect(mechanism.scenarios, "/mechanism-ir/scenarios", errors, { layer: "mechanism" });
  const stepIds = new Set();
  for (const [scenarioIndex, scenario] of scenarios.items.entries()) {
    if (!isObject(scenario)) continue;
    semanticIds.add(scenario.id);
    if (!evidenceBases.has(scenario.basis)) add(errors, "INVALID_EVIDENCE_BASIS", `/mechanism-ir/scenarios/${scenarioIndex}/basis`, `unsupported scenario basis: ${scenario.basis}`, { layer: "mechanism", objectId: scenario.id });
    const steps = collect(scenario.steps, `/mechanism-ir/scenarios/${scenarioIndex}/steps`, errors, { layer: "mechanism", objectId: scenario.id });
    for (const [stepIndex, step] of steps.items.entries()) {
      if (!isObject(step)) continue;
      const path = `/mechanism-ir/scenarios/${scenarioIndex}/steps/${stepIndex}`;
      if (stepIds.has(step.id)) add(errors, "DUPLICATE_ID", `${path}/id`, `duplicate mechanism step: ${step.id}`, { layer: "mechanism", objectId: step.id });
      stepIds.add(step.id); semanticIds.add(step.id);
      requireString(step.explanation, `${path}/explanation`, errors, { layer: "mechanism", objectId: step.id });
      if (!evidenceBases.has(step.basis)) add(errors, "INVALID_EVIDENCE_BASIS", `${path}/basis`, `unsupported step basis: ${step.basis}`, { layer: "mechanism", objectId: step.id });
      validateEvidenceRefs(step.evidenceRefs, `${path}/evidenceRefs`, sources, errors, { layer: "mechanism", objectId: step.id }, { optional: false });
      checkRefs(step.participantIds, participants.ids, `${path}/participantIds`, errors, { layer: "mechanism", objectId: step.id });
    }
  }
  return { id, semanticIds, stepIds, value: mechanism };
}

function collectVisualIds(world, worldPath, errors, context) {
  const { items: objects, ids: objectIds } = collect(world.objects, `${worldPath}/objects`, errors, context);
  const visualIds = new Set(objectIds), ownerByVisual = new Map([...objectIds].map((id) => [id, id]));
  for (const [index, object] of objects.entries()) {
    if (!isObject(object)) continue;
    for (const [key, nested] of [["parts", object.parts], ["lines", object.lines], ["items", object.items], ["regions", object.regions]]) {
      if (nested === undefined) continue;
      const result = collect(nested, `${worldPath}/objects/${index}/${key}`, errors, { ...context, objectId: object.id });
      for (const id of result.ids) {
        if (visualIds.has(id)) add(errors, "DUPLICATE_ID", `${worldPath}/objects/${index}/${key}`, `visual id is already used in world: ${id}`, context);
        visualIds.add(id); ownerByVisual.set(id, object.id);
      }
    }
  }
  return { objects, objectIds, visualIds, ownerByVisual };
}

function parentCycles(objects, objectMap, worldPath, errors, context) {
  for (const [index, object] of objects.entries()) {
    if (!isObject(object) || typeof object.id !== "string") continue;
    const visited = new Set([object.id]); let cursor = object;
    while (typeof cursor.parentId === "string") {
      if (visited.has(cursor.parentId)) { add(errors, "PARENT_CYCLE", `${worldPath}/objects/${index}/parentId`, `parent cycle includes ${cursor.parentId}`, { ...context, objectId: object.id }); break; }
      visited.add(cursor.parentId); cursor = objectMap.get(cursor.parentId); if (!cursor) break;
    }
  }
}

function validateWorld(worldValue, index, catalogMap, mechanismInfo, errors, warnings) {
  const path = `/visual-intent/worlds/${index}`;
  const world = requireObject(worldValue, path, errors, { layer: "intent" });
  const id = requireString(world.id, `${path}/id`, errors, { layer: "intent" });
  const templateId = requireString(world.templateId, `${path}/templateId`, errors, { layer: "intent", worldId: id });
  const context = { layer: "intent", worldId: id, templateId };
  const template = catalogMap.get(templateId);
  if (templateId && !template) add(errors, "UNKNOWN_TEMPLATE", `${path}/templateId`, `unknown template: ${templateId}`, context);
  const { objects, objectIds, visualIds, ownerByVisual } = collectVisualIds(world, path, errors, context);
  const objectMap = new Map(objects.filter(isObject).map((object) => [object.id, object])), kinds = new Set();
  for (const [objectIndex, object] of objects.entries()) {
    if (!isObject(object)) continue;
    const objectPath = `${path}/objects/${objectIndex}`, objectContext = { ...context, objectId: object.id };
    if (!objectKinds.has(object.kind)) add(errors, "UNKNOWN_PRIMITIVE", `${objectPath}/kind`, `unknown primitive kind: ${object.kind}`, objectContext); else kinds.add(object.kind);
    if (template && !template.allowedKinds.includes(object.kind)) add(errors, "TEMPLATE_KIND_MISMATCH", `${objectPath}/kind`, `${templateId} does not allow ${object.kind}`, objectContext);
    if (object.parentId !== undefined && (!objectIds.has(object.parentId) || objectMap.get(object.parentId)?.kind !== "group")) add(errors, "INVALID_PARENT", `${objectPath}/parentId`, `parent must reference a group: ${object.parentId}`, objectContext);
    if (object.mechanismRef !== undefined && !mechanismInfo.semanticIds.has(object.mechanismRef)) add(errors, "MISSING_REFERENCE", `${objectPath}/mechanismRef`, `missing mechanism object: ${object.mechanismRef}`, objectContext);
    if (object.kind === "chart" && Array.isArray(object.items) && object.items.length > 7) add(warnings, "DENSE_COMPARISON", `${objectPath}/items`, `chart ${object.id} has ${object.items.length} items`, objectContext);
    if (object.kind === "image" && Array.isArray(object.regions)) for (const [regionIndex, region] of object.regions.entries()) if (isObject(region)) {
      const values = [region.x, region.y, region.width, region.height];
      if (!values.every(finite) || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 || region.x + region.width > 1 || region.y + region.height > 1) add(errors, "INVALID_REGION", `${objectPath}/regions/${regionIndex}`, `region ${region.id} must stay inside normalized image bounds`, objectContext);
    }
  }
  parentCycles(objects, objectMap, path, errors, context);
  if (template) for (const kind of template.requiredKinds) if (!kinds.has(kind)) add(errors, "MISSING_TEMPLATE_SLOT", `${path}/objects`, `${templateId} requires at least one ${kind}`, context);
  const relations = collect(world.relations ?? [], `${path}/relations`, errors, context);
  for (const [relationIndex, relation] of relations.items.entries()) if (isObject(relation)) {
    if (!objectIds.has(relation.from)) add(errors, "MISSING_REFERENCE", `${path}/relations/${relationIndex}/from`, `missing relation source: ${relation.from}`, context);
    if (!objectIds.has(relation.to)) add(errors, "MISSING_REFERENCE", `${path}/relations/${relationIndex}/to`, `missing relation target: ${relation.to}`, context);
    if (relation.mechanismRef !== undefined && !mechanismInfo.semanticIds.has(relation.mechanismRef)) add(errors, "MISSING_REFERENCE", `${path}/relations/${relationIndex}/mechanismRef`, `missing mechanism object: ${relation.mechanismRef}`, context);
  }
  const detailViews = collect(world.detailViews ?? [], `${path}/detailViews`, errors, context);
  for (const [detailIndex, detail] of detailViews.items.entries()) if (isObject(detail)) {
    if (!visualIds.has(detail.explainsObjectId)) add(errors, "MISSING_REFERENCE", `${path}/detailViews/${detailIndex}/explainsObjectId`, `detail view target is missing: ${detail.explainsObjectId}`, context);
    collectVisualIds(detail, `${path}/detailViews/${detailIndex}`, errors, context);
  }
  const frames = collect(world.frames, `${path}/frames`, errors, context);
  if (frames.items.length === 0) add(errors, "MISSING_FRAMES", `${path}/frames`, `world ${id} must define at least one fixed frame`, context);
  const frameMap = new Map();
  for (const [frameIndex, frame] of frames.items.entries()) if (isObject(frame)) {
    const framePath = `${path}/frames/${frameIndex}`, frameContext = { ...context, frameId: frame.id };
    checkRefs(frame.targetIds, visualIds, `${framePath}/targetIds`, errors, frameContext, { optional: false });
    checkRefs(frame.requiredReadableIds, visualIds, `${framePath}/requiredReadableIds`, errors, frameContext, { optional: false });
    if (!["fit", "tight", "contextual"].includes(frame.mode)) add(errors, "INVALID_FRAME_MODE", `${framePath}/mode`, `unsupported frame mode: ${frame.mode}`, frameContext);
    if (frame.request?.reason !== undefined && !cameraReasons.has(frame.request.reason)) add(errors, "INVALID_CAMERA_REASON", `${framePath}/request/reason`, `unsupported camera request reason: ${frame.request.reason}`, frameContext);
    if (typeof frame.id === "string") frameMap.set(frame.id, frame);
  }
  return { id, world, template, objectIds, visualIds, ownerByVisual, objectMap, relationIds: relations.ids, detailIds: detailViews.ids, frameIds: frames.ids, frameMap };
}

function validateIntent(intentValue, catalogValue, mechanismInfo, errors, warnings) {
  const intent = requireObject(intentValue, "/visual-intent", errors, { layer: "intent" });
  rejectManagedMetadata(intent, "/visual-intent", errors);
  if (intent.mechanismId !== mechanismInfo.id) add(errors, "MECHANISM_ID_MISMATCH", "/visual-intent/mechanismId", `visual intent mechanismId must match Mechanism IR id`, { layer: "intent" });
  const catalog = requireObject(catalogValue, "/catalog", errors, { layer: "catalog" });
  rejectManagedMetadata(catalog, "/catalog", errors);
  const templates = collect(catalog.templates, "/catalog/templates", errors, { layer: "catalog" });
  const catalogMap = new Map(templates.items.filter(isObject).map((template) => [template.id, template]));
  const worlds = requireArray(intent.worlds, "/visual-intent/worlds", errors, { layer: "intent" });
  const records = worlds.map((world, index) => validateWorld(world, index, catalogMap, mechanismInfo, errors, warnings));
  const worldMap = new Map(records.filter((item) => item.id).map((item) => [item.id, item]));
  const scenes = requireArray(intent.scenes, "/visual-intent/scenes", errors, { layer: "intent" });
  const sceneIds = new Set();
  for (const [sceneIndex, sceneValue] of scenes.entries()) {
    const path = `/visual-intent/scenes/${sceneIndex}`, scene = requireObject(sceneValue, path, errors, { layer: "intent" });
    const id = requireString(scene.id, `${path}/id`, errors, { layer: "intent" }), context = { layer: "intent", sceneId: id };
    if (id && sceneIds.has(id)) add(errors, "DUPLICATE_ID", `${path}/id`, `duplicate scene id: ${id}`, context); sceneIds.add(id);
    requireString(scene.title, `${path}/title`, errors, context);
    const world = worldMap.get(scene.worldId);
    if (!world) add(errors, "MISSING_REFERENCE", `${path}/worldId`, `missing world: ${scene.worldId}`, context);
    const presentation = requireObject(scene.presentation, `${path}/presentation`, errors, context);
    if (!treatments.has(presentation.treatment)) add(errors, "INVALID_TREATMENT", `${path}/presentation/treatment`, `unsupported treatment: ${presentation.treatment}`, context);
    if (presentation.cameraPolicy !== "static_first") add(errors, "INVALID_CAMERA_POLICY", `${path}/presentation/cameraPolicy`, `cameraPolicy must be static_first`, context);
    if (world && !world.frameIds.has(presentation.defaultFrameId)) add(errors, "MISSING_REFERENCE", `${path}/presentation/defaultFrameId`, `missing default frame: ${presentation.defaultFrameId}`, context);
    if (world?.template?.supportedTreatments && !world.template.supportedTreatments.includes(presentation.treatment)) add(errors, "UNSUPPORTED_TREATMENT", `${path}/presentation/treatment`, `${world.world.templateId} does not support ${presentation.treatment}`, context);
    const steps = requireArray(scene.steps, `${path}/steps`, errors, context), stepIds = new Set();
    if (steps.length === 0) add(errors, "EMPTY_STEPS", `${path}/steps`, `scene ${id} must contain a step`, context);
    for (const [stepIndex, stepValue] of steps.entries()) {
      const stepPath = `${path}/steps/${stepIndex}`, step = requireObject(stepValue, stepPath, errors, context);
      const stepId = requireString(step.id, `${stepPath}/id`, errors, context), stepContext = { ...context, stepId };
      if (stepId && stepIds.has(stepId)) add(errors, "DUPLICATE_ID", `${stepPath}/id`, `duplicate step id: ${stepId}`, stepContext); stepIds.add(stepId);
      requireString(step.narration, `${stepPath}/narration`, errors, stepContext);
      checkRefs(step.mechanismStepIds, mechanismInfo.stepIds, `${stepPath}/mechanismStepIds`, errors, stepContext, { optional: false });
      if (world) {
        checkRefs(step.emphasisIds, world.visualIds, `${stepPath}/emphasisIds`, errors, stepContext);
        checkRefs(step.requiredReadableIds, world.visualIds, `${stepPath}/requiredReadableIds`, errors, stepContext);
        checkRefs(step.visibleIds, world.objectIds, `${stepPath}/visibleIds`, errors, stepContext);
        checkRefs(step.activeRelationIds, world.relationIds, `${stepPath}/activeRelationIds`, errors, stepContext);
        const frameId = requireString(step.frameId, `${stepPath}/frameId`, errors, stepContext), frame = world.frameMap.get(frameId);
        if (frameId && !frame) add(errors, "MISSING_REFERENCE", `${stepPath}/frameId`, `missing frame: ${frameId}`, stepContext);
        if (frameId && frameId !== presentation.defaultFrameId && !cameraReasons.has(frame?.request?.reason)) add(errors, "CAMERA_REASON_REQUIRED", `${stepPath}/frameId`, `non-default frame ${frameId} requires a reason`, stepContext);
        if (step.transition?.strategy === "viaOverview" && stepIndex > 0 && steps[stepIndex - 1]?.frameId === frameId) add(warnings, "UNNECESSARY_VIA_OVERVIEW", `${stepPath}/transition/strategy`, `same-frame step does not need viaOverview`, stepContext);
        if (step.detailViewId != null && !world.detailIds.has(step.detailViewId)) add(errors, "MISSING_REFERENCE", `${stepPath}/detailViewId`, `missing detail view: ${step.detailViewId}`, stepContext);
        const visible = new Set(step.visibleIds ?? world.objectIds);
        for (const [key, ids] of [["emphasisIds", step.emphasisIds ?? []], ["requiredReadableIds", step.requiredReadableIds ?? frame?.requiredReadableIds ?? []]]) for (const [index, target] of ids.entries()) {
          const owner = world.ownerByVisual.get(target); if (owner && !visible.has(owner)) add(errors, "REQUIRED_CONTENT_HIDDEN", `${stepPath}/${key}/${index}`, `${target} belongs to hidden object ${owner}`, stepContext);
        }
        const state = isObject(step.state) ? step.state : {};
        if (isObject(state.visibleItems)) for (const [objectId, itemIds] of Object.entries(state.visibleItems)) {
          const object = world.objectMap.get(objectId);
          if (!object || object.kind !== "chart") add(errors, "INVALID_STATE_TARGET", `${stepPath}/state/visibleItems/${objectId}`, `visibleItems target must be a chart`, stepContext);
          else if (Array.isArray(itemIds)) {
            checkRefs(itemIds, new Set((object.items ?? []).map((item) => item.id)), `${stepPath}/state/visibleItems/${objectId}`, errors, stepContext, { optional: false });
            if (!itemIds.includes(object.baselineId)) add(errors, "BASELINE_HIDDEN", `${stepPath}/state/visibleItems/${objectId}`, `chart baseline must remain visible`, stepContext);
          }
        }
        if (isObject(state.selectedRegions)) for (const [objectId, regionId] of Object.entries(state.selectedRegions)) {
          const object = world.objectMap.get(objectId), known = new Set((object?.regions ?? []).map((region) => region.id));
          if (!object || object.kind !== "image") add(errors, "INVALID_STATE_TARGET", `${stepPath}/state/selectedRegions/${objectId}`, `selectedRegions target must be an image`, stepContext);
          else if (regionId !== null && !known.has(regionId)) add(errors, "MISSING_REFERENCE", `${stepPath}/state/selectedRegions/${objectId}`, `missing image region: ${regionId}`, stepContext);
        }
      }
      if (step.transition?.strategy !== undefined && !transitions.has(step.transition.strategy)) add(errors, "INVALID_TRANSITION", `${stepPath}/transition/strategy`, `unsupported transition: ${step.transition.strategy}`, stepContext);
    }
  }
  return intent;
}

export function validateSource({ paper = null, code = null, mechanism, intent, catalog }) {
  const errors = [], warnings = [], sources = new Map();
  if (paper) { const info = validatePaper(paper, errors); if (info.id) sources.set(info.id, info); }
  if (code) { const info = validateCode(code, errors); if (info.id) sources.set(info.id, info); }
  const mechanismInfo = validateMechanism(mechanism, sources, errors);
  validateIntent(intent, catalog, mechanismInfo, errors, warnings);
  return { errors, warnings };
}

function validateBounds(bounds, path, errors, context) {
  const object = requireObject(bounds, path, errors, context);
  if (![object.x, object.y, object.width, object.height].every(finite) || object.width <= 0 || object.height <= 0) add(errors, "INVALID_BOUNDS", path, `${path} must contain finite positive bounds`, context);
}
function containsBounds(container, item, epsilon = .01) { return item.x >= container.x - epsilon && item.y >= container.y - epsilon && item.x + item.width <= container.x + container.width + epsilon && item.y + item.height <= container.y + container.height + epsilon; }
function readableBasePx(object) { if (!object) return 14; if (["node", "card", "annotation", "chart", "code"].includes(object.kind)) return 21; if (object.kind === "group") return 17; if (object.kind === "equation") return 20; if (object.kind === "image") return 18; return 14; }

export function validateSceneGraph(sceneValue) {
  const errors = [], warnings = [], scene = requireObject(sceneValue, "", errors, { layer: "scene" });
  rejectManagedMetadata(scene, "", errors);
  requireString(scene.subjectId, "/subjectId", errors, { layer: "scene" });
  const worlds = collect(scene.worlds, "/worlds", errors, { layer: "scene" }), worldMap = new Map();
  for (const [worldIndex, worldValue] of worlds.items.entries()) {
    if (!isObject(worldValue)) continue;
    const path = `/worlds/${worldIndex}`, context = { layer: "scene", worldId: worldValue.id, templateId: worldValue.templateId };
    validateBounds(worldValue.bounds, `${path}/bounds`, errors, context);
    const objects = collect(worldValue.objects, `${path}/objects`, errors, context), objectMap = new Map(objects.items.filter(isObject).map((item) => [item.id, item]));
    for (const [index, object] of objects.items.entries()) if (isObject(object)) validateBounds(object, `${path}/objects/${index}`, errors, { ...context, objectId: object.id });
    const anchors = collect(worldValue.anchors, `${path}/anchors`, errors, context), anchorMap = new Map(anchors.items.filter(isObject).map((item) => [item.id, item]));
    for (const [index, anchor] of anchors.items.entries()) if (isObject(anchor)) validateBounds(anchor.bounds, `${path}/anchors/${index}/bounds`, errors, context);
    const relations = collect(worldValue.relations ?? [], `${path}/relations`, errors, context);
    for (const [index, relation] of relations.items.entries()) if (isObject(relation) && (!objectMap.has(relation.from) || !objectMap.has(relation.to) || typeof relation.path !== "string")) add(errors, "INVALID_RELATION_GEOMETRY", `${path}/relations/${index}`, `compiled relation must have valid endpoints and a path`, context);
    const visualIds = new Set([...objects.ids, ...anchors.ids]), frames = collect(worldValue.frames, `${path}/frames`, errors, context), frameMap = new Map();
    for (const [index, frame] of frames.items.entries()) if (isObject(frame)) {
      const framePath = `${path}/frames/${index}`, frameContext = { ...context, frameId: frame.id };
      validateBounds(frame.bounds, `${framePath}/bounds`, errors, frameContext);
      checkRefs(frame.targetIds, visualIds, `${framePath}/targetIds`, errors, frameContext, { optional: false });
      checkRefs(frame.requiredReadableIds, visualIds, `${framePath}/requiredReadableIds`, errors, frameContext, { optional: false });
      const readable = [];
      for (const [readableIndex, id] of (frame.requiredReadableIds ?? []).entries()) {
        const object = objectMap.get(id) ?? objectMap.get(anchorMap.get(id)?.ownerId), bounds = objectMap.get(id) ?? anchorMap.get(id)?.bounds;
        if (bounds && !containsBounds(frame.bounds, bounds)) add(errors, "FRAME_REQUIRED_CONTENT_CLIPPED", `${framePath}/requiredReadableIds/${readableIndex}`, `frame does not contain ${id}`, frameContext);
        if (object) readable.push(object);
      }
      if (readable.length > 0) for (const profile of readabilityProfiles) {
        const scale = Math.min(profile.width / frame.bounds.width, profile.height / frame.bounds.height), projected = Math.min(...readable.map((item) => readableBasePx(item) * scale));
        if (projected < profile.minimumPx) add(warnings, "READABILITY_RISK", `${framePath}/requiredReadableIds`, `${frame.id} projects required text to about ${projected.toFixed(1)}px in ${profile.id}`, { ...frameContext, profile: profile.id });
      }
      frameMap.set(frame.id, frame);
    }
    worldMap.set(worldValue.id, { objectIds: objects.ids, visualIds, relationIds: relations.ids, frameIds: frames.ids, frameMap });
  }
  const scenes = collect(scene.scenes, "/scenes", errors, { layer: "scene" });
  for (const [sceneIndex, item] of scenes.items.entries()) if (isObject(item)) {
    const path = `/scenes/${sceneIndex}`, context = { layer: "scene", sceneId: item.id }, world = worldMap.get(item.worldId);
    if (!world) add(errors, "MISSING_REFERENCE", `${path}/worldId`, `compiled scene references missing world: ${item.worldId}`, context);
    const steps = collect(item.steps, `${path}/steps`, errors, context);
    for (const [stepIndex, step] of steps.items.entries()) if (isObject(step)) {
      const stepPath = `${path}/steps/${stepIndex}`;
      validateBounds(step.camera?.bounds, `${stepPath}/camera/bounds`, errors, { ...context, stepId: step.id });
      if (world) {
        checkRefs(step.visual?.visibleIds, world.objectIds, `${stepPath}/visual/visibleIds`, errors, context, { optional: false });
        checkRefs(step.visual?.emphasisIds, world.visualIds, `${stepPath}/visual/emphasisIds`, errors, context, { optional: false });
        checkRefs(step.visual?.activeRelationIds, world.relationIds, `${stepPath}/visual/activeRelationIds`, errors, context, { optional: false });
        checkRefs(step.visual?.requiredReadableIds, world.visualIds, `${stepPath}/visual/requiredReadableIds`, errors, context, { optional: false });
        if (!world.frameIds.has(step.camera?.frameId)) add(errors, "MISSING_REFERENCE", `${stepPath}/camera/frameId`, `compiled camera references missing frame: ${step.camera?.frameId}`, context);
      }
    }
  }
  return { errors, warnings };
}

export function validateData(source, scene) {
  const report = validateSource(source);
  if (!scene) return report;
  const compiled = validateSceneGraph(scene);
  return { errors: [...report.errors, ...compiled.errors], warnings: [...report.warnings, ...compiled.warnings] };
}
