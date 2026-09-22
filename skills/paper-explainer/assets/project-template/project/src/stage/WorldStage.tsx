import { useId, useState } from "react";
import { useCameraViewBox, type CameraPhase } from "../camera/useCameraViewBox";
import { assetUrl } from "../lib/source";
import type { ChartPrimitive, CodePrimitive, CompiledWorld, EquationPrimitive, ImagePrimitive, Primitive, SceneState, SceneStep } from "../types";
import { MathText } from "../components/renderers/MathText";
import { comparisonDelta, comparisonDomain, boundsToViewBox } from "./model";
import "./world-stage.css";

interface DrawingState {
  visible: Set<string>;
  emphasis: Set<string>;
  activeRelations: Set<string>;
  state: SceneState;
  previousState?: SceneState;
}

function primitiveClass(object: Primitive, drawing: DrawingState, ownerFocus: Set<string>) {
  const focused = drawing.emphasis.size === 0 || drawing.emphasis.has(object.id) || ownerFocus.has(object.id);
  return `world-object world-${object.kind} ${focused ? "is-emphasized" : "is-deemphasized"}`;
}

function HtmlBox({ object, className }: { object: Primitive; className: string }) {
  const text = "text" in object ? object.text : "detail" in object ? object.detail : undefined;
  const role = "role" in object ? object.role : object.kind;
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} className={className}>
    <div className="world-html-box">
      <small>{role}</small>
      <strong>{object.label ?? object.id}</strong>
      {text && <span>{text}</span>}
    </div>
  </foreignObject>;
}

function EquationMark({ object, drawing, className }: { object: EquationPrimitive; drawing: DrawingState; className: string }) {
  const tex = drawing.state.equations?.[object.id] ?? object.tex;
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} className={className}>
    <div className="world-equation-box">
      <div className="world-equation-main"><MathText tex={tex} macros={object.macros} displayMode /></div>
      <div className="world-equation-parts">{object.parts?.map((part) => <article key={part.id} className={drawing.emphasis.size === 0 || drawing.emphasis.has(part.id) ? "is-emphasized" : "is-deemphasized"}>
        <MathText tex={part.tex} macros={object.macros} /><p>{part.explanation}</p>
      </article>)}</div>
    </div>
  </foreignObject>;
}

function CodeMark({ object, drawing, className }: { object: CodePrimitive; drawing: DrawingState; className: string }) {
  const variables = drawing.state.variables?.[object.id];
  const previous = drawing.previousState?.variables?.[object.id] ?? {};
  return <foreignObject x={object.x} y={object.y} width={object.width} height={object.height} className={className}>
    <div className={`world-code-box ${variables ? "has-state" : ""}`}>
      <div className="world-code-lines"><h3>{object.label ?? object.id}</h3>{object.lines.map((line, index) => <div key={line.id} className={drawing.emphasis.size === 0 || drawing.emphasis.has(line.id) ? "is-emphasized" : "is-deemphasized"}>
        <span>{String(index + 1).padStart(2, "0")}</span><code>{line.code}</code><p>{line.explanation}</p>
      </div>)}</div>
      {variables && <aside><h3>当前状态</h3><dl>{Object.entries(variables).map(([name, value]) => <div key={name} data-changed={previous[name] !== value}><dt>{name}</dt><dd>{String(value)}</dd></div>)}</dl>{drawing.state.outputs?.[object.id] && <p>输出：{drawing.state.outputs[object.id]}</p>}</aside>}
    </div>
  </foreignObject>;
}

function ChartMark({ object, drawing, className }: { object: ChartPrimitive; drawing: DrawingState; className: string }) {
  const visible = new Set(drawing.state.visibleItems?.[object.id] ?? object.items.map((item) => item.id));
  const baseline = object.items.find((item) => item.id === object.baselineId);
  const [lo, hi] = comparisonDomain(object.items.map((item) => item.value));
  const left = object.x + 270, span = object.width - 450;
  const x = (value: number) => left + (value - lo) / (hi - lo) * span;
  const rowHeight = Math.min(70, (object.height - 100) / Math.max(1, object.items.length));
  return <g className={className}>
    <rect className="world-surface" x={object.x} y={object.y} width={object.width} height={object.height} rx="12" />
    <text className="world-chart-title" x={object.x + 20} y={object.y + 32}>{object.metric.label} · {object.metric.direction === "higher" ? "越高越好" : "越低越好"}</text>
    <line className="world-chart-axis" x1={x(0)} x2={x(0)} y1={object.y + 50} y2={object.y + object.height - 28} />
    {object.items.filter((item) => visible.has(item.id)).map((item, index) => {
      const y = object.y + 60 + index * rowHeight;
      const delta = baseline ? comparisonDelta(item.value, baseline.value, object.metric.direction, object.metric.decimals) : null;
      const focused = drawing.emphasis.size === 0 || drawing.emphasis.has(item.id);
      return <g key={item.id} className={`world-chart-row ${focused ? "is-emphasized" : "is-deemphasized"}`}>
        <text x={object.x + 18} y={y + 24}>{item.label}</text>
        <rect x={Math.min(x(0), x(item.value))} y={y} width={Math.abs(x(item.value) - x(0))} height="30" rx="4" />
        <text x={object.x + object.width - 145} y={y + 24}>{item.displayValue ?? `${item.value.toFixed(object.metric.decimals)}${object.metric.unit}`}</text>
        {delta && <text className="world-chart-delta" data-outcome={delta.outcome} x={object.x + object.width - 65} y={y + 24}>{item.id === object.baselineId ? "基线" : `${delta.delta > 0 ? "+" : ""}${delta.delta.toFixed(object.metric.decimals)}`}</text>}
      </g>;
    })}
  </g>;
}

function ImageMark({ object, drawing, className }: { object: ImagePrimitive; drawing: DrawingState; className: string }) {
  const [failed, setFailed] = useState(false);
  const selected = drawing.state.selectedRegions?.[object.id];
  return <g className={className}>
    <rect className="world-paper" x={object.x} y={object.y} width={object.width} height={object.height} rx="8" />
    {!failed && <image href={assetUrl(object.src)} x={object.x} y={object.y} width={object.width} height={object.height} preserveAspectRatio="none" onError={() => setFailed(true)} />}
    {failed && <text className="world-image-error" x={object.x + 30} y={object.y + 60}>无法加载原图：{object.src}</text>}
    {object.regions?.map((region) => {
      const focused = selected === region.id || drawing.emphasis.has(region.id);
      return <g key={region.id} className={`world-region ${focused ? "is-emphasized" : ""}`}>
        <rect x={object.x + region.x * object.width} y={object.y + region.y * object.height} width={region.width * object.width} height={region.height * object.height} />
        {focused && <text x={object.x + region.x * object.width + 8} y={object.y + region.y * object.height + 22}>{region.label}</text>}
      </g>;
    })}
  </g>;
}

function PrimitiveMark({ object, drawing, ownerFocus }: { object: Primitive; drawing: DrawingState; ownerFocus: Set<string> }) {
  const className = primitiveClass(object, drawing, ownerFocus);
  if (object.kind === "group") return <g className={className}><rect className="world-group-frame" x={object.x} y={object.y} width={object.width} height={object.height} rx="18" /><text className="world-group-title" x={object.x + 22} y={object.y + 30}>{object.label ?? object.id}</text></g>;
  if (object.kind === "node" || object.kind === "card" || object.kind === "annotation") return <HtmlBox object={object} className={className} />;
  if (object.kind === "equation") return <EquationMark object={object} drawing={drawing} className={className} />;
  if (object.kind === "code") return <CodeMark object={object} drawing={drawing} className={className} />;
  if (object.kind === "chart") return <ChartMark object={object} drawing={drawing} className={className} />;
  return <ImageMark object={object} drawing={drawing} className={className} />;
}

function WorldDrawing({ world, drawing, markerId }: { world: CompiledWorld; drawing: DrawingState; markerId: string }) {
  const ownerFocus = new Set(world.anchors.filter((anchor) => drawing.emphasis.has(anchor.id)).map((anchor) => anchor.ownerId));
  const groups = world.objects.filter((object) => object.kind === "group" && drawing.visible.has(object.id));
  const marks = world.objects.filter((object) => object.kind !== "group" && drawing.visible.has(object.id));
  return <>
    <defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
    {groups.map((object) => <PrimitiveMark key={object.id} object={object} drawing={drawing} ownerFocus={ownerFocus} />)}
    {world.relations.map((relation) => {
      const active = drawing.activeRelations.has(relation.id);
      return <g key={relation.id} className={`world-relation ${active ? "is-active" : drawing.activeRelations.size > 0 ? "is-deemphasized" : ""}`}>
        <path d={relation.path} markerEnd={`url(#${markerId})`} />
        {relation.label && <text x={(relation.x1 + relation.x2) / 2} y={(relation.y1 + relation.y2) / 2 - 10} textAnchor="middle">{relation.label}</text>}
      </g>;
    })}
    {marks.map((object) => <PrimitiveMark key={object.id} object={object} drawing={drawing} ownerFocus={ownerFocus} />)}
  </>;
}

export function WorldStage({ world, step, previousStep, reserveDetailSpace, onCameraPhaseChange }: { world: CompiledWorld; step: SceneStep; previousStep?: SceneStep; reserveDetailSpace: boolean; onCameraPhaseChange?: (stepId: string, phase: CameraPhase) => void }) {
  const markerId = `world-arrow-${useId().replace(/:/g, "")}`;
  const viewBox = useCameraViewBox(step.camera.bounds, world.bounds, step.transition, step.id, onCameraPhaseChange);
  const drawing: DrawingState = {
    visible: new Set(step.visual.visibleIds), emphasis: new Set(step.visual.emphasisIds), activeRelations: new Set(step.visual.activeRelationIds),
    state: step.visual.state, previousState: previousStep?.visual.state,
  };
  const detail = world.detailViews.find((item) => item.id === step.visual.detailViewId);
  const detailDrawing: DrawingState | null = detail ? { visible: new Set(detail.objects.map((item) => item.id)), emphasis: new Set(), activeRelations: new Set(), state: {} } : null;
  return <div className={`world-stage ${reserveDetailSpace ? "has-detail-slot" : ""}`}>
    <svg className="world-canvas" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={world.title ?? world.id}>
      <WorldDrawing world={world} drawing={drawing} markerId={markerId} />
    </svg>
    {reserveDetailSpace && <aside className={`world-detail-panel ${detail ? "" : "is-reserved"}`} aria-hidden={detail ? undefined : true}>
      {detail && detailDrawing && <><div><span className="kicker">Detail view</span><h3>{detail.title}</h3></div>
        <svg viewBox={boundsToViewBox(detail.bounds)} role="img" aria-label={detail.title}>
          <WorldDrawing world={detail} drawing={detailDrawing} markerId={`${markerId}-detail`} />
        </svg></>}
    </aside>}
  </div>;
}
