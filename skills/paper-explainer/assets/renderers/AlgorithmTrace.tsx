import type { AlgorithmScene, RendererProps } from './types';
import { stepIndex } from './model';
import { SceneFrame } from './shared';

export function AlgorithmTrace({ scene, step }: RendererProps<AlgorithmScene>) {
  const index = stepIndex(step, scene.steps.length), beat = scene.steps[index];
  const previous = index > 0 ? scene.steps[index - 1].variables : {};
  return <SceneFrame scene={scene} step={index}>
    <div className="pe-trace">
      <ol className="pe-code" aria-label="伪代码">
        {scene.lines.map((line) => <li key={line.id} data-line={line.id} data-active={beat.activeLineIds.includes(line.id)} aria-current={beat.activeLineIds.includes(line.id) ? 'step' : undefined}><code>{line.code}</code></li>)}
      </ol>
      <div className="pe-state"><h3>当前状态</h3><dl>
        {Object.entries(beat.variables).map(([name, value]) => <div key={name} data-variable={name} data-changed={previous[name] !== value}><dt>{name}</dt><dd>{String(value)}</dd></div>)}
      </dl>{beat.output !== undefined && <p className="pe-output">输出：{beat.output}</p>}</div>
    </div>
  </SceneFrame>;
}
