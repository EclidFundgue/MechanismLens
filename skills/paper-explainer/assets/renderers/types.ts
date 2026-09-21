/** All step indices are zero-based. Renderers consume snapshots, never run timers. */
export interface Beat {
  narration: string;
  explanation: string;
}

interface BaseScene<K extends string, S extends Beat> {
  kind: K;
  id: string;
  title: string;
  /** A source location, figure/table number, or an explicit illustrative-data label. */
  source: string;
  steps: S[];
}

export interface DiagramNode {
  id: string;
  label: string;
  detail?: string;
  /** Coordinates in a 960 × 480 viewBox. */
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface DiagramEdge { id: string; from: string; to: string; label?: string }
export interface ArchitectureBeat extends Beat {
  visibleNodeIds: string[];
  activeNodeIds: string[];
  activeEdgeIds: string[];
}
export interface ArchitectureScene extends BaseScene<'architecture_execution', ArchitectureBeat> {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface EquationBeat extends Beat {
  tex: string;
  visibleTermIds: string[];
  highlightTermIds: string[];
}
export interface EquationScene extends BaseScene<'equation_walkthrough', EquationBeat> {
  terms: { id: string; tex: string; meaning: string }[];
  macros?: Record<string, string>;
}

export interface AlgorithmBeat extends Beat {
  activeLineIds: string[];
  /** Full snapshot, including repeated visits to the same line. No code is evaluated. */
  variables: Record<string, string | number | boolean>;
  output?: string;
}
export interface AlgorithmScene extends BaseScene<'algorithm_trace', AlgorithmBeat> {
  lines: { id: string; code: string }[];
}

export interface AblationBeat extends Beat { visibleVariantIds: string[]; focusId: string }
export interface AblationScene extends BaseScene<'ablation_comparison', AblationBeat> {
  metric: { label: string; unit: string; deltaUnit?: string; direction: 'higher' | 'lower'; decimals: number };
  baselineId: string;
  variants: { id: string; label: string; value: number; components: string[] }[];
}

/** Region bounds are fractions of the original image, independent of viewport size. */
export interface FigureRegion { id: string; label: string; x: number; y: number; width: number; height: number }
export interface FigureBeat extends Beat { regionId: string | null }
export interface FigureScene extends BaseScene<'figure_inspector', FigureBeat> {
  image: { src: string; alt: string; width: number; height: number };
  regions: FigureRegion[];
}

export type Scene = ArchitectureScene | EquationScene | AlgorithmScene | AblationScene | FigureScene;
export type RendererKind = Scene['kind'];
export type RendererProps<S extends Scene> = { scene: S; step: number };
