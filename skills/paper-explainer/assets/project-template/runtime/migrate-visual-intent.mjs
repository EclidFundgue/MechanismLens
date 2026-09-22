#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const source = path.resolve(process.cwd(), process.argv[2] ?? "../content/visual-intent.json");
const destination = path.resolve(process.cwd(), process.argv[3] ?? path.join(path.dirname(source), "visual-intent.v2.1.json"));

function treatmentFor(contentKind) {
  if (contentKind === "architecture") return "parts_then_whole";
  if (contentKind === "concept") return "static_emphasis";
  if (["equation", "algorithm", "experiment"].includes(contentKind)) return "progressive_reveal";
  return "overview_detail_spotlight";
}

function migrate(input) {
  if (input.schemaVersion === "2.1") return structuredClone(input);
  if (input.schemaVersion !== "2.0") throw new Error(`Only Visual Intent 2.0 can be migrated, received ${input.schemaVersion}`);
  const output = structuredClone(input);
  output.schemaVersion = "2.1";
  const worldMap = new Map(output.worlds.map((world) => {
    world.frames = [];
    return [world.id, { world, keys: new Map() }];
  }));
  let sequence = 0;
  for (const scene of output.scenes) {
    const record = worldMap.get(scene.worldId);
    if (!record) continue;
    for (const step of scene.steps) {
      const targetIds = step.viewMode === "overview" ? [] : (step.focusIds ?? []);
      const mode = step.viewMode === "overview" ? "fit" : (step.focusMode ?? "contextual");
      const key = JSON.stringify({ targetIds, mode });
      let frameId = record.keys.get(key);
      if (!frameId) {
        sequence += 1;
        frameId = `frame.legacy.${sequence}`;
        record.keys.set(key, frameId);
        record.world.frames.push({
          id: frameId,
          targetIds,
          mode,
          requiredReadableIds: [...targetIds],
          request: { reason: step.transition?.strategy === "viaOverview" || targetIds.length === 0 ? "restore_spatial_context" : "required_content_unreadable" },
        });
      }
      step.frameId = frameId;
      step.emphasisIds ??= [...(step.focusIds ?? [])];
      step.requiredReadableIds ??= [...targetIds];
      delete step.viewMode;
      delete step.focusMode;
      delete step.focusIds;
    }
    scene.presentation = {
      treatment: treatmentFor(scene.contentKind),
      cameraPolicy: "static_first",
      defaultFrameId: scene.steps[0]?.frameId ?? record.world.frames[0]?.id,
    };
  }
  return output;
}

const intent = JSON.parse(await readFile(source, "utf8"));
const migrated = migrate(intent);
await writeFile(destination, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");
console.log(`Migrated Visual Intent: ${source} -> ${destination}`);
console.warn("Migration preserves legacy camera targets. Review every generated frame request before adopting static-first narration.");
