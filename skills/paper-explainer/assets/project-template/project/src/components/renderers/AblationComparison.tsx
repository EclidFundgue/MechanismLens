import type { Scene, SceneStep } from "../../types";
import { comparisonDelta, comparisonDomain, list, object, stepState, type ComparisonItem } from "./model";

export function AblationComparison({ scene, step }: { scene: Scene; step: SceneStep }) {
  const allItems = list<ComparisonItem>(scene.payload, "items");
  const state = stepState(step), metric = object(scene.payload, "metric");
  const direction = metric.direction === "lower" ? "lower" : "higher";
  const decimals = typeof metric.decimals === "number" && Number.isInteger(metric.decimals) ? metric.decimals : 2;
  const unit = typeof metric.unit === "string" ? metric.unit : "";
  const label = typeof metric.label === "string" ? metric.label : scene.title;
  const baselineId = typeof scene.payload.baselineId === "string" ? scene.payload.baselineId : allItems[0]?.id;
  const baseline = allItems.find((item) => item.id === baselineId) ?? allItems[0];
  const visible = new Set(state.visibleItemIds ?? allItems.map((item) => item.id));
  const items = allItems.filter((item) => visible.has(item.id));
  const focus = new Set(step.focusIds ?? []), [lo, hi] = comparisonDomain(allItems);
  const x = (value: number) => 285 + (value - lo) / (hi - lo) * 405;
  const baselineValue = typeof baseline?.value === "number" ? baseline.value : 0;
  const deltaUnit = typeof metric.deltaUnit === "string" ? metric.deltaUnit : (unit === "%" ? "个百分点" : unit || label);
  return <div className="comparison-layout">
    <p className="comparison-meta">{label} · {direction === "higher" ? "越高越好" : "越低越好"}</p>
    <svg className="comparison-chart" viewBox="0 0 960 430" role="img" aria-label={`${label} 对比`}>
      <line className="comparison-axis" x1={x(0)} x2={x(0)} y1="26" y2="378" />
      {[lo, hi].map((value) => <text className="comparison-axis-label" key={value} x={x(value)} y="410" textAnchor="middle">{value.toFixed(decimals)}{unit}</text>)}
      {items.map((item) => {
        const value = typeof item.value === "number" ? item.value : 0;
        const { delta, outcome } = comparisonDelta(baselineValue, value, direction, decimals);
        const active = focus.has(item.id), y = 34 + allItems.indexOf(item) * 54;
        return <g key={item.id} data-item={item.id} data-outcome={outcome} className={`comparison-row-svg ${active ? "is-focused" : ""}`}>
          <text x="16" y={y + 21}>{item.label ?? item.id}</text><rect x={Math.min(x(0), x(value))} y={y} width={Math.abs(x(value) - x(0))} height="29" rx="3" />
          <text x="715" y={y + 21}>{item.displayValue ?? `${value.toFixed(decimals)}${unit}`}</text>
          <text className="comparison-delta" x="850" y={y + 21}>{item.id === baseline?.id ? "基线" : `${delta > 0 ? "+" : ""}${delta.toFixed(decimals)}`}</text>
        </g>;
      })}
    </svg>
    {baseline && <p className="comparison-summary">当前聚焦：{allItems.find((item) => focus.has(item.id))?.components?.join(" + ") || "当前变体"}；差值相对 {baseline.label ?? baseline.id}，单位：{deltaUnit}</p>}
  </div>;
}
