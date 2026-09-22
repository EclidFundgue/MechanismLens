import { add, checkRefs, collect, finite, isObject, requireArray, requireObject, requireString } from "./helpers.mjs";

const paperGroups = ["evidence", "claims", "contributions", "concepts", "modules", "relations", "equations", "algorithms", "experiments", "figures"];
const objectKinds = new Set(["group", "node", "card", "annotation", "equation", "code", "chart", "image"]);
const transitions = new Set(["direct", "viaOverview"]);
const viewModes = new Set(["overview", "focus", "detail", "compare"]);

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

function validateWorld(worldValue, index, catalogMap, paperInfo, errors, warnings) {
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
  return { id, world, objectIds, visualIds, ownerByVisual, objectMap, relationIds: relations.ids, detailIds: detailViews.ids };
}

export function validateSource(paperValue, intentValue, catalogValue) {
  const errors = [], warnings = [];
  const paperInfo = validatePaper(paperValue, errors);
  const intent = requireObject(intentValue, "", errors);
  if (intent.schemaVersion !== "2.0") add(errors, "UNSUPPORTED_SCHEMA_VERSION", "/schemaVersion", `visual intent schemaVersion must be 2.0`, { layer: "intent" });
  if (intent.paperId !== paperInfo.meta.id) add(errors, "PAPER_ID_MISMATCH", "/paperId", `visual intent paperId must match paper.paper.id`, { layer: "intent" });
  const catalog = requireObject(catalogValue, "", errors);
  const templates = collect(catalog.templates, "/templates", errors, { layer: "catalog" });
  const catalogMap = new Map(templates.items.filter(isObject).map((template) => [template.id, template]));
  const worlds = requireArray(intent.worlds, "/worlds", errors, { layer: "intent" });
  const worldRecords = worlds.map((world, index) => validateWorld(world, index, catalogMap, paperInfo, errors, warnings));
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
      if (world) {
        checkRefs(step.focusIds, world.visualIds, `${stepPath}/focusIds`, errors, stepContext);
        checkRefs(step.emphasisIds, world.visualIds, `${stepPath}/emphasisIds`, errors, stepContext);
        checkRefs(step.visibleIds, world.objectIds, `${stepPath}/visibleIds`, errors, stepContext);
        checkRefs(step.activeRelationIds, world.relationIds, `${stepPath}/activeRelationIds`, errors, stepContext);
        if (step.detailViewId !== undefined && step.detailViewId !== null && !world.detailIds.has(step.detailViewId)) add(errors, "MISSING_REFERENCE", `${stepPath}/detailViewId`, `missing detail view: ${step.detailViewId}`, stepContext);
        if (Array.isArray(step.visibleIds) && Array.isArray(step.focusIds)) {
          const visible = new Set(step.visibleIds);
          for (const [focusIndex, focusId] of step.focusIds.entries()) {
            const ownerId = world.ownerByVisual.get(focusId);
            if (ownerId && !visible.has(ownerId)) add(errors, "FOCUS_HIDDEN", `${stepPath}/focusIds/${focusIndex}`, `focus ${focusId} belongs to hidden object ${ownerId}`, stepContext);
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

export function validateSceneGraph(sceneValue) {
  const errors = [], warnings = [];
  const scene = requireObject(sceneValue, "", errors);
  if (scene.schemaVersion !== "2.0") add(errors, "UNSUPPORTED_SCHEMA_VERSION", "/schemaVersion", `scene schemaVersion must be 2.0`, { layer: "scene" });
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
    worldMap.set(worldValue.id, { objectIds: objects.ids, visualIds: new Set([...objects.ids, ...anchors.ids]), relationIds: relations.ids });
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
