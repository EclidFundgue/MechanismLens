import type { Point, RendererProps } from "./shared";
import { focusClass, focusFor, list } from "./shared";

export function ConceptScene({ scene, step }: RendererProps) {
  const focus = focusFor(step);
  const points = list<Point>(scene.payload, "points");
  return <div className="concept-grid">{points.map((point, index) =>
    <article key={point.id} className={`concept-card ${focusClass(point.id, focus)}`}>
      <span className="card-index">{String(index + 1).padStart(2, "0")}</span>
      <h3>{point.label ?? point.id}</h3><p>{point.text}</p>
    </article>)}</div>;
}
