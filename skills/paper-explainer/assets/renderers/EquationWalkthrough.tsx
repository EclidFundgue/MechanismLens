import katex from 'katex';
import type { EquationScene, RendererProps } from './types';
import { stepIndex } from './model';
import { SceneFrame } from './shared';

function MathText({ tex, macros, block = false }: { tex: string; macros?: Record<string, string>; block?: boolean }) {
  try {
    const html = katex.renderToString(tex, { displayMode: block, throwOnError: true, trust: false, macros: { ...macros }, output: 'htmlAndMathml' });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="pe-math-error" role="alert">公式无法排版，请核对 LaTeX：<code>{tex}</code></span>;
  }
}

export function EquationWalkthrough({ scene, step }: RendererProps<EquationScene>) {
  const index = stepIndex(step, scene.steps.length), beat = scene.steps[index];
  return <SceneFrame scene={scene} step={index}>
    <div className="pe-equation"><MathText tex={beat.tex} macros={scene.macros} block /></div>
    <dl className="pe-terms">
      {scene.terms.filter((term) => beat.visibleTermIds.includes(term.id)).map((term) => <div key={term.id} data-term={term.id} data-active={beat.highlightTermIds.includes(term.id)}>
        <dt><MathText tex={term.tex} macros={scene.macros} /></dt><dd>{term.meaning}</dd>
      </div>)}
    </dl>
  </SceneFrame>;
}
