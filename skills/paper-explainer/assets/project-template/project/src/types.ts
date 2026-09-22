export type EvidenceKind = "section" | "page" | "figure" | "table" | "equation" | "quote" | "appendix" | "code";
export interface Evidence { id: string; label: string; kind?: EvidenceKind; section?: string; page?: number; anchor?: string; url?: string; excerpt?: string; confidence?: "direct" | "derived" }
export interface GroundedItem { id: string; title: string; summary?: string; text?: string; evidenceIds: string[]; [key: string]: unknown }
export interface PaperIR {
  schemaVersion: "2.0";
  paper: { id: string; title: string; authors?: string[]; year?: number | null; venue?: string; summary?: string; originalUrl: string; pdfUrl?: string; localPdfPath?: string };
  evidence: Evidence[]; claims: GroundedItem[]; contributions: GroundedItem[]; concepts: GroundedItem[]; modules: GroundedItem[]; relations: GroundedItem[]; equations: GroundedItem[]; algorithms: GroundedItem[]; experiments: GroundedItem[]; figures: GroundedItem[];
}
export interface Bounds { x: number; y: number; width: number; height: number }
interface PrimitiveBase extends Bounds { id: string; label?: string; parentId?: string; paperRef?: string; evidenceIds?: string[] }
export interface GroupPrimitive extends PrimitiveBase { kind: "group" }
export interface NodePrimitive extends PrimitiveBase { kind: "node"; detail?: string; role?: string }
export interface CardPrimitive extends PrimitiveBase { kind: "card"; text?: string; detail?: string }
export interface AnnotationPrimitive extends PrimitiveBase { kind: "annotation"; text?: string; detail?: string }
export interface EquationPart { id: string; tex: string; explanation?: string }
export interface EquationPrimitive extends PrimitiveBase { kind: "equation"; tex: string; macros?: Record<string, string>; parts?: EquationPart[] }
export interface CodeLine { id: string; code: string; explanation?: string }
export interface CodePrimitive extends PrimitiveBase { kind: "code"; lines: CodeLine[] }
export interface ChartItem { id: string; label: string; value: number; displayValue?: string; components?: string[] }
export interface Metric { label: string; unit: string; deltaUnit?: string; direction: "higher" | "lower"; decimals: number }
export interface ChartPrimitive extends PrimitiveBase { kind: "chart"; metric: Metric; baselineId: string; items: ChartItem[] }
export interface ImageRegion { id: string; label: string; x: number; y: number; width: number; height: number }
export interface ImagePrimitive extends PrimitiveBase { kind: "image"; src: string; alt: string; caption?: string; regions?: ImageRegion[] }
export type Primitive = GroupPrimitive | NodePrimitive | CardPrimitive | AnnotationPrimitive | EquationPrimitive | CodePrimitive | ChartPrimitive | ImagePrimitive;
export interface Relation { id: string; from: string; to: string; label?: string; path: string; x1: number; y1: number; x2: number; y2: number }
export interface Anchor { id: string; ownerId: string; bounds: Bounds }
export interface CompiledWorld { id: string; title?: string; templateId: string; explainsObjectId?: string; bounds: Bounds; objects: Primitive[]; relations: Relation[]; anchors: Anchor[]; detailViews: CompiledWorld[] }
export interface SceneState { equations?: Record<string, string>; variables?: Record<string, Record<string, string | number | boolean>>; outputs?: Record<string, string>; visibleItems?: Record<string, string[]>; selectedRegions?: Record<string, string | null> }
export interface SceneStep {
  id: string; title?: string; narration: string; goal?: string; evidenceIds: string[];
  visual: { visibleIds: string[]; emphasisIds: string[]; activeRelationIds: string[]; detailViewId: string | null; state: SceneState };
  camera: { targetIds: string[]; mode: "fit" | "tight" | "contextual"; bounds: Bounds };
  transition: { strategy: "direct" | "viaOverview"; durationMs: number; easing: "linear" | "easeInOutCubic" };
  timing: { holdMs: number };
}
export interface Scene { id: string; title: string; eyebrow?: string; contentKind: string; worldId: string; claimIds: string[]; evidenceIds: string[]; steps: SceneStep[] }
export interface SceneIR { schemaVersion: "2.0"; paperId: string; title?: string; build: { compilerVersion: string; templateCatalogVersion: string; sourceHash: string }; worlds: CompiledWorld[]; scenes: Scene[] }
