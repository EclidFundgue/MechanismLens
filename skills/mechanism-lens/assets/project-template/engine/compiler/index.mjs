import { createHash } from "node:crypto";
import { layoutWorld, targetBounds } from "./layout.mjs";

export const compilerVersion = "2.1.0";

function sourceHash(paper, intent, catalog) {
  return createHash("sha256")
    .update(JSON.stringify({ paper, intent, catalog }))
    .digest("hex");
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

function compileLegacyStep(step, world) {
  const focusIds = step.focusIds ?? [];
  const mode = step.viewMode === "overview" ? "fit" : (step.focusMode ?? "contextual");
  const cameraIds = step.viewMode === "overview" ? [] : focusIds;
  return { focusIds, mode, cameraIds, frameId: null, requestReason: null };
}

function compileStaticStep(step, world, scene) {
  const frameId = step.frameId ?? scene.presentation?.defaultFrameId;
  const frame = world.frames.find((item) => item.id === frameId);
  return {
    focusIds: [],
    mode: frame?.mode ?? "fit",
    cameraIds: frame?.targetIds ?? [],
    frameId: frame?.id ?? null,
    requestReason: frame?.requestReason ?? null,
    requiredReadableIds: frame?.requiredReadableIds ?? [],
    bounds: frame?.bounds ?? world.bounds,
  };
}

function compileStep(step, world, scene, intentVersion) {
  const camera = intentVersion === "2.1" ? compileStaticStep(step, world, scene) : compileLegacyStep(step, world);
  return {
    id: step.id,
    title: step.title,
    narration: step.narration,
    goal: step.goal,
    evidenceIds: step.evidenceIds ?? [],
    visual: {
      visibleIds: step.visibleIds ?? world.objects.map((object) => object.id),
      emphasisIds: step.emphasisIds ?? camera.focusIds,
      activeRelationIds: step.activeRelationIds ?? [],
      requiredReadableIds: step.requiredReadableIds ?? camera.requiredReadableIds ?? [],
      detailViewId: step.detailViewId ?? null,
      state: step.state ?? {},
    },
    camera: {
      frameId: camera.frameId,
      requestReason: camera.requestReason,
      targetIds: camera.cameraIds,
      mode: camera.mode,
      bounds: camera.bounds ?? targetBounds(world, camera.cameraIds, camera.mode),
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

export function compileContent(paper, intent, catalog) {
  const intentVersion = intent.schemaVersion === "2.1" ? "2.1" : "2.0";
  const worlds = intent.worlds.map(compileWorld);
  const worldMap = new Map(worlds.map((world) => [world.id, world]));
  const scenes = intent.scenes.map((scene) => {
    const world = worldMap.get(scene.worldId);
    return {
      id: scene.id,
      title: scene.title,
      eyebrow: scene.eyebrow,
      contentKind: scene.contentKind,
      worldId: scene.worldId,
      claimIds: scene.claimIds ?? [],
      evidenceIds: scene.evidenceIds ?? [],
      ...(intentVersion === "2.1" ? { presentation: structuredClone(scene.presentation) } : {}),
      steps: scene.steps.map((step) => compileStep(step, world, scene, intentVersion)),
    };
  });
  return {
    schemaVersion: intentVersion,
    paperId: paper.paper.id,
    title: intent.title,
    build: {
      compilerVersion,
      templateCatalogVersion: catalog.version,
      sourceHash: sourceHash(paper, intent, catalog),
    },
    worlds,
    scenes,
  };
}
