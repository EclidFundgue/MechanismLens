import { addIssue, checkRefs, requireString } from "./helpers.mjs";

export const paperGroups = ["evidence", "claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"];

export function validatePaper(paper, storyboard, errors) {
  requireString(paper.schemaVersion, "paper.schemaVersion", "/schemaVersion", errors);
  requireString(paper.paper?.id, "paper.paper.id", "/paper/id", errors);
  requireString(paper.paper?.title, "paper.paper.title", "/paper/title", errors);
  requireString(storyboard.schemaVersion, "scene.schemaVersion", "/schemaVersion", errors);
  requireString(storyboard.paperId, "scene.paperId", "/paperId", errors);
  if (storyboard.paperId !== paper.paper?.id) addIssue(errors, "PAPER_ID_MISMATCH", "/paperId", "scene.paperId must match paper.paper.id");

  const idSets = new Map();
  for (const group of paperGroups) {
    const items = paper[group] ?? [];
    if (!Array.isArray(items)) {
      addIssue(errors, "EXPECTED_ARRAY", `/${group}`, `paper.${group} must be an array`);
      continue;
    }
    const ids = new Set();
    for (const [index, item] of items.entries()) {
      requireString(item?.id, `paper.${group}[${index}].id`, `/${group}/${index}/id`, errors);
      if (ids.has(item?.id)) addIssue(errors, "DUPLICATE_ID", `/${group}/${index}/id`, `duplicate ${group} id: ${item.id}`);
      ids.add(item?.id);
    }
    idSets.set(group, ids);
  }

  const evidenceIds = idSets.get("evidence") ?? new Set();
  for (const group of ["claims", "contributions", "concepts", "modules", "equations", "experiments", "figures"]) {
    for (const [index, item] of (paper[group] ?? []).entries()) {
      checkRefs(item.evidenceIds, evidenceIds, `${group}.${item.id}.evidenceIds`, `/${group}/${index}/evidenceIds`, errors);
      if ((group === "claims" || group === "contributions") && (!Array.isArray(item.evidenceIds) || item.evidenceIds.length === 0)) {
        addIssue(errors, "EMPTY_EVIDENCE", `/${group}/${index}/evidenceIds`, `${group}.${item.id}.evidenceIds must not be empty`);
      }
    }
  }
  return idSets;
}
