import { useId, useState } from "react";
import katex from "katex";
import type { Scene, SceneStep } from "../types";
import { assetUrl } from "../lib/source";
import { comparisonDelta, comparisonDomain, edgeEndpoints, regionViewBox } from "./renderer-model";
import "./renderer-enhancements.css";

interface Props { scene: Scene; step: SceneStep; stepIndex: number }
interface Identified { id: string }
interface Point extends Identified { label?: string; text?: string }
interface Node extends Identified { label?: string; detail?: string; shape?: string; x?: number; y?: number; width?: number; height?: number }
interface Edge { id?: string; from: string; to: string; label?: string }
interface EquationPart extends Identified { label?: string; tex?: string; explanation?: string }
interface AlgorithmLine extends Identified { code?: string; explanation?: string }
interface ComparisonItem extends Identified { label?: string; value: number; displayValue?: string; note?: string; components?: string[] }
interface Metric { label: string; unit: string; deltaUnit?: string; direction: "higher" | "lower"; decimals: number }
interface Region extends Identified { label: string; x: number; y: number; width: number; height: number }
interface ImageInfo { src: string; alt: string; width: number; height: number }
interface Callout extends Identified { label?: string; x?: number; y?: number; width?: number; height?: number }

const list = <T,>(payload: Record<string, unknown>, key: string): T[] => Array.isArray(payload[key]) ? payload[key] as T[] : [];
const text = (payload: Record<string, unknown>, key: string, fallback = ""): string => typeof payload[key] === "string" ? payload[key] as string : fallback;

function focusClass(id: string, focus: Set<string>): string {
  if (focus.size === 0) return "";
  return focus.has(id) ? "is-focused" : "is-muted";
}

function MathText({ tex, macros, displayMode = false }: { tex: string; macros?: Record<string, string>; displayMode?: boolean }) {
  try {
    const html = katex.renderToString(tex, { displayMode, throwOnError: true, trust: false, output: "htmlAndMathml", macros: { ...macros } });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="renderer-error" role="alert">无法排版公式，请核对 LaTeX：<code>{tex}</code></span>;
  }
}

function ConceptScene({ scene, focus }: { scene: Scene; focus: Set<string> }) {
  const points = list<Point>(scene.payload, "points");
  return <div className="concept-grid">{points.map((point, index) =>
    <article key={point.id} className={`concept-card ${focusClass(point.id, focus)}`}>
      <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
      <h3>{point.label ?? point.id}</h3><p>{point.text}</p>
    </article>)}</div>;
}

function ArchitectureScene({ scene, step, focus }: { scene: Scene; step: SceneStep; focus: Set<string> }) {
  const nodes = list<Node>(scene.payload, "nodes"), edges = list<Edge>(scene.payload, "edges");
  const visible = new Set(step.visual?.visibleNodeIds ?? nodes.map((node) => node.id));
  const activeEdges = new Set(step.visual?.activeEdgeIds ?? []);
  const arrow = `renderer-arrow-${useId().replace(/:/g, "")}`;
  const boxes = new Map(nodes.map((node, index) => [node.id, {
    ...node,
    x: node.x ?? 30 + index * (900 / nodes.length), y: node.y ?? 190,
    width: node.width ?? Math.min(170, 850 / nodes.length), height: node.height ?? 110,
  }]));
  return <svg className="renderer-diagram" viewBox="0 0 960 480" role="img" aria-label={scene.title}>
    <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
    {edges.map((edge, index) => {
      const from = boxes.get(edge.from), to = boxes.get(edge.to);
      if (!from || !to || !visible.has(edge.from) || !visible.has(edge.to)) return null;
      const id = edge.id ?? `${edge.from}->${edge.to}`;
      const coordinates = edgeEndpoints(from, to), active = activeEdges.has(id);
      return <g key={`${id}-${index}`} className={`renderer-edge ${active ? "is-active" : ""}`} data-edge={id}>
        <line {...coordinates} markerEnd={`url(#${arrow})`} />
        {edge.label && <text x={(coordinates.x1 + coordinates.x2) / 2} y={(coordinates.y1 + coordinates.y2) / 2 - 12} textAnchor="middle">{edge.label}</text>}
      </g>;
    })}
    {nodes.filter((node) => visible.has(node.id)).map((node) => {
      const box = boxes.get(node.id)!;
      return <g key={node.id} className={`renderer-node ${focus.has(node.id) ? "is-active" : ""}`} data-node={node.id}>
        <rect x={box.x} y={box.y} width={box.width} height={box.height} rx="7" />
        <foreignObject x={box.x + 8} y={box.y + 4} width={box.width - 16} height={box.height - 8}>
          <div className="renderer-node-label"><small>{node.shape ?? "module"}</small><strong>{node.label ?? node.id}</strong>{node.detail && <span>{node.detail}</span>}</div>
        </foreignObject>
      </g>;
    })}
  </svg>;
}

function EquationScene({ scene, step, focus }: { scene: Scene; step: SceneStep; focus: Set<string> }) {
  const formula = step.visual?.tex ?? text(scene.payload, "tex", String.raw`E = mc^2`);
  const parts = list<EquationPart>(scene.payload, "parts");
  const visible = new Set(step.visual?.visiblePartIds ?? parts.map((part) => part.id));
  const macros = scene.payload.macros as Record<string, string> | undefined;
  return <div className="equation-layout">
    <div className="equation-main"><MathText tex={formula} macros={macros} displayMode /></div>
    <div className="equation-parts">{parts.filter((part) => visible.has(part.id)).map((part) =>
      <article key={part.id} className={`equation-part ${focusClass(part.id, focus)}`} data-part={part.id}>
        <div className="renderer-term"><MathText tex={part.tex ?? part.label ?? part.id} macros={macros} /></div>
        <p>{part.explanation}</p>
      </article>)}</div>
  </div>;
}

function AlgorithmScene({ scene, step, stepIndex, focus }: Props & { focus: Set<string> }) {
  const lines = list<AlgorithmLine>(scene.payload, "lines");
  const variables = step.visual?.variables;
  const previous = stepIndex > 0 ? scene.steps[stepIndex - 1].visual?.variables ?? {} : {};
  return <div className={`renderer-trace ${variables ? "has-state" : ""}`}>
    <div className="algorithm-panel">{lines.map((line, index) =>
      <div key={line.id} className={`algorithm-line ${focusClass(line.id, focus)}`} data-line={line.id}>
        <span>{String(index + 1).padStart(2, "0")}</span><code>{line.code ?? line.id}</code><p>{line.explanation}</p>
      </div>)}</div>
    {variables && <aside className="renderer-state"><h3>当前状态</h3><dl>
      {Object.entries(variables).map(([name, value]) => <div key={name} data-changed={previous[name] !== value}><dt>{name}</dt><dd>{String(value)}</dd></div>)}
    </dl>{step.visual?.output !== undefined && <p>输出：{step.visual.output}</p>}</aside>}
  </div>;
}

function ComparisonScene({ scene, step, focus }: { scene: Scene; step: SceneStep; focus: Set<string> }) {
  const items = list<ComparisonItem>(scene.payload, "items");
  const metric = scene.payload.metric as Metric | undefined;
  const baselineId = text(scene.payload, "baselineId", items[0]?.id);
  const baseline = items.find((item) => item.id === baselineId);
  const visible = new Set(step.visual?.visibleItemIds ?? items.map((item) => item.id));
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

function FigureImage({ scene, step }: { scene: Scene; step: SceneStep }) {
  const [failed, setFailed] = useState(false);
  const clipId = `renderer-crop-${useId().replace(/:/g, "")}`;
  const image = scene.payload.image as ImageInfo;
  const regions = list<Region>(scene.payload, "regions");
  const requested = step.visual?.regionId === undefined ? (step.focusIds ?? []).find((id) => regions.some((region) => region.id === id)) : step.visual.regionId;
  const region = regions.find((item) => item.id === requested);
  const src = assetUrl(image.src);
  if (failed) return <p className="renderer-error" role="alert">无法加载原图：{image.src}</p>;
  return <figure className="renderer-figure">
    <div className="renderer-figure-pair">
      <div><h3>原图概览</h3><svg viewBox={`0 0 ${image.width} ${image.height}`} role="img" aria-label={image.alt}>
        <image href={src} width={image.width} height={image.height} onError={() => setFailed(true)} />
        {region && <rect className="renderer-region" x={region.x * image.width} y={region.y * image.height} width={region.width * image.width} height={region.height * image.height} vectorEffect="non-scaling-stroke" />}
      </svg></div>
      <div><h3>{region?.label ?? "全图"}</h3><svg className="renderer-zoom" viewBox={regionViewBox(region, image.width, image.height)} role="img" aria-label={region ? `局部放大：${region.label}` : image.alt}>
        <defs><clipPath id={clipId}><rect x={(region?.x ?? 0) * image.width} y={(region?.y ?? 0) * image.height} width={(region?.width ?? 1) * image.width} height={(region?.height ?? 1) * image.height} /></clipPath></defs>
        <image href={src} width={image.width} height={image.height} clipPath={`url(#${clipId})`} onError={() => setFailed(true)} />
      </svg></div>
    </div>
    {text(scene.payload, "caption") && <figcaption>{text(scene.payload, "caption")}</figcaption>}
  </figure>;
}

function FigureScene({ scene, step, focus }: { scene: Scene; step: SceneStep; focus: Set<string> }) {
  const image = scene.payload.image as ImageInfo | undefined;
  if (image) return <FigureImage key={image.src} scene={scene} step={step} />;
  const src = text(scene.payload, "src"), alt = text(scene.payload, "alt", scene.title);
  const callouts = list<Callout>(scene.payload, "callouts");
  return <figure className="figure-inspector"><div className="figure-canvas">
    {src ? <img src={assetUrl(src)} alt={alt} /> : <div className="figure-placeholder">Add the paper figure to project/public/assets</div>}
    {callouts.map((callout) => <span key={callout.id} className={`figure-callout ${focusClass(callout.id, focus)}`}
      style={{ left: `${callout.x ?? 10}%`, top: `${callout.y ?? 10}%`, width: `${callout.width ?? 20}%`, height: `${callout.height ?? 20}%` }}>{callout.label}</span>)}
  </div>{text(scene.payload, "caption") && <figcaption>{text(scene.payload, "caption")}</figcaption>}</figure>;
}

export function SceneRenderer({ scene, step, stepIndex }: Props) {
  const focus = new Set(step.focusIds ?? []);
  switch (scene.type) {
    case "architecture_execution": return <ArchitectureScene scene={scene} step={step} focus={focus} />;
    case "equation_walkthrough": return <EquationScene scene={scene} step={step} focus={focus} />;
    case "algorithm_trace": return <AlgorithmScene scene={scene} step={step} stepIndex={stepIndex} focus={focus} />;
    case "ablation_comparison": return <ComparisonScene scene={scene} step={step} focus={focus} />;
    case "figure_inspector": return <FigureScene scene={scene} step={step} focus={focus} />;
    default: return <ConceptScene scene={scene} focus={focus} />;
  }
}
