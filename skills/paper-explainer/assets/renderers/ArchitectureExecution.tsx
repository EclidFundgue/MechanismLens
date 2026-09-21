import { useId } from 'react';
import type { ArchitectureScene, RendererProps } from './types';
import { edgeEndpoints, stepIndex } from './model';
import { SceneFrame } from './shared';

export function ArchitectureExecution({ scene, step }: RendererProps<ArchitectureScene>) {
  const index = stepIndex(step, scene.steps.length), beat = scene.steps[index];
  const arrow = `pe-arrow-${useId().replace(/:/g, '')}`;
  return <SceneFrame scene={scene} step={index}>
    <svg className="pe-diagram" viewBox="0 0 960 480" role="img" aria-label={beat.explanation}>
      <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
      {scene.edges.map((edge) => {
        const from = scene.nodes.find((n) => n.id === edge.from)!;
        const to = scene.nodes.find((n) => n.id === edge.to)!;
        if (!beat.visibleNodeIds.includes(from.id) || !beat.visibleNodeIds.includes(to.id)) return null;
        const points = edgeEndpoints(from, to), active = beat.activeEdgeIds.includes(edge.id);
        return <g key={edge.id} data-edge={edge.id} data-active={active} className={active ? 'pe-edge pe-active' : 'pe-edge'}>
          <line {...points} markerEnd={`url(#${arrow})`} />
          {edge.label && <text x={(points.x1 + points.x2) / 2} y={(points.y1 + points.y2) / 2 - 12} textAnchor="middle">{edge.label}</text>}
        </g>;
      })}
      {scene.nodes.filter((node) => beat.visibleNodeIds.includes(node.id)).map((node) => {
        const active = beat.activeNodeIds.includes(node.id);
        return <g key={node.id} data-node={node.id} data-active={active} className={active ? 'pe-node pe-active' : 'pe-node'}>
          <rect x={node.x} y={node.y} width={node.width} height={node.height} rx="8" />
          <foreignObject x={node.x + 10} y={node.y + 6} width={node.width - 20} height={node.height - 12}>
            <div className="pe-node-label"><strong>{node.label}</strong>{node.detail && <small>{node.detail}</small>}</div>
          </foreignObject>
        </g>;
      })}
    </svg>
  </SceneFrame>;
}
