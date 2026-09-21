export interface DiagramBox { x: number; y: number; width: number; height: number }
export interface FigureRegion { x: number; y: number; width: number; height: number }

export function edgeEndpoints(from: DiagramBox, to: DiagramBox) {
  const ax = from.x + from.width / 2, ay = from.y + from.height / 2;
  const bx = to.x + to.width / 2, by = to.y + to.height / 2;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return { x1: ax, y1: ay, x2: bx, y2: by };
  const a = 1 / Math.max(Math.abs(dx) / (from.width / 2), Math.abs(dy) / (from.height / 2));
  const b = 1 / Math.max(Math.abs(dx) / (to.width / 2), Math.abs(dy) / (to.height / 2));
  return { x1: ax + dx * a, y1: ay + dy * a, x2: bx - dx * b, y2: by - dy * b };
}

export function comparisonDomain(values: number[]): [number, number] {
  const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  return lo === hi ? [0, 1] : [lo, hi];
}

export function comparisonDelta(value: number, baseline: number, direction: "higher" | "lower", decimals: number) {
  const delta = Number((value - baseline).toFixed(decimals));
  return {
    delta,
    outcome: delta === 0 ? "equal" : (direction === "higher" ? delta > 0 : delta < 0) ? "better" : "worse",
  } as const;
}

export function regionViewBox(region: FigureRegion | undefined, width: number, height: number) {
  return region
    ? `${region.x * width} ${region.y * height} ${region.width * width} ${region.height * height}`
    : `0 0 ${width} ${height}`;
}
