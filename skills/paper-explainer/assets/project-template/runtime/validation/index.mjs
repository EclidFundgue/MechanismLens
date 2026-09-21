import { validatePaper } from "./paper.mjs";
import { validateScenes } from "./scenes.mjs";

export function validateData(paper, sceneIR) {
  const report = { errors: [], warnings: [] };
  const idSets = validatePaper(paper, sceneIR, report.errors);
  validateScenes(sceneIR, idSets, report.errors, report.warnings);
  return report;
}
