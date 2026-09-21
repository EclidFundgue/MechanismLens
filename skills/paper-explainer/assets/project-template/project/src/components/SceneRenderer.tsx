import { useMemo } from "react";
import katex from "katex";
import type { Scene, SceneStep } from "../types";
import { assetUrl } from "../lib/source";

interface Props {
  scene: Scene;
  step: SceneStep;
  stepIndex: number;
}

interface Identified { id: string }
interface Point extends Identified { label?: string; text?: string }
interface Node extends Identified { label?: string; detail?: string; shape?: string }
interface Edge { from?: string; to?: string; label?: string }
interface EquationPart extends Identified { label?: string; tex?: string; explanation?: string }
interface AlgorithmLine extends Identified { code?: string; explanation?: string }
interface ComparisonItem extends Identified { label?: string; value?: number; displayValue?: string; note?: string }
interface Callout extends Identified { label?: string; x?: number; y?: number; width?: number; height?: number }

const list = <T,>(payload: Record<string, unknown>, key: string): T[] => Array.isArray(payload[key]) ? payload[key] as T[] : [];
const text = (payload: Record<string, unknown>, key: string, fallback = ""): string => typeof payload[key] === "string" ? payload[key] as string : fallback;

function focusClass(id: string, focus: Set<string>): string {
  if (focus.size === 0) return "";
  return focus.has(id) ? "is-focused" : "is-muted";
}

function ConceptScene({ scene, focus }: { scene: Scene; focus: Set<string> }) {
  const points = list<Point>(scene.payload, "points");
  return (
    <div className="concept-grid">
      {points.map((point, index) => (
        <article key={point.id} className={`concept-card ${focusClass(point.id, focus)}`}>
          <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
          <h3>{point.label ?? point.id}</h3>
          <p>{point.text}</p>
        </article>
      ))}
    </div>
  );
}

function ArchitectureScene({ scene, focus }: { scene: Scene; focus: Set<string> }) {
  const nodes = list<Node>(scene.payload, "nodes");
  const edges = list<Edge>(scene.payload, "edges");
  return (
    <div className="architecture-wrap">
      <div className="architecture-flow">
        {nodes.map((node, index) => (
          <div className="architecture-segment" key={node.id}>
            <article className={`architecture-node ${focusClass(node.id, focus)}`}>
              <span className="node-type">{node.shape ?? "module"}</span>
              <strong>{node.label ?? node.id}</strong>
              {node.detail && <small>{node.detail}</small>}
            </article>
            {index < nodes.length - 1 && <span className="flow-arrow" aria-hidden="true">→</span>}
          </div>
        ))}
      </div>
      {edges.length > 0 && (
        <div className="relation-strip">
          {edges.map((edge, index) => <span key={`${edge.from}-${edge.to}-${index}`}>{edge.from} → {edge.to}{edge.label ? ` · ${edge.label}` : ""}</span>)}
        </div>
      )}
    </div>
  );
}

function EquationScene({ scene, focus }: { scene: Scene; focus: Set<string> }) {
  const formula = text(scene.payload, "tex", String.raw`E = mc^2`);
  const parts = list<EquationPart>(scene.payload, "parts");
  const html = useMemo(() => katex.renderToString(formula, { displayMode: true, throwOnError: false }), [formula]);
  return (
    <div className="equation-layout">
      <div className="equation-main" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="equation-parts">
        {parts.map((part) => (
          <article key={part.id} className={`equation-part ${focusClass(part.id, focus)}`}>
            <code>{part.tex ?? part.label ?? part.id}</code>
            <p>{part.explanation}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function AlgorithmScene({ scene, focus }: { scene: Scene; focus: Set<string> }) {
  const lines = list<AlgorithmLine>(scene.payload, "lines");
  return (
    <div className="algorithm-panel">
      {lines.map((line, index) => (
        <div key={line.id} className={`algorithm-line ${focusClass(line.id, focus)}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <code>{line.code ?? line.id}</code>
          <p>{line.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function ComparisonScene({ scene, focus }: { scene: Scene; focus: Set<string> }) {
  const items = list<ComparisonItem>(scene.payload, "items");
  const max = Math.max(...items.map((item) => typeof item.value === "number" ? item.value : 0), 1);
  return (
    <div className="comparison-list">
      {items.map((item) => (
        <article key={item.id} className={`comparison-row ${focusClass(item.id, focus)}`}>
          <div className="comparison-label"><strong>{item.label ?? item.id}</strong><span>{item.note}</span></div>
          <div className="bar-track"><span style={{ width: `${Math.max(2, ((item.value ?? 0) / max) * 100)}%` }} /></div>
          <strong className="comparison-value">{item.displayValue ?? item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function FigureScene({ scene, focus }: { scene: Scene; focus: Set<string> }) {
  const src = text(scene.payload, "src");
  const alt = text(scene.payload, "alt", scene.title);
  const caption = text(scene.payload, "caption");
  const callouts = list<Callout>(scene.payload, "callouts");
  return (
    <figure className="figure-inspector">
      <div className="figure-canvas">
        {src ? <img src={assetUrl(src)} alt={alt} /> : <div className="figure-placeholder">Add the paper figure to project/public/assets</div>}
        {callouts.map((callout) => (
          <span
            key={callout.id}
            className={`figure-callout ${focusClass(callout.id, focus)}`}
            style={{ left: `${callout.x ?? 10}%`, top: `${callout.y ?? 10}%`, width: `${callout.width ?? 20}%`, height: `${callout.height ?? 20}%` }}
          >{callout.label}</span>
        ))}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function SceneRenderer({ scene, step }: Props) {
  const focus = new Set(step.focusIds ?? []);
  switch (scene.type) {
    case "architecture_execution": return <ArchitectureScene scene={scene} focus={focus} />;
    case "equation_walkthrough": return <EquationScene scene={scene} focus={focus} />;
    case "algorithm_trace": return <AlgorithmScene scene={scene} focus={focus} />;
    case "ablation_comparison": return <ComparisonScene scene={scene} focus={focus} />;
    case "figure_inspector": return <FigureScene scene={scene} focus={focus} />;
    default: return <ConceptScene scene={scene} focus={focus} />;
  }
}
