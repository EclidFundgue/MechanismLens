import type { Scene, SceneStep } from "../../types";

export interface RendererProps { scene: Scene; step: SceneStep }
export interface Identified { id: string }
export interface Point extends Identified { label?: string; text?: string }
export interface Node extends Identified { label?: string; detail?: string; shape?: string; x?: number; y?: number; width?: number; height?: number }
export interface Edge { id?: string; from: string; to: string; label?: string }
export interface EquationPart extends Identified { label?: string; tex?: string; explanation?: string }
export interface AlgorithmLine extends Identified { code?: string; explanation?: string }
export interface ComparisonItem extends Identified { label?: string; value: number; displayValue?: string; note?: string; components?: string[] }
export interface Metric { label: string; unit: string; deltaUnit?: string; direction: "higher" | "lower"; decimals: number }
export interface Region extends Identified { label: string; x: number; y: number; width: number; height: number }
export interface ImageInfo { src: string; alt: string; width: number; height: number }
export interface Callout extends Identified { label?: string; x?: number; y?: number; width?: number; height?: number }

export const list = <T,>(payload: Record<string, unknown>, key: string): T[] =>
  Array.isArray(payload[key]) ? payload[key] as T[] : [];

export const text = (payload: Record<string, unknown>, key: string, fallback = ""): string =>
  typeof payload[key] === "string" ? payload[key] as string : fallback;

export function focusClass(id: string, focus: Set<string>): string {
  if (focus.size === 0) return "";
  return focus.has(id) ? "is-focused" : "is-muted";
}

export function focusFor(step: SceneStep): Set<string> {
  return new Set(step.focusIds ?? []);
}
