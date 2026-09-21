# RENDERERS.md — 五种逐步讲解组件

Phase 3 选择场景，Phase 4 安装，Phase 5 接入章节。组件模板位于
`assets/renderers/`，只依赖 React、KaTeX 和宿主主题 token。

## 1. 选择 Renderer

| kind | 适合解释 | 数据与逐步行为 |
|---|---|---|
| `architecture_execution` | 模块关系、系统数据流 | 节点、边；每步显隐节点并高亮正在工作的模块与路径 |
| `equation_walkthrough` | 符号含义、代入、推导 | 每步完整 LaTeX 表达式；逐步揭示、高亮符号释义卡片 |
| `algorithm_trace` | 循环、状态更新、操作流程 | 伪代码行、每步完整变量快照、可选输出；可反复访问同一行 |
| `ablation_comparison` | 模块增益、基线与变体比较 | 单一指标、方向、基线、2–7 个变体；共用坐标尺度，显示相对基线的绝对差值 |
| `figure_inspector` | 原图阅读、图表局部细节 | 原图尺寸、归一化区域；全图定位框与局部放大同步 |

在 `outline.md` 每章标注 `renderer`、素材来源、每步解释目标。按内容选型，
不强行让每章使用组件；封面、时间线等仍可按 WVP 写自定义章节。
一个场景只讲一件事；复杂架构拆场景、长公式拆步骤、多个指标拆对比场景。

## 2. 安装到生成的 presentation

脚手架必须已存在 `src/`。`<skill-dir>` 指实际安装的 paper-explainer skill 目录。
以下命令在 PowerShell、bash 均可使用，路径有空格时保留引号：

```sh
node "<skill-dir>/scripts/install-renderers.mjs" ./presentation
cd presentation
npm install katex
npm install -D @types/katex
```

脚本只复制模板到 `src/renderers/`，不改宿主章节、package.json 或播放器。
重复安装相同内容会跳过；发现本地修改会在复制前停止。更新模板时先比较修改，
确实需要覆盖才加 `--force`。`index.tsx` 已导入 renderer CSS 与 KaTeX CSS。

## 3. 与章节、字幕共用 step

章节保持 WVP 的目录与注册协议。下面是 `src/chapters/06-algorithm/scene.ts`：

```ts
import { defineScene, type AlgorithmScene } from '../../renderers';

export const scene = defineScene<AlgorithmScene>({
  kind: 'algorithm_trace',
  id: '06-algorithm',
  title: '累加一次输入',
  source: '教学示例；实际章节替换为原文页码或算法编号',
  lines: [
    { id: 'init', code: 'total = 0' },
    { id: 'add', code: 'total = total + x' },
  ],
  steps: [
    { narration: '先把累加器设为零。', explanation: '初始化状态。',
      activeLineIds: ['init'], variables: { total: 0 } },
    { narration: '输入二，累加器变成二。', explanation: '读取输入并更新状态。',
      activeLineIds: ['add'], variables: { x: 2, total: 2 }, output: '2' },
  ],
});
```

`narrations.ts` 从同一份步骤派生，避免字幕和画面各维护一套列表：

```ts
import { getNarrations } from '../../renderers';
import { scene } from './scene';
export const narrations = getNarrations(scene);
```

章节组件把宿主的 **0 起始** step 原样传入：

```tsx
import { SceneRenderer } from '../../renderers';
import { scene } from './scene';

export function AlgorithmChapter({ step }: { step: number }) {
  return <SceneRenderer scene={scene} step={step} />;
}
```

按原来的 WVP 章节结构注册组件，步数继续取 `narrations.length`；宿主字幕层
读取 `narrations[step]`。每条 `steps[].narration` 对应 `script.md` 一个节拍，
修改时同步 script、outline、scene，narrations 自动派生。改变步数后仍需更新
播放器 `STORAGE_KEY`。组件内部没有计时器，不创建第二套播放器或字幕。

## 4. 数据与展示约定

- 完整类型见 `assets/renderers/types.ts`，五种示例见 `examples.ts`。
  示例数字都是教学数据，不能当作文档结果；示例图片位于仓库
  `examples/renderers/public/fixture-figure.svg`，不会由安装脚本复制。
  实际章节应替换为自己的素材，不能直接引用示例路径。
- 用 `defineScene<具体Scene类型>(...)` 声明章节数据：它检查空步骤、重复 ID、
  无效引用、不可见的高亮目标、坐标边界和非法数值。它面向 TypeScript
  作者数据，不是任意外部 JSON 的解析器。缺来源或缺数据时回原文核对。
- 每步是完整快照，前进、回退、跳转都由 `scene + step` 决定。传入越界 step
  会夹到首尾；这只是显示兜底，宿主仍应维护正确的步骤范围。
- 架构节点坐标基于 `960 × 480`，连线指向矩形边缘。布局由章节作者提供，
  不自动排版；避免重叠节点与交叉遮挡。需要自环时拆出循环节点。
- 公式每步提供完整 `tex`，`terms` 提供符号解释；可带 `macros`。
  使用 KaTeX 的 HTML + MathML 输出，保留数学字体，禁用可信 HTML 命令。
  解析失败会显示错误与原始公式，应修复后再交付；不自动证明公式等价。
- 算法使用事先核对的变量快照，不执行输入代码。每步写完整状态，不能只写增量。
- 对比指标明确 `higher` / `lower`、单位、小数位和基线。差值为“当前值减基线值”，
  不是相对百分比；`%` 指标默认显示差值单位“百分点”，也可用 `deltaUnit`
  指定差值单位。负值共用零轴，
  每步必须保留基线。柱长不随可见变体改变尺度。
- 原图推荐放到 `public/assets/`，使用 `./assets/fig1.png` 等本地 URL。
  `image.width/height` 必须是原图尺寸；区域 `x/y/width/height` 为原图的
  0–1 比例，不能填屏幕像素。`regionId: null` 展示全图；图片加载失败显示提示。
  若不能准确重排公式，也可以用此组件检查公式原图。
- CSS 统一使用 `pe-` 前缀和宿主 `--text`、`--text-mute`、`--rule`、
  `--surface-2`、`--accent`、`--font-body`、`--font-mono` token。
  宿主提供有高度的舞台；默认底部预留 190px，可按实际舞台和字幕高度调整
  `--renderer-padding`。检查最长解释和字幕，避免遮挡或内容滚动后漏录。

## 5. 检查与参考关系

逐章验证首步、中间步、末步、回退与跳转；检查所有数据来源、公式解析、
图片区域、字幕安全区和主题可读性。仓库自带可运行示例与测试，命令见 README。
组件负责交互画面；MP4 仍走原有可选录屏流程，在内容定稿后执行。

设计参考了 anything2explainer 的“场景组件 + 共用视觉元素 + 统一播放时钟”
分层思路。这五个语义 Renderer 是本仓库独立实现，并非从其仓库复制的现成组件；
未引入其 Remotion、逐帧时间轴、TTS 或 render.sh 管线。对应关系为：

| 参考思路 | 本仓库接入点 |
|---|---|
| 可组合的场景与视觉元素 | 五种 Scene 类型、`rendererRegistry` 与 `SceneFrame` |
| 统一时间驱动画面 | WVP 的 step 驱动完整快照，支持交互回退 |
| 场景编排后输出视频 | 先交互演示与同步字幕，再按需录屏 |

后续新增类型时同步更新 types、defineScene、registry、SceneRenderer 分发、
示例和测试。KaTeX API 与错误处理见 [官方文档](https://katex.org/docs/api)。
