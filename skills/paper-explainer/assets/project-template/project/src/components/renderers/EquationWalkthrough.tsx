import katex from "katex";
import type { Scene, SceneStep } from "../../types";
import { focusClass, list, object, stepState, text, type EquationPart } from "./model";

function MathText({ tex, macros, block = false }: { tex: string; macros: Record<string, string>; block?: boolean }) {
  try {
    const html = katex.renderToString(tex, { displayMode: block, throwOnError: true, trust: false, macros: { ...macros }, output: "htmlAndMathml" });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="math-error" role="alert">公式无法排版，请核对 LaTeX：<code>{tex}</code></span>;
  }
}

export function EquationWalkthrough({ scene, step }: { scene: Scene; step: SceneStep }) {
  const state = stepState(step), focus = new Set(step.focusIds ?? []);
  const formula = state.tex ?? text(scene.payload, "tex", String.raw`E = mc^2`);
  const macros = Object.fromEntries(Object.entries(object(scene.payload, "macros")).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const parts = list<EquationPart>(scene.payload, "parts");
  const visible = new Set(state.visiblePartIds ?? parts.map((part) => part.id));
  return <div className="equation-layout">
    <div className="equation-main"><MathText tex={formula} macros={macros} block /></div>
    <div className="equation-parts">
      {parts.filter((part) => visible.has(part.id)).map((part) => <article key={part.id} data-part={part.id} className={`equation-part ${focusClass(part.id, focus)}`}>
        <code><MathText tex={part.tex ?? part.label ?? part.id} macros={macros} /></code><p>{part.explanation}</p>
      </article>)}
    </div>
  </div>;
}
