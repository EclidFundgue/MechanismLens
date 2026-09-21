import type { ReactNode } from 'react';
import type { Scene } from './types';

export function SceneFrame({ scene, step, children }: { scene: Scene; step: number; children: ReactNode }) {
  return <section className="pe-renderer" data-renderer={scene.kind} data-step={step} aria-label={scene.title}>
    <header className="pe-renderer-header"><h2>{scene.title}</h2><span>{step + 1} / {scene.steps.length}</span></header>
    <div className="pe-renderer-content">{children}</div>
    <p className="pe-explanation">{scene.steps[step].explanation}</p>
    <small className="pe-source">{scene.source}</small>
  </section>;
}
