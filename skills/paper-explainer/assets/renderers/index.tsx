import { ArchitectureExecution } from './ArchitectureExecution';
import { EquationWalkthrough } from './EquationWalkthrough';
import { AlgorithmTrace } from './AlgorithmTrace';
import { AblationComparison } from './AblationComparison';
import { FigureInspector } from './FigureInspector';
import type { RendererKind, RendererProps, Scene } from './types';
import 'katex/dist/katex.min.css';
import './renderers.css';

export const rendererRegistry = {
  architecture_execution: ArchitectureExecution,
  equation_walkthrough: EquationWalkthrough,
  algorithm_trace: AlgorithmTrace,
  ablation_comparison: AblationComparison,
  figure_inspector: FigureInspector,
} satisfies { [K in RendererKind]: (props: RendererProps<Extract<Scene, { kind: K }>>) => React.JSX.Element };

/** Dispatch by the discriminant so every component retains its exact input type. */
export function SceneRenderer({ scene, step }: RendererProps<Scene>) {
  switch (scene.kind) {
    case 'architecture_execution': return <rendererRegistry.architecture_execution scene={scene} step={step} />;
    case 'equation_walkthrough': return <rendererRegistry.equation_walkthrough scene={scene} step={step} />;
    case 'algorithm_trace': return <rendererRegistry.algorithm_trace scene={scene} step={step} />;
    case 'ablation_comparison': return <rendererRegistry.ablation_comparison scene={scene} step={step} />;
    case 'figure_inspector': return <rendererRegistry.figure_inspector scene={scene} step={step} />;
    default: { const unreachable: never = scene; throw new Error(`Unknown scene: ${String(unreachable)}`); }
  }
}

export * from './types';
export { defineScene, getNarrations, stepIndex } from './model';
