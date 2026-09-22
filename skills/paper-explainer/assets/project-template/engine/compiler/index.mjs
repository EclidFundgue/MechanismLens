import { createHash } from "node:crypto";
import { layoutWorld, targetBounds } from "./layout.mjs";

export const compilerVersion = "2.0.0";

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
    detailViews: (world.detailViews ?? []).map(compileDetailView),
  };
}

function compileStep(step, world) {
  const focusIds = step.focusIds ?? [];
  const mode = step.viewMode === "overview" ? "fit" : (step.focusMode ?? "contextual");
  const cameraIds = step.viewMode === "overview" ? [] : focusIds;
  return {
    id: step.id,
    title: step.title,
    narration: step.narration,
    goal: step.goal,
    evidenceIds: step.evidenceIds ?? [],
    visual: {
      visibleIds: step.visibleIds ?? world.objects.map((object) => object.id),
      emphasisIds: step.emphasisIds ?? focusIds,
      activeRelationIds: step.activeRelationIds ?? [],
      detailViewId: step.detailViewId ?? null,
      state: step.state ?? {},
    },
    camera: {
      targetIds: cameraIds,
      mode,
      bounds: targetBounds(world, cameraIds, mode),
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
      steps: scene.steps.map((step) => compileStep(step, world)),
    };
  });
  return {
    schemaVersion: "2.0",
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
