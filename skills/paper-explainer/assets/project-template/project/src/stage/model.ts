import type { Bounds } from "../types";
export function comparisonDomain(values: number[]): [number, number] { const lo = Math.min(0, ...values), hi = Math.max(0, ...values); return lo === hi ? [0, 1] : [lo, hi]; }
export function comparisonDelta(value: number, baseline: number, direction: "higher" | "lower", decimals: number) { const delta = Number((value - baseline).toFixed(decimals)); return { delta, outcome: delta === 0 ? "equal" : (direction === "higher" ? delta > 0 : delta < 0) ? "better" : "worse" } as const; }
export function interpolateBounds(from: Bounds, to: Bounds, progress: number): Bounds { const mix = (a: number, b: number) => a + (b - a) * progress; return { x: mix(from.x, to.x), y: mix(from.y, to.y), width: mix(from.width, to.width), height: mix(from.height, to.height) }; }
export function easeInOutCubic(value: number) { return value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2; }
export function boundsNearlyEqual(a: Bounds, b: Bounds, epsilon = .01) { return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon && Math.abs(a.width - b.width) <= epsilon && Math.abs(a.height - b.height) <= epsilon; }
export function boundsToViewBox(bounds: Bounds) { return `${bounds.x} ${bounds.y} ${Math.max(1, bounds.width)} ${Math.max(1, bounds.height)}`; }
