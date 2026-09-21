import { useId } from "react";
import type { Scene, SceneStep } from "../../types";
import { diagramNodes, edgeEndpoints, focusClass, list, stepState, type DiagramEdge } from "./model";

export function ArchitectureExecution({ scene, step }: { scene: Scene; step: SceneStep }) {
  const nodes = diagramNodes(scene);
  const edges = list<DiagramEdge>(scene.payload, "edges");
  const state = stepState(step), focus = new Set(step.focusIds ?? []);
  const visible = new Set(state.visibleNodeIds ?? nodes.map((node) => node.id));
  const activeEdges = new Set(state.activeEdgeIds ?? [...focus].filter((id) => edges.some((edge) => edge.id === id)));
  const arrow = `renderer-arrow-${useId().replace(/:/g, "")}`;

  return <svg className="architecture-diagram" viewBox="0 0 960 480" role="img" aria-label={scene.title}>
    <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
    {edges.map((edge) => {
      const from = nodes.find((node) => node.id === edge.from), to = nodes.find((node) => node.id === edge.to);
      if (!from || !to || !visible.has(from.id) || !visible.has(to.id)) return null;
      const points = edgeEndpoints(from, to), active = activeEdges.has(edge.id) || focus.has(edge.id);
      return <g key={edge.id} className={`architecture-edge ${active ? "is-focused" : ""}`} data-edge={edge.id}>
        <line {...points} markerEnd={`url(#${arrow})`} />
        {edge.label && <text x={(points.x1 + points.x2) / 2} y={(points.y1 + points.y2) / 2 - 13} textAnchor="middle">{edge.label}</text>}
      </g>;
    })}
    {nodes.filter((node) => visible.has(node.id)).map((node) => <g key={node.id} data-node={node.id} className={`architecture-node-svg ${focusClass(node.id, focus)}`}>
      <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="8" />
      <foreignObject x={node.x + 12} y={node.y + 10} width={node.width - 24} height={node.height - 20}>
        <div className="architecture-node-copy"><small>{node.shape ?? "module"}</small><strong>{node.label ?? node.id}</strong>{node.detail && <span>{node.detail}</span>}</div>
      </foreignObject>
    </g>)}
  </svg>;
}
