export type EvidenceKind = "section" | "page" | "figure" | "table" | "equation" | "quote" | "appendix" | "code";

export interface Evidence {
  id: string;
  label: string;
  kind?: EvidenceKind;
  section?: string;
  page?: number;
  anchor?: string;
  url?: string;
  excerpt?: string;
  confidence?: "direct" | "derived";
}

export interface GroundedItem {
  id: string;
  title: string;
  summary?: string;
  text?: string;
  evidenceIds: string[];
  [key: string]: unknown;
}

export interface PaperIR {
  schemaVersion: "1.0";
  paper: {
    id: string;
    title: string;
    authors?: string[];
    year?: number | null;
    venue?: string;
    summary?: string;
    originalUrl: string;
    pdfUrl?: string;
    localPdfPath?: string;
  };
  evidence: Evidence[];
  claims: GroundedItem[];
  contributions: GroundedItem[];
  concepts: GroundedItem[];
  modules: GroundedItem[];
  equations: GroundedItem[];
  experiments: GroundedItem[];
  figures: GroundedItem[];
}

export type SceneType =
  | "concept"
  | "architecture_execution"
  | "equation_walkthrough"
  | "algorithm_trace"
  | "ablation_comparison"
  | "figure_inspector";

export interface SceneStep {
  id: string;
  title?: string;
  narration: string;
  focusIds?: string[];
  evidenceIds?: string[];
  /** Optional visual snapshot. Playback and subtitles still use this Scene IR step. */
  visual?: {
    visibleNodeIds?: string[];
    activeEdgeIds?: string[];
    tex?: string;
    visiblePartIds?: string[];
    variables?: Record<string, string | number | boolean>;
    output?: string;
    visibleItemIds?: string[];
    regionId?: string | null;
  };
}

export interface Scene {
  id: string;
  title: string;
  eyebrow?: string;
  type: SceneType;
  claimIds?: string[];
  evidenceIds?: string[];
  steps: SceneStep[];
  payload: Record<string, unknown>;
}

export interface SceneIR {
  schemaVersion: "1.0";
  paperId: string;
  title?: string;
  scenes: Scene[];
}
