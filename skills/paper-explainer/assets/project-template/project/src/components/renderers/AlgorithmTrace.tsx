import type { SceneStep } from "../../types";
import type { AlgorithmLine, RendererProps } from "./shared";
import { focusClass, focusFor, list } from "./shared";

export function AlgorithmTrace({ scene, step, previousStep }: RendererProps & { previousStep?: SceneStep }) {
  const focus = focusFor(step);
  const lines = list<AlgorithmLine>(scene.payload, "lines");
  const variables = step.visual?.variables;
  const previous = previousStep?.visual?.variables ?? {};
  return <div className={`renderer-trace ${variables ? "has-state" : ""}`}>
    <div className="algorithm-panel">{lines.map((line, index) =>
      <div key={line.id} className={`algorithm-line ${focusClass(line.id, focus)}`} data-line={line.id}>
        <span>{String(index + 1).padStart(2, "0")}</span><code>{line.code ?? line.id}</code><p>{line.explanation}</p>
      </div>)}</div>
    {variables && <aside className="renderer-state"><h3>当前状态</h3><dl>
      {Object.entries(variables).map(([name, value]) => <div key={name} data-changed={previous[name] !== value}><dt>{name}</dt><dd>{String(value)}</dd></div>)}
    </dl>{step.visual?.output !== undefined && <p>输出：{step.visual.output}</p>}</aside>}
  </div>;
}
