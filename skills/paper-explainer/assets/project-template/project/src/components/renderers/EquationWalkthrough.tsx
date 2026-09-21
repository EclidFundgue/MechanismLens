import { visibleIds } from "../renderer-model";
import { MathText } from "./MathText";
import type { EquationPart, RendererProps } from "./shared";
import { focusClass, focusFor, list, text } from "./shared";

export function EquationWalkthrough({ scene, step }: RendererProps) {
  const focus = focusFor(step);
  const formula = step.visual?.tex ?? text(scene.payload, "tex", String.raw`E = mc^2`);
  const parts = list<EquationPart>(scene.payload, "parts");
  const visible = visibleIds(step.visual?.visiblePartIds, parts.map((part) => part.id));
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
