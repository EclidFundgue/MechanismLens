import { useId, useState } from 'react';
import type { FigureScene, RendererProps } from './types';
import { regionViewBox, stepIndex } from './model';
import { SceneFrame } from './shared';

function FigureImage({ scene, step }: RendererProps<FigureScene>) {
  const [failed, setFailed] = useState(false);
  const cropId = `pe-crop-${useId().replace(/:/g, '')}`;
  const { image } = scene, region = scene.regions.find((r) => r.id === scene.steps[step].regionId);
  if (failed) return <p className="pe-math-error" role="alert">无法加载原图：{image.src}</p>;
  return <div className="pe-figure-pair">
    <div className="pe-figure"><h3>原图概览</h3>
      <svg viewBox={`0 0 ${image.width} ${image.height}`} role="img" aria-label={image.alt}>
        <image href={image.src} width={image.width} height={image.height} onError={() => setFailed(true)} />
        {region && <rect className="pe-region" data-region={region.id} x={region.x * image.width} y={region.y * image.height} width={region.width * image.width} height={region.height * image.height} vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
    <div className="pe-figure"><h3>{region ? region.label : '全图'}</h3>
      <svg className="pe-zoom" viewBox={regionViewBox(region, image.width, image.height)} preserveAspectRatio="xMidYMid meet" role="img" aria-label={region ? `局部放大：${region.label}` : image.alt}>
        <defs><clipPath id={cropId}><rect x={(region?.x ?? 0) * image.width} y={(region?.y ?? 0) * image.height} width={(region?.width ?? 1) * image.width} height={(region?.height ?? 1) * image.height} /></clipPath></defs>
        <image href={image.src} width={image.width} height={image.height} clipPath={`url(#${cropId})`} onError={() => setFailed(true)} />
      </svg>
    </div>
  </div>;
}

export function FigureInspector({ scene, step }: RendererProps<FigureScene>) {
  const index = stepIndex(step, scene.steps.length);
  return <SceneFrame scene={scene} step={index}><FigureImage key={scene.image.src} scene={scene} step={index} /></SceneFrame>;
}
