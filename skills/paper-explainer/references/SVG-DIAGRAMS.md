# SVG-DIAGRAMS.md — 架构图 / 算法流程图 / 结果图表的呈现

**素材策略（重绘 vs 原图）与取图 / 嵌入规范见 `PAPER-ASSETS.md` §0 / §5**；
本文件只讲怎么把 SVG 图画好：逐节点揭示、尺寸、配色、动效纪律。唯一禁止
的是用图像生成模型画架构图 / 流程图 / 结果图（会画错结构），**不是**禁止
贴论文原图。

颜色只用主题 token：`--accent` `--text` `--text-mute` `--rule`
`--surface-2` `--font-mono`。不要写死 hex。

> **与 CHAPTER-CRAFT 原则 3 的关系（重要）**：WVP 的「每步独占整屏
> `if (step === N) return <FullScene/>`」有一个**被认可的例外**——就是
> 本节这种「一张图常驻 + 随 step 逐节点点亮」。架构图 / 流程图 / 结果图
> 都属于这个例外：图**不整屏切换**，而是同一张 SVG 持续存在、由 `step`
> 推进高亮。若需要，可以在图旁配「逐步变化的说明文字」形成混合版，
> 但**图的骨架必须常驻**，否则失去「流程在推进」的观感。

---

## 0. 通用：逐节点揭示

每章组件是 `step` 的纯函数（见 web-video-presentation 的 CHAPTER-CRAFT）。
让「当前激活到第几个元素」直接由 step 决定，动画才有内容意义：

```tsx
// activeIndex = 当前应点亮的节点下标；用 step 直接算，别用定时器
const active = step; // 或 Math.min(step, NODES.length - 1)
```

- 已点亮：`fill/stroke = var(--accent)`
- 未点亮：`var(--rule)` + `opacity: .35`
- 当前节点：额外 pulse / 描边加粗

**禁止**用 `setInterval` 自己播动画——那会和 step 计数器脱钩，录屏时
对不上字幕。

### 0.5 用原图时

复杂大图 / 定性结果 / 密集表格走原图路径（选择见 `PAPER-ASSETS.md` §0），
但**同样要由 `step` 驱动**——高亮框 / 箭头 / 局部放大 / 逐块裁剪，不允许
静态贴图一屏到底；并做到注明编号、裁切干净、暗色主题放纸面卡片（规范见
`PAPER-ASSETS.md` §5–§6）。

---

## 1. 架构图（Architecture）

### 结构模式

- 纵向分层（输入 → 编码 → 融合 → 解码 → 输出）或横向流水线；
- 每个模块一个 `<rect>` + 标题 + 形状标注（如 `B×L×D`）；
- 模块间用带箭头的 `<path>`；差异模块用 accent 描边高亮；
- **尺寸按 viewBox 相对定义**，不要写死像素：先用
  `viewBox="0 0 1200 620"`，模块取 `width=220 height=72`、间距 `32`
  这类相对值，再让外层 SVG `width="100%"` 自适应。舞台留给「图 + 文案」
  双栏时，图的可用区约 **1100×620**（单栏纯图时可到 1520×760）。写死
  `320×96 / 1520×760` 会在一图一文案的章节里溢出。

### 骨架

```tsx
const MODULES = [
  { id: "input",  label: "Input",  shape: "B×L×3" },
  { id: "enc",    label: "Encoder", shape: "B×L×D" },
  { id: "fusion", label: "Fusion",  shape: "B×L×D" },
  { id: "dec",    label: "Decoder", shape: "B×L×C" },
];

function Box({ x, y, m, active, current }: {...}) {
  return (
    <g opacity={active ? 1 : 0.35}
       style={{ transition: "opacity 500ms var(--ease-quart)" }}>
      <rect x={x} y={y} width={320} height={96} rx={6}
            fill="var(--surface-2)"
            stroke={current ? "var(--accent)" : "var(--rule)"}
            strokeWidth={current ? 3 : 1} />
      <text x={x + 24} y={y + 42} fill="var(--text)"
            fontFamily="var(--font-mono)" fontSize={26}>{m.label}</text>
      <text x={x + 24} y={y + 74} fill="var(--text-mute)"
            fontFamily="var(--font-mono)" fontSize={16}>{m.shape}</text>
    </g>
  );
}
```

箭头用 `<path d="M x1 y1 L x2 y2" stroke="var(--rule)" markerEnd="url(#arrow)"/>`，
`<defs>` 里定义一个 `marker` 即可。**已走过的边**（`step` 超过其目标节点）
换成 `var(--accent)`。

---

## 2. 算法流程图（Flowchart）

### 结构模式

- 节点类型区分形状：处理 = 圆角矩形；判断 = 菱形；起止 = 胶囊；
- 主干竖向排布，分支向右/左偏移；
- 每个节点配一行极短说明（≤ 8 字），长解释留给字幕；
- **逐节点点亮**是本工作流的招牌动效：第 i 个 step 点亮第 i 个节点 +
  连接它上一条边。

### 节点状态

```tsx
type NodeState = "idle" | "done" | "current";
const stateOf = (i: number): NodeState =>
  i < step ? "done" : i === step ? "current" : "idle";
```

```tsx
const STROKE: Record<NodeState, string> = {
  idle: "var(--rule)",
  done: "var(--accent)",
  current: "var(--accent)",
};
```

### 循环/回边

训练循环的回边用曲线 `<path d="M ... C ...">` 画在侧边，`stroke-dasharray`
表示「反复执行」；点亮到循环体时让回边做一次 `stroke-dashoffset` 流动
（用 CSS animation，尊重 `prefers-reduced-motion`）。

### 伪代码（配合流程图）

流程图旁边可放论文 Algorithm 的伪代码，用 `<pre>` + 每行 `<span>`，
按 `step` 高亮当前行：

```tsx
<pre className="mono">
  {LINES.map((l, i) => (
    <span key={i} style={{
      display: "block",
      color: i === step ? "var(--text)" : "var(--text-mute)",
      background: i === step ? "var(--accent-soft)" : "transparent",
    }}>{l}</span>
  ))}
</pre>
```

---

## 3. 结果图表（Results / Ablation）

**从论文表格里的真实数字重绘**（digest 的「图表清单」已登记）。不要
凭印象编数据。

### 柱状图（主结果）

- 每根柱一个 baseline / 变体，柱顶标数值；
- 本文方法用 `var(--accent)`，其余 `var(--rule)`；
- 按 step 逐根揭示（1 step = 1 根柱），最后一 step 显示提升幅度标注。
- **step 预算不够时**（一章 5–8 step 要放多张图）：改为**一 step 揭示
  一整张图**，图内用 stagger（每根柱错峰 80–120ms）一次亮完。预算够
  （图少、step 多）才用「一 step 一根柱」。别为了逐柱揭示硬塞 step。

### 折线图（消融 / 曲线）

- `<polyline>` 画线，`<circle>` 画点；
- 每条线按 step 逐条揭示；图例同步点亮；
- 坐标轴用 `var(--rule)`，刻度文字 `var(--font-mono)` + `var(--text-mute)`。

### 表格（对比表）

- 不要用 HTML `<table>` 堆边框；用 SVG 或 flex 行 + `.rule` 分隔线；
- 每行一个 step 揭示，最终行（本文方法）用 accent 底/描边；
- 提升数字（如 `+3.2`）用 accent 色强调。

### 数值一致性

重绘前对照 `digest.md` 与 `paper.md`：**表里的每个数字都要能回溯**。
若有四舍五入，保持与论文一致的小数位。

---

## 4. 动效纪律

- 只动 `transform` / `opacity` / `stroke-dashoffset` / `fill`；
- 每条边/节点的揭示时长 300–600ms，用 `var(--ease-quart)`；
- `prefers-reduced-motion: reduce` 时全部瞬时到位；
- 动画时长 **≤ 该 step 字幕停留时长**（否则拆 step 或加快）。

---

## 5. 自检

- [ ] 架构图模块顺序、连接关系与论文一致？（对照 digest 第 4 节）
- [ ] 流程图节点数 = 算法步骤数，且与伪代码对得上？（第 5 节）
- [ ] 结果图每个数字都能在 paper.md 定位？（第 7 节）
- [ ] 所有颜色走 token，没有硬编码 hex？
- [ ] 图内英文标注用可读字体（`var(--font-mono)` / `var(--font-body)`），
      无花体 / `cursive`？
- [ ] 揭示完全由 `step` 驱动，没有独立计时器？
- [ ] 逐步揭示：没有「一次全亮」的图？
- [ ] 若用了原图：是否注明编号、裁切干净、在纸面卡片上可读？
- [ ] 若用了原图：是否仍由 `step` 驱动高亮/放大，而非静态贴图？
