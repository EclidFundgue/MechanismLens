import type { Scene, SceneStep } from "../../types";

export interface Identified { id: string }
export interface DiagramNode extends Identified {
  label?: string;
  detail?: string;
  shape?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
export interface PositionedNode extends DiagramNode { x: number; y: number; width: number; height: number }
export interface DiagramEdge extends Identified { from: string; to: string; label?: string }
export interface EquationPart extends Identified { label?: string; tex?: string; explanation?: string }
export interface AlgorithmLine extends Identified { code?: string; explanation?: string }
export interface ComparisonItem extends Identified {
  label?: string;
  value?: number;
  displayValue?: string;
  note?: string;
  components?: string[];
}
export interface Callout extends Identified { label?: string; x?: number; y?: number; width?: number; height?: number }

export const list = <T,>(payload: Record<string, unknown>, key: string): T[] =>
  Array.isArray(payload[key]) ? payload[key] as T[] : [];

export const text = (payload: Record<string, unknown>, key: string, fallback = ""): string =>
  typeof payload[key] === "string" ? payload[key] as string : fallback;

export const object = (payload: Record<string, unknown>, key: string): Record<string, unknown> => {
  const value = payload[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
};

export function focusClass(id: string, focus: Set<string>): string {
  if (focus.size === 0) return "";
  return focus.has(id) ? "is-focused" : "is-muted";
}

export function stepState(step: SceneStep): NonNullable<SceneStep["state"]> {
  return step.state ?? {};
}

/** Falls back to an ordered flow when a scene does not need a custom graph layout. */
export function diagramNodes(scene: Scene): PositionedNode[] {
  const nodes = list<DiagramNode>(scene.payload, "nodes");
  if (nodes.every((node): node is PositionedNode => [node.x, node.y, node.width, node.height].every((value) => typeof value === "number"))) return nodes;
  const width = 170, height = 90, gap = 70;
  const total = nodes.length * width + Math.max(0, nodes.length - 1) * gap;
  const start = Math.max(20, (960 - total) / 2);
  return nodes.map((node, index) => ({ ...node, x: start + index * (width + gap), y: 195, width, height }));
}

export function edgeEndpoints(from: PositionedNode, to: PositionedNode) {
  const ax = from.x + from.width / 2, ay = from.y + from.height / 2;
  const bx = to.x + to.width / 2, by = to.y + to.height / 2;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return { x1: ax, y1: ay, x2: bx, y2: by };
  const a = 1 / Math.max(Math.abs(dx) / (from.width / 2), Math.abs(dy) / (from.height / 2));
  const b = 1 / Math.max(Math.abs(dx) / (to.width / 2), Math.abs(dy) / (to.height / 2));
  return { x1: ax + dx * a, y1: ay + dy * a, x2: bx - dx * b, y2: by - dy * b };
}

export function comparisonDomain(items: ComparisonItem[]): [number, number] {
  const values = items.map((item) => typeof item.value === "number" && Number.isFinite(item.value) ? item.value : 0);
  const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  return lo === hi ? [0, 1] : [lo, hi];
}

export function comparisonDelta(baseline: number, value: number, direction: "higher" | "lower", decimals: number) {
  const delta = Number((value - baseline).toFixed(decimals));
  const outcome = delta === 0 ? "equal" : ((direction === "higher" ? delta : -delta) > 0 ? "better" : "worse");
  return { delta, outcome } as const;
}

export function regionViewBox(region: Callout | undefined, width: number, height: number): string {
  if (!region) return `0 0 ${width} ${height}`;
  return `${(region.x ?? 0) / 100 * width} ${(region.y ?? 0) / 100 * height} ${(region.width ?? 100) / 100 * width} ${(region.height ?? 100) / 100 * height}`;
}
