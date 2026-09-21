import { comparisonDelta, comparisonDomain, visibleIds } from "../renderer-model";
import type { ComparisonItem, Metric, RendererProps } from "./shared";
import { focusFor, list, text } from "./shared";

export function AblationComparison({ scene, step }: RendererProps) {
  const focus = focusFor(step);
  const items = list<ComparisonItem>(scene.payload, "items");
  const metric = scene.payload.metric as Metric | undefined;
  const baselineId = text(scene.payload, "baselineId", items[0]?.id);
  const baseline = items.find((item) => item.id === baselineId);
  const visible = visibleIds(step.visual?.visibleItemIds, items.map((item) => item.id));
  const [lo, hi] = comparisonDomain(items.map((item) => item.value));
  const x = (value: number) => 280 + (value - lo) / (hi - lo) * 430;
  const decimals = metric?.decimals ?? 0, unit = metric?.unit ?? "";
  const deltaUnit = metric?.deltaUnit ?? (unit === "%" ? "百分点" : unit || metric?.label || "指标值");
  return <div className="renderer-comparison-wrap">
    {metric && <p className="renderer-metric">{metric.label} · {metric.direction === "lower" ? "越低越好" : "越高越好"} · 相对 {baseline?.label ?? baselineId}</p>}
    <svg className="renderer-comparison" viewBox="0 0 960 480" role="img" aria-label={scene.title}>
      <line className="renderer-axis" x1={x(0)} x2={x(0)} y1="25" y2="425" />
      {[lo, hi].map((value, index) => <text className="renderer-axis-label" key={index} x={x(value)} y="465" textAnchor="middle">{value.toFixed(decimals)}{unit}</text>)}
      {items.filter((item) => visible.has(item.id)).map((item) => {
        const y = 34 + items.indexOf(item) * 55;
        const comparison = baseline ? comparisonDelta(item.value, baseline.value, metric?.direction ?? "higher", decimals) : null;
        return <g key={item.id} className={`renderer-bar ${focus.has(item.id) ? "is-active" : ""}`} data-item={item.id}>
          <text x="14" y={y + 22}>{item.label ?? item.id}</text>
          <rect x={Math.min(x(0), x(item.value))} y={y} width={Math.abs(x(item.value) - x(0))} height="29" rx="3" />
          <text x="735" y={y + 22}>{item.displayValue ?? `${item.value.toFixed(decimals)}${unit}`}</text>
          {metric && comparison && <text className="renderer-delta" data-outcome={comparison.outcome} x="860" y={y + 22}>
            {item.id === baselineId ? "基线" : `${comparison.delta > 0 ? "+" : ""}${comparison.delta.toFixed(decimals)}`}
          </text>}
        </g>;
      })}
    </svg>
    {metric && <p className="renderer-metric">差值单位：{deltaUnit}{items.find((item) => focus.has(item.id))?.components?.length ? ` · 当前配置：${items.find((item) => focus.has(item.id))!.components!.join(" + ")}` : ""}</p>}
  </div>;
}
