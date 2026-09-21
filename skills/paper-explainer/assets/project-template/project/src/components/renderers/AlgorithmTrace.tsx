import type { Scene, SceneStep } from "../../types";
import { focusClass, list, stepState, type AlgorithmLine } from "./model";

export function AlgorithmTrace({ scene, step, previousStep }: { scene: Scene; step: SceneStep; previousStep?: SceneStep }) {
  const focus = new Set(step.focusIds ?? []), state = stepState(step), previous = stepState(previousStep ?? { id: "", narration: "" }).variables ?? {};
  const variables = state.variables ?? {};
  return <div className="algorithm-layout">
    <div className="algorithm-panel">{list<AlgorithmLine>(scene.payload, "lines").map((line, index) => <div key={line.id} data-line={line.id} className={`algorithm-line ${focusClass(line.id, focus)} `}>
      <span>{String(index + 1).padStart(2, "0")}</span><code>{line.code ?? line.id}</code><p>{line.explanation}</p>
    </div>)}</div>
    <section className="algorithm-state" aria-label="当前状态"><h3>当前状态</h3><dl>{Object.entries(variables).map(([name, value]) => <div key={name} data-variable={name} data-changed={previous[name] !== value}><dt>{name}</dt><dd>{String(value)}</dd></div>)}</dl>{state.output !== undefined && <p>输出：{String(state.output)}</p>}</section>
  </div>;
}
