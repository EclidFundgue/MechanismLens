import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SceneRenderer, getNarrations } from '../../skills/paper-explainer/assets/renderers';
import { exampleScenes } from '../../skills/paper-explainer/assets/renderers/examples';
import { Subtitle } from '../../skills/paper-explainer/assets/subtitle/Subtitle';
import './style.css';

const labels = ['架构执行', '公式推导', '算法跟踪', '消融对比', '原图检查'];

function Gallery() {
  const [selected, setSelected] = useState(0), [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false), [subs, setSubs] = useState(true), [light, setLight] = useState(false);
  const scene = exampleScenes[selected];
  const narrations = useMemo(() => getNarrations(scene), [scene]);
  const move = (delta: number) => { setPlaying(false); setStep((s) => Math.max(0, Math.min(narrations.length - 1, s + delta))); };
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step === narrations.length - 1) setPlaying(false);
      else setStep((s) => s + 1);
    }, Math.max(1500, narrations[step].length * 200));
    return () => window.clearTimeout(timer);
  }, [playing, step, selected, narrations]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.isComposing) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input,textarea,select,button,a'))) return;
      if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      else if (event.key.toLowerCase() === 's') setSubs((s) => !s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return <main className="demo" data-theme={light ? 'light' : 'dark'}>
    <header className="demo-header"><div><span>PAPER EXPLAINER / P2</span><h1>把解释变成可观察的过程</h1><p>五种可复用场景 · 按步骤查看 · 所有内容均为教学示例</p></div><button onClick={() => setLight((v) => !v)}>{light ? '切换深色' : '切换浅色'}</button></header>
    <nav aria-label="选择 Renderer">{exampleScenes.map((item, i) => <button key={item.id} aria-pressed={i === selected} onClick={() => { setSelected(i); setStep(0); setPlaying(false); }}><span>0{i + 1}</span>{labels[i]}</button>)}</nav>
    <div className="demo-stage">
      <SceneRenderer scene={scene} step={step} />
      <Subtitle text={narrations[step]} visible={subs} />
    </div>
    <footer className="demo-controls">
      <div><button disabled={step === 0} onClick={() => move(-1)}>上一步</button><button disabled={step === narrations.length - 1} onClick={() => move(1)}>下一步</button><span data-testid="step-count">{step + 1} / {narrations.length}</span></div>
      <div><button aria-pressed={playing} onClick={() => { if (!playing && step === narrations.length - 1) setStep(0); setPlaying((v) => !v); }}>{playing ? '暂停' : '自动播放'}</button><button aria-pressed={subs} onClick={() => setSubs((s) => !s)}>{subs ? '关闭字幕' : '显示字幕'}</button></div>
    </footer>
    <p className="demo-help">方向键切换步骤 · S 切换字幕 · 自动播放按字幕长度估时</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Gallery /></StrictMode>);
