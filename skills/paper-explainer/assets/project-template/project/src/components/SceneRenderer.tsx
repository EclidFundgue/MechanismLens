import type { Scene, SceneStep } from "../types";
import { AblationComparison } from "./renderers/AblationComparison";
import { AlgorithmTrace } from "./renderers/AlgorithmTrace";
import { ArchitectureExecution } from "./renderers/ArchitectureExecution";
import { EquationWalkthrough } from "./renderers/EquationWalkthrough";
import { FigureInspector } from "./renderers/FigureInspector";

interface Props { scene: Scene; step: SceneStep; stepIndex: number }
interface Point { id: string; label?: string; text?: string }

function focusClass(id: string, focus: Set<string>): string {
  if (focus.size === 0) return "";
  return focus.has(id) ? "is-focused" : "is-muted";
}

function ConceptScene({ scene, step }: { scene: Scene; step: SceneStep }) {
  const focus = new Set(step.focusIds ?? []);
  const points = Array.isArray(scene.payload.points) ? scene.payload.points as Point[] : [];
  return <div className="concept-grid">{points.map((point, index) => <article key={point.id} className={`concept-card ${focusClass(point.id, focus)}`}>
    <span className="card-index">{String(index + 1).padStart(2, "0")}</span><h3>{point.label ?? point.id}</h3><p>{point.text}</p>
  </article>)}</div>;
}

export function SceneRenderer({ scene, step, stepIndex }: Props) {
  switch (scene.type) {
    case "architecture_execution": return <ArchitectureExecution scene={scene} step={step} />;
    case "equation_walkthrough": return <EquationWalkthrough scene={scene} step={step} />;
    case "algorithm_trace": return <AlgorithmTrace scene={scene} step={step} previousStep={scene.steps[stepIndex - 1]} />;
    case "ablation_comparison": return <AblationComparison scene={scene} step={step} />;
    case "figure_inspector": return <FigureInspector scene={scene} step={step} />;
    default: return <ConceptScene scene={scene} step={step} />;
  }
}
