import type { AblationScene, RendererProps } from './types';
import { comparisonDelta, comparisonDomain, stepIndex } from './model';
import { SceneFrame } from './shared';

export function AblationComparison({ scene, step }: RendererProps<AblationScene>) {
  const index = stepIndex(step, scene.steps.length), beat = scene.steps[index];
  const [lo, hi] = comparisonDomain(scene), { decimals, unit } = scene.metric;
  const deltaUnit = scene.metric.deltaUnit ?? (unit === '%' ? '百分点' : unit || scene.metric.label);
  const x = (value: number) => 280 + (value - lo) / (hi - lo) * 430;
  const rows = scene.variants.filter((v) => beat.visibleVariantIds.includes(v.id));
  return <SceneFrame scene={scene} step={index}>
    <p className="pe-metric">{scene.metric.label} · {scene.metric.direction === 'higher' ? '越高越好' : '越低越好'} · 差值相对 {scene.variants.find((v) => v.id === scene.baselineId)!.label}</p>
    <svg className="pe-comparison" viewBox="0 0 960 480" role="img" aria-label={`${scene.metric.label}消融对比`}>
      <line className="pe-axis" x1={x(0)} x2={x(0)} y1="34" y2="436" />
      {[lo, hi].map((value) => <text className="pe-axis-label" key={value} x={x(value)} y="465" textAnchor="middle">{value.toFixed(decimals)}{unit}</text>)}
      {rows.map((variant) => {
        const y = 45 + scene.variants.indexOf(variant) * 55;
        const active = variant.id === beat.focusId, { delta, outcome } = comparisonDelta(scene, variant.value);
        const label = `${variant.label}: ${variant.value.toFixed(decimals)}${unit}`;
        return <g key={variant.id} className="pe-bar-row" data-variant={variant.id} data-active={active} aria-label={label}>
          <text x="14" y={y + 21}>{variant.label}</text>
          <rect x={Math.min(x(0), x(variant.value))} y={y} width={Math.abs(x(variant.value) - x(0))} height="29" rx="3" />
          <text x="735" y={y + 21}>{variant.value.toFixed(decimals)}{unit}</text>
          <text className="pe-delta" x="860" y={y + 21} data-outcome={outcome}>{variant.id === scene.baselineId ? '基线' : `${delta > 0 ? '+' : ''}${delta.toFixed(decimals)}`}</text>
        </g>;
      })}
    </svg>
    <p className="pe-components">当前配置：{scene.variants.find((v) => v.id === beat.focusId)!.components.join(' + ') || '无附加模块'}；差值单位：{deltaUnit}</p>
  </SceneFrame>;
}
