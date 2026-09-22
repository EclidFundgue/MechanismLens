import { layoutWorld, targetBounds } from "./layout.mjs";

function unique(items) {
  return [...new Set(items)];
}

function evidenceKey(sourceId, evidenceId) {
  return `${sourceId}::${evidenceId}`;
}

function compileDetailView(detail) {
  return { ...layoutWorld({ ...detail, objects: detail.objects ?? [], relations: detail.relations ?? [] }), detailViews: [] };
}

function compileWorld(world) {
  const compiled = layoutWorld(world);
  return {
    ...compiled,
    frames: (world.frames ?? []).map((frame) => ({
      id: frame.id,
      targetIds: frame.targetIds ?? [],
      mode: frame.mode ?? "contextual",
      requiredReadableIds: frame.requiredReadableIds ?? [],
      requestReason: frame.request?.reason ?? null,
      bounds: targetBounds(compiled, frame.targetIds ?? [], frame.mode ?? "contextual"),
    })),
    detailViews: (world.detailViews ?? []).map(compileDetailView),
  };
}

function mechanismIndex(mechanism) {
  const items = [
    ...(mechanism.participants ?? []),
    ...(mechanism.states ?? []),
    ...(mechanism.scenarios ?? []),
    ...(mechanism.scenarios ?? []).flatMap((scenario) => scenario.steps ?? []),
  ];
  return new Map(items.map((item) => [item.id, item]));
}

function refsToEvidenceIds(refs = []) {
  return refs.map((ref) => evidenceKey(ref.sourceId, ref.evidenceId));
}

function compileStep(step, world, scene, mechanismItems) {
  const frameId = step.frameId ?? scene.presentation.defaultFrameId;
  const frame = world.frames.find((item) => item.id === frameId);
  const evidenceIds = unique((step.mechanismStepIds ?? []).flatMap((id) => refsToEvidenceIds(mechanismItems.get(id)?.evidenceRefs)));
  return {
    id: step.id,
    title: step.title,
    narration: step.narration,
    goal: step.goal,
    mechanismStepIds: step.mechanismStepIds ?? [],
    evidenceIds,
    visual: {
      visibleIds: step.visibleIds ?? world.objects.map((object) => object.id),
      emphasisIds: step.emphasisIds ?? [],
      activeRelationIds: step.activeRelationIds ?? [],
      requiredReadableIds: step.requiredReadableIds ?? frame?.requiredReadableIds ?? [],
      detailViewId: step.detailViewId ?? null,
      state: step.state ?? {},
    },
    camera: {
      frameId,
      requestReason: frame?.requestReason ?? null,
      targetIds: frame?.targetIds ?? [],
      mode: frame?.mode ?? "fit",
      bounds: frame?.bounds ?? world.bounds,
    },
    transition: {
      strategy: step.transition?.strategy ?? "direct",
      durationMs: step.transition?.durationMs ?? 650,
      easing: step.transition?.easing ?? "easeInOutCubic",
    },
    timing: {
      holdMs: step.timing?.holdMs ?? Math.max(1800, step.narration.length * 190),
    },
  };
}

export function compileContent(mechanism, intent, catalog) {
  const worlds = intent.worlds.map(compileWorld);
  const worldMap = new Map(worlds.map((world) => [world.id, world]));
  const mechanismItems = mechanismIndex(mechanism);
  const scenes = intent.scenes.map((scene) => {
    const world = worldMap.get(scene.worldId);
    const steps = scene.steps.map((step) => compileStep(step, world, scene, mechanismItems));
    return {
      id: scene.id,
      title: scene.title,
      eyebrow: scene.eyebrow,
      contentKind: scene.contentKind,
      worldId: scene.worldId,
      presentation: structuredClone(scene.presentation),
      evidenceIds: unique(steps.flatMap((step) => step.evidenceIds)),
      steps,
    };
  });
  return {
    subjectId: mechanism.id,
    title: intent.title ?? mechanism.title,
    worlds,
    scenes,
  };
}

function normalizePaperEvidence(paper) {
  if (!paper) return [];
  return paper.evidence.map((item) => ({
    ...item,
    id: evidenceKey(paper.paper.id, item.id),
    sourceId: paper.paper.id,
    sourceKind: "paper",
    basis: item.confidence === "derived" ? "static_inference" : "source_fact",
  }));
}

function normalizeCodeEvidence(code) {
  if (!code) return [];
  return code.evidence.map((item) => ({
    ...item,
    id: evidenceKey(code.repository.id, item.id),
    sourceId: code.repository.id,
    sourceKind: "code",
  }));
}

export function compileSourceBundle({ paper = null, code = null }, mechanism, scene) {
  const usedEvidence = new Set(scene.scenes.flatMap((item) => item.evidenceIds));
  const sources = [];
  if (paper) sources.push({
    id: paper.paper.id,
    kind: "paper",
    title: paper.paper.title,
    summary: paper.paper.summary ?? "",
    url: paper.paper.originalUrl,
    pdfUrl: paper.paper.pdfUrl,
    localPath: paper.paper.localPdfPath,
  });
  if (code) sources.push({
    id: code.repository.id,
    kind: "code",
    title: code.repository.title,
    summary: code.question,
    location: code.repository.location,
    sourceType: code.repository.sourceType,
  });
  return {
    subject: { id: mechanism.id, title: mechanism.title, summary: mechanism.summary ?? mechanism.question },
    sources,
    evidence: [...normalizePaperEvidence(paper), ...normalizeCodeEvidence(code)].filter((item) => usedEvidence.has(item.id)),
  };
}

export { evidenceKey };
