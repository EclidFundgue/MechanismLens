import { addIssue, checkRefs, collectIds, isObject, requireObject, requireString } from "./helpers.mjs";

export const paperGroups = ["evidence", "claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"];

export function validatePaper(paperValue, storyboardValue, errors) {
  const paper = requireObject(paperValue, "paper", "", errors) ?? {};
  const storyboard = requireObject(storyboardValue, "scene", "", errors) ?? {};
  const paperMeta = requireObject(paper.paper, "paper.paper", "/paper", errors) ?? {};

  const paperVersion = requireString(paper.schemaVersion, "paper.schemaVersion", "/schemaVersion", errors);
  if (paperVersion && paperVersion !== "1.0") addIssue(errors, "UNSUPPORTED_SCHEMA_VERSION", "/schemaVersion", `paper.schemaVersion is unsupported: ${paperVersion}`);
  requireString(paperMeta.id, "paper.paper.id", "/paper/id", errors);
  requireString(paperMeta.title, "paper.paper.title", "/paper/title", errors);

  const sceneVersion = requireString(storyboard.schemaVersion, "scene.schemaVersion", "/schemaVersion", errors);
  if (sceneVersion && sceneVersion !== "1.0") addIssue(errors, "UNSUPPORTED_SCHEMA_VERSION", "/schemaVersion", `scene.schemaVersion is unsupported: ${sceneVersion}`);
  requireString(storyboard.paperId, "scene.paperId", "/paperId", errors);
  if (storyboard.paperId !== paperMeta.id) addIssue(errors, "PAPER_ID_MISMATCH", "/paperId", "scene.paperId must match paper.paper.id");

  const idSets = new Map();
  const groupItems = new Map();
  for (const group of paperGroups) {
    const { ids, items } = collectIds(paper[group], `paper.${group}`, `/${group}`, errors);
    idSets.set(group, ids);
    groupItems.set(group, items);
  }

  const evidenceIds = idSets.get("evidence") ?? new Set();
  for (const group of ["claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"]) {
    for (const [index, item] of groupItems.get(group).entries()) {
      if (!isObject(item)) continue;
      checkRefs(item.evidenceIds, evidenceIds, `${group}.${item.id}.evidenceIds`, `/${group}/${index}/evidenceIds`, errors);
      if ((group === "claims" || group === "contributions") && (!Array.isArray(item.evidenceIds) || item.evidenceIds.length === 0)) {
        addIssue(errors, "EMPTY_EVIDENCE", `/${group}/${index}/evidenceIds`, `${group}.${item.id}.evidenceIds must not be empty`);
      }
    }
  }

  return idSets;
}
