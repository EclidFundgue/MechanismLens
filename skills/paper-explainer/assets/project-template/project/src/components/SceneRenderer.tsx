import type { Scene, SceneStep } from "../types";
import { AblationComparison } from "./renderers/AblationComparison";
import { AlgorithmTrace } from "./renderers/AlgorithmTrace";
import { ArchitectureExecution } from "./renderers/ArchitectureExecution";
import { ConceptScene } from "./renderers/ConceptScene";
import { EquationWalkthrough } from "./renderers/EquationWalkthrough";
import { FigureInspector } from "./renderers/FigureInspector";
import "./renderer-enhancements.css";

interface Props { scene: Scene; step: SceneStep; stepIndex: number }

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
