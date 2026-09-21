import { defineScene } from './model';
import type { Scene } from './types';

/** Illustrative data only; replace with verified source content in real chapters. */
export const exampleScenes: Scene[] = [
  defineScene({
    kind: 'architecture_execution', id: 'retrieval', title: '从问题到有依据的回答',
    source: '示意架构：展示 Renderer 行为，不代表某篇论文的实现。',
    nodes: [
      { id: 'query', label: '问题', detail: '文本输入', x: 30, y: 170, width: 170, height: 100 },
      { id: 'retrieve', label: '检索', detail: '寻找相关片段', x: 310, y: 170, width: 190, height: 100 },
      { id: 'docs', label: '文档库', detail: '来源与证据', x: 310, y: 10, width: 190, height: 90 },
      { id: 'answer', label: '生成回答', detail: '结合检索证据', x: 650, y: 170, width: 230, height: 100 },
    ],
    edges: [
      { id: 'q-r', from: 'query', to: 'retrieve', label: '查询' },
      { id: 'd-r', from: 'docs', to: 'retrieve' },
      { id: 'r-a', from: 'retrieve', to: 'answer', label: '证据' },
    ],
    steps: [
      { narration: '从一个问题开始。', explanation: '先明确输入，再逐步展开处理过程。', visibleNodeIds: ['query'], activeNodeIds: ['query'], activeEdgeIds: [] },
      { narration: '检索器从文档库中寻找相关证据。', explanation: '同时看到查询与文档来源，避免把检索当成黑盒。', visibleNodeIds: ['query', 'retrieve', 'docs'], activeNodeIds: ['retrieve'], activeEdgeIds: ['q-r', 'd-r'] },
      { narration: '证据传入生成模块，形成回答。', explanation: '高亮沿数据流移动，已出现的架构保持可见。', visibleNodeIds: ['query', 'retrieve', 'docs', 'answer'], activeNodeIds: ['answer'], activeEdgeIds: ['r-a'] },
    ],
  }),
  defineScene({
    kind: 'equation_walkthrough', id: 'mean', title: '把一个均值公式拆开讲',
    source: '教学示例：三个数 2、4、6 的算术平均数。',
    terms: [
      { id: 'x', tex: 'x_i', meaning: '第 i 个观测值' },
      { id: 'n', tex: 'n', meaning: '观测值的数量' },
      { id: 'mean', tex: '\\bar{x}', meaning: '所有观测值的平均数' },
    ],
    steps: [
      { narration: '均值把多个观测值概括成一个数。', explanation: '先说明公式要解决的问题。', tex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i', visibleTermIds: ['mean'], highlightTermIds: ['mean'] },
      { narration: '把三个观测值相加，再除以数量。', explanation: '代入数据，区分观测值与计数。', tex: '\\bar{x}=\\frac{2+4+6}{3}', visibleTermIds: ['mean', 'x', 'n'], highlightTermIds: ['x', 'n'] },
      { narration: '这组数据的平均数等于四。', explanation: '回到结果，并保留变量释义。', tex: '\\bar{x}=\\frac{12}{3}=4', visibleTermIds: ['mean', 'x', 'n'], highlightTermIds: ['mean'] },
    ],
  }),
  defineScene({
    kind: 'algorithm_trace', id: 'sum', title: '跟踪一次求和循环',
    source: '教学示例：预先核对的状态快照；不执行输入代码。',
    lines: [
      { id: 'init', code: 'total = 0' }, { id: 'loop', code: 'for x in [2, 4, 6]:' },
      { id: 'add', code: '    total = total + x' }, { id: 'return', code: 'return total' },
    ],
    steps: [
      { narration: '累加器从零开始。', explanation: '初始化状态。', activeLineIds: ['init'], variables: { total: 0 } },
      { narration: '读到二，累加器变成二。', explanation: '同一行代码可以在多个步骤重复执行。', activeLineIds: ['loop', 'add'], variables: { x: 2, total: 2 } },
      { narration: '读到四，累加器变成六。', explanation: '高亮变化的变量值，展示本轮结果。', activeLineIds: ['add'], variables: { x: 4, total: 6 } },
      { narration: '加上六，最终返回十二。', explanation: '返回完整执行结果；向后跳转可恢复任一步状态。', activeLineIds: ['return'], variables: { x: 6, total: 12 }, output: '12' },
    ],
  }),
  defineScene({
    kind: 'ablation_comparison', id: 'ablation', title: '一个模块带来了多少变化？',
    source: '全部数值均为演示数据，不是论文实验结论。',
    metric: { label: '准确率', unit: '%', direction: 'higher', decimals: 1 }, baselineId: 'base',
    variants: [
      { id: 'base', label: '基线', value: 70, components: ['编码器'] },
      { id: 'retrieval', label: '加入检索', value: 78, components: ['编码器', '检索器'] },
      { id: 'full', label: '完整方案', value: 82, components: ['编码器', '检索器', '重排器'] },
    ],
    steps: [
      { narration: '先固定基线与评价指标。', explanation: '所有柱使用同一个从零开始的坐标轴。', visibleVariantIds: ['base'], focusId: 'base' },
      { narration: '加入检索后，示意准确率提高八个百分点。', explanation: '差值是同一单位的绝对差，不是相对提升百分比。', visibleVariantIds: ['base', 'retrieval'], focusId: 'retrieval' },
      { narration: '完整方案比基线高十二个百分点。', explanation: '显示配置组成，避免把多项改动归因于单个模块。', visibleVariantIds: ['base', 'retrieval', 'full'], focusId: 'full' },
    ],
  }),
  defineScene({
    kind: 'figure_inspector', id: 'figure', title: '保留原图，逐区解释',
    source: '原创示意图：fixture-figure.svg；框选坐标相对原图归一化。',
    image: { src: './fixture-figure.svg', alt: '示意图：左侧输入数据，右侧处理结果', width: 800, height: 480 },
    regions: [
      { id: 'input', label: '输入区域', x: 0.06, y: 0.15, width: 0.38, height: 0.65 },
      { id: 'output', label: '结果区域', x: 0.55, y: 0.15, width: 0.4, height: 0.65 },
    ],
    steps: [
      { narration: '先看原图的整体结构。', explanation: '原图始终可见，并保留来源说明。', regionId: null },
      { narration: '聚焦左侧输入，查看原始信息。', explanation: '左边标记位置，右边显示该区域的放大视图。', regionId: 'input' },
      { narration: '再看右侧结果，连接两部分含义。', explanation: '框选与放大使用同一套坐标，不依赖屏幕像素。', regionId: 'output' },
    ],
  }),
];
