export type EvidenceBasis = "source_fact" | "static_inference" | "runtime_observation";
export type SourceKind = "paper" | "code";
export type EvidenceKind = "section" | "page" | "figure" | "table" | "equation" | "quote" | "appendix" | "code";
export interface Evidence {
  id: string; sourceId: string; sourceKind: SourceKind; label: string; kind?: EvidenceKind; basis: EvidenceBasis;
  section?: string; page?: number; anchor?: string; url?: string; excerpt?: string;
  path?: string; symbol?: string; lineStart?: number; lineEnd?: number;
}
export interface SourceInfo { id: string; kind: SourceKind; title: string; summary?: string; url?: string; pdfUrl?: string; localPath?: string; location?: string; sourceType?: "local" | "git" }
export interface SourceBundle { subject: { id: string; title: string; summary?: string }; sources: SourceInfo[]; evidence: Evidence[] }
export interface Bounds { x: number; y: number; width: number; height: number }
interface PrimitiveBase extends Bounds { id: string; label?: string; parentId?: string; mechanismRef?: string }
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
export interface Relation { id: string; from: string; to: string; label?: string; path: string; x1: number; y1: number; x2: number; y2: number; mechanismRef?: string }
export interface Anchor { id: string; ownerId: string; bounds: Bounds }
export type CameraRequestReason = "required_content_unreadable" | "inspect_source_detail" | "restore_spatial_context";
export interface CompiledFrame { id: string; targetIds: string[]; mode: "fit" | "tight" | "contextual"; requiredReadableIds: string[]; requestReason: CameraRequestReason | null; bounds: Bounds }
export interface CompiledWorld { id: string; title?: string; templateId: string; explainsObjectId?: string; bounds: Bounds; objects: Primitive[]; relations: Relation[]; anchors: Anchor[]; frames: CompiledFrame[]; detailViews: CompiledWorld[] }
export interface SceneState { equations?: Record<string, string>; variables?: Record<string, Record<string, string | number | boolean>>; outputs?: Record<string, string>; visibleItems?: Record<string, string[]>; selectedRegions?: Record<string, string | null> }
export interface SceneStep {
  id: string; title?: string; narration: string; goal?: string; mechanismStepIds: string[]; evidenceIds: string[];
  visual: { visibleIds: string[]; emphasisIds: string[]; activeRelationIds: string[]; requiredReadableIds: string[]; detailViewId: string | null; state: SceneState };
  camera: { frameId: string; requestReason: CameraRequestReason | null; targetIds: string[]; mode: "fit" | "tight" | "contextual"; bounds: Bounds };
  transition: { strategy: "direct" | "viaOverview"; durationMs: number; easing: "linear" | "easeInOutCubic" };
  timing: { holdMs: number };
}
export interface ScenePresentation { treatment: "static_emphasis" | "progressive_reveal" | "parts_then_whole" | "overview_detail_spotlight"; cameraPolicy: "static_first"; defaultFrameId: string }
export interface Scene { id: string; title: string; eyebrow?: string; contentKind: string; worldId: string; evidenceIds: string[]; presentation: ScenePresentation; steps: SceneStep[] }
export interface SceneIR { subjectId: string; title?: string; worlds: CompiledWorld[]; scenes: Scene[] }
