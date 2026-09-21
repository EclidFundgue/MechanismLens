import { useId } from "react";
import { architectureLayout, edgeEndpoints, visibleIds } from "../renderer-model";
import type { Edge, Node, RendererProps } from "./shared";
import { focusFor, list } from "./shared";

export function ArchitectureExecution({ scene, step }: RendererProps) {
  const focus = focusFor(step);
  const nodes = list<Node>(scene.payload, "nodes"), edges = list<Edge>(scene.payload, "edges");
  const visible = visibleIds(step.visual?.visibleNodeIds, nodes.map((node) => node.id));
  const activeEdges = new Set(step.visual?.activeEdgeIds ?? []);
  const arrow = `renderer-arrow-${useId().replace(/:/g, "")}`;
  const boxes = new Map(architectureLayout(nodes).map((node) => [node.id, node]));
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
