---
name: paper-explainer
description: 把一篇学术论文（PDF / arXiv 链接 / 网页 / 粘贴文本）做成"无声 + 字幕"的网页讲解视频。流程：解析论文 → 结构化 digest（动机/核心思想/模型设计/模型结构/算法流程/实验设计/实验结果）→ 口播稿 script → 章节 outline → 套用 web-video-presentation 的脚手架与章节方法论 → 注入全局字幕层 → 静音录屏；架构图/算法流程图/结果图表一律用 SVG 重绘并逐步揭示。触发场景：论文讲解视频、paper explainer video、把论文做成视频、论文精读/拆解视频、论文总结 + 可视化讲解、paper to video、学术论文讲解稿 + 视频。依赖已安装的 web-video-presentation 与 design-taste-frontend skill。
---

# Paper Explainer

把一篇论文变成一支**无声、带字幕、网页实现、可录屏**的讲解视频。

本 Skill 是**编排层**：它不重复造轮子，而是串起两个已安装的 skill：

- **`web-video-presentation`**（下称 WVP）—— 内容流程、章节/step 结构、
  动效方法论、主题 token、脚手架、录屏。**本工作流的骨架。**
- **`design-taste-frontend`**（下称 DTF）—— 审美与反 AI 味。**只在
  「造/选主题」和「终审」两处用**，不指导单章代码。

本 Skill 自己负责三件 WVP 没有的事：**论文结构化 digest**、
**论文→章节的固定映射**、**无声字幕层 + 静音录屏**。

> 路径约定：
> `WVP = ~/.config/opencode/skills/web-video-presentation`
> `DTF = ~/.config/opencode/skills/design-taste-frontend`
> `SELF = ~/.config/opencode/skills/paper-explainer`

---

## 前置条件（开工前先查）

1. **Node 运行时**（`node`/`npm`）：WVP 是 Vite + React + TS 项目，没有
   Node 跑不起来。缺就先装 Node LTS。
2. **一个 Chromium/Chrome 浏览器**：录屏用。
3. `ffmpeg`：裁切 / 可选烧字幕。
4. Python（可选）：解析 PDF（`pymupdf` / `pdftotext`）。

缺任何一项先告诉用户并协助安装，不要假装能跑。

---

## 非交互 / 自动验证模式

当没有真人可交互（自动化跑批、subagent 验证、CI）时，**不要停下来等
Checkpoint**，用以下默认值继续，并在最终汇报里列出「我替你做了哪些决定」：

| 交互点 | 默认动作 |
|---|---|
| Checkpoint Plan（主题） | 取推荐第 1 个主题；若已 scaffold，沿用现有主题 |
| 第 1 章验收 | 直接继续后续章节（模式 B · 顺序开发） |
| 开发模式 | B（主线程顺序，不并行） |
| Checkpoint Audio | 跳过（本工作流本就无声） |
| 录屏 | 跳过，只交付可运行项目 + 构建通过 |

**收尾必须**：`npm run build` 通过；用截图（见下）抽查至少 2 章渲染正确。
若装不了浏览器，至少保证 build 通过并在汇报里说明未做视觉验证。

> 有浏览器时可用 Playwright 截图验证：`viewport 1920×1080`，检查
> `.subtitle-text` 存在且文本等于当前 step 的 narration。

---

## 工作流总览

```
Phase 0  论文解析          → paper.md
Phase 1  结构化摘要        → digest.md        （本 Skill 独有，见 references/PAPER-DIGEST.md）
Phase 2  口播稿            → script.md        （遵循 WVP/references/SCRIPT-STYLE.md）
Phase 3  开发计划          → outline.md       （遵循 WVP/references/OUTLINE-FORMAT.md）
   ▼
[Checkpoint Plan]  一次对齐：稿 / outline / 主题 / 素材 / 模式
   ▼
Phase 4  脚手架 + 注入字幕层（本 Skill 独有，见 references/SUBTITLE-AND-RECORDING.md）
Phase 5  逐章实现（遵循 WVP/references/CHAPTER-CRAFT.md；图表按 references/SVG-DIAGRAMS.md）
   ▼
[Checkpoint Audio]  本工作流**跳过音频**，直接静音录屏
   ▼
Phase 6  静音录屏（?auto=1 自动推进 + 字幕）
Phase 7  DTF 反 AI 味终审
```

工作目录（在用户当前目录下创建）：

```
<paper-slug>-video/
├── paper.md            # 原文抽取，不删（画面细节源）
├── digest.md           # 7 维结构化摘要（内容中枢）
├── script.md           # 口播稿 = 字幕文本
├── outline.md          # 章节 + step + 信息池
└── presentation/       # WVP 脚手架 + 字幕层
```

---

## 硬性自检协议

每个产出**写完必须自检 → 修复 → 再推进**。执行方式按能力降级：
**独立 reviewer subagent（最优）→ subagent → 自检（兜底）**。

| 产出 | 自检清单 |
|---|---|
| `digest.md` | `references/PAPER-DIGEST.md` 末尾自检 |
| `script.md` | WVP `references/SCRIPT-STYLE.md` 三层自检 |
| `outline.md` | WVP `references/OUTLINE-FORMAT.md` 自检 |
| 单章 | WVP `references/CHAPTER-CRAFT.md` 完工自检 + 本 Skill `references/SVG-DIAGRAMS.md` 自检 |
| 字幕层 | `references/SUBTITLE-AND-RECORDING.md` 第 6 节 |
| 成片 | DTF §9 AI tells 终审 |

**铁律**：拿到 fail 项**先改完再汇报**，不允许「目测一遍就放行」。

---

## Phase 0 · 论文解析

| 输入 | 做法 |
|---|---|
| PDF | `pdftotext`（poppler）或 `python3 -m pip install pymupdf` 后抽取 → `paper.md`。保留章节标题、图表标题、公式附近文本。 |
| arXiv / 网页链接 | webfetch 取正文 → `paper.md`。若 HTML 版有 arXiv 的 LaTeX 源码更佳。 |
| 粘贴文本 | 直接落盘 `paper.md`。 |

要求：

- `paper.md` **不删**。它是后续「画面细节源」（双源原则里的 article 角色）。
- 抽取后**扫一遍图表标题**，把图号/表号列出来，Phase 1 的图表清单要用。
- 公式若抽取后乱码，标注「公式需回原文核对」，别硬猜。

（可选）若用户想先**读懂**论文再决定做不做视频，可用已安装的
`paper-assist` skill 做深读对话；理解阶段结束后再回到本流程。

---

## Phase 1 · 结构化摘要 digest.md

**读** `references/PAPER-DIGEST.md`，按它的 **7 维 schema** 写
`digest.md`：动机与问题 / 核心思想 / 模型设计 / 模型结构 / 算法流程 /
实验设计 / 实验结果与结论，外加末尾「图表清单」。

关键约束：

- 每个数字 / 结论可回溯到 `paper.md`；**不编造**。
- 作者声称 vs 你的解读分开标注。
- 每维都要有「可上屏」条目，具体到能直接指导画面。
- 论文没涉及的维度写「论文未涉及」，不要用常识填。

写完走 `PAPER-DIGEST.md` 自检，修完再进 Phase 2。

---

## Phase 2 · 口播稿 script.md

**读** `WVP/references/SCRIPT-STYLE.md`，把 digest 转成平台化口播稿。
论文题材的额外要求：

- **术语**首次出现给「中文（English）」，之后只用中文简称。
- **公式**念成人话：先给直觉，再说符号；长公式拆成 2–3 个 step。
- **结果**先给结论再给数字（「比最强 baseline 高 3.2 个点」），不要
  一上来念一长串指标。
- **每句话就是一 step 的字幕**——写的时候就想着它会显示在屏幕底部，
  单句别超过约 40 字，超了就拆 step。
- 保持论文原文语言（中文论文→中文稿；英文论文→默认中文讲解，除非
  用户要求英文）。

写完走 SCRIPT-STYLE 三层自检。

---

## Phase 3 · 开发计划 outline.md

**读** `WVP/references/OUTLINE-FORMAT.md`，按 `PAPER-DIGEST.md` 里的
**章节映射表**切章：

```
01 开场钩子 · 02 动机与不足 · 03 核心思想 · 04 模型设计 · 05 模型结构
06 算法流程 · 07 实验设计 · 08 实验结果 · 09 结论与局限
```

- 每章 30–60s；每步屏幕内容 + 章节首段**信息池**（数字/引用/标签）。
- outline **只写节奏与信息密度，不写动画**（WVP 铁律）。
- 信息池从 `digest.md` + `paper.md` 抽，图表步标注「用 SVG 重绘
  （见 SVG-DIAGRAMS.md）」。

写完走 OUTLINE-FORMAT 自检。

---

## Phase 4 · Checkpoint Plan + 脚手架 + 字幕层

### 4.1 Checkpoint Plan（硬节点，一次对齐 5 件事）

读 `WVP/SKILL.md` 的「Checkpoint Plan」段，按其模板向用户汇报
`script.md` / `outline.md` / 主题 / 素材 / 开发模式。

**主题这一步引入 DTF**（本工作流唯一的主题集成点）：

1. 读 WVP `themes/*/theme.json`，按论文气质（学术/严谨/数据密集）
   先推荐 2–3 套内置主题。
2. 用 DTF 的 **design read + 三档 dial**（`DESIGN_VARIANCE` /
   `MOTION_INTENSITY` / `VISUAL_DENSITY`）判断该主题是否合适；学术讲解
   通常 `DENSITY` 偏高、`MOTION` 中低。
3. 若内置主题都不合，按 WVP `references/THEMES.md` 的「创作新主题」造
   一个，**造主题时的字体/配色决策参考 DTF §4.1 / §4.2**（例如避开
   DTF 点名的 AI 默认紫、避免 Inter 默认、serif 只在确实编辑风时用）。

**素材决策**（论文特有）：

- 架构图 / 流程图 / 结果图表 → **一律 SVG 重绘**，不贴原图、不生成图。
- 封面 / 概念插画 / 氛围图 → 可用 `gpt-image-2`（有图像工具时）。
- 需要真图但拿不到 → 用清晰占位并列入素材清单。

### 4.2 脚手架

```bash
bash "$WVP/scripts/scaffold.sh" ./presentation --theme=<选定主题id>
rm -rf presentation/src/chapters/01-example   # 并清掉 chapters.ts 里的 EXAMPLE_CHAPTER
```

> 删掉示例章 = 结构变更，**顺手 bump** `useStepper.ts` 的 `STORAGE_KEY`
> （如 `v4`→`v5`），否则旧的持久化游标可能落在已不存在的 step 上。

### 4.3 注入字幕层

```bash
bash "$SELF/scripts/install-subtitle.sh" ./presentation
```

然后按 `references/SUBTITLE-AND-RECORDING.md` 第 2 节改 `App.tsx`
（4 处最小改动）。改完 `npm run dev` 验证字幕条出现、`S` 键可开关。

### 4.4 第 1 章（主线程 + 强制验收）

按 `WVP/references/CHAPTER-CRAFT.md` 做第 1 章（通常是「开场钩子」），
做完**停下等用户验收**（视觉 / 节奏 / 字幕 / 反 AI 味），OK 再按选定
模式做其余章节。

---

## Phase 5 · 逐章实现

每章**必读** `WVP/references/CHAPTER-CRAFT.md`（单一入口），并遵守：

- 每章必须有视觉演示，禁纯文字。
- 清单/列表 1 项 = 1 step，禁一次全展示。
- 图表按 `references/SVG-DIAGRAMS.md`：架构图逐模块点亮、流程图逐节点
  点亮、结果图逐柱/逐线揭示，颜色全走 token，揭示由 `step` 驱动。
- 双源原则：节奏跟 `script.md`，画面细节回 `digest.md` / `paper.md`。
- 每章独立 CSS 前缀，不改 `chapters.ts` 结构（除非按 WVP 规则同步）。
- 改章节结构或 `narrations.ts` 长度后，bump `useStepper.ts` 的
  `STORAGE_KEY`。

并行模式（WVP 模式 C）可用 subagent；subagent prompt 需附：本章 outline
段 + CHAPTER-CRAFT 路径 + 主题气质 + 第 1 章代码作风格参考 +
**SVG-DIAGRAMS 路径**（图表章尤其）+ 硬规则（独立 CSS 前缀、
`npx tsc --noEmit`）。

每章完工走 CHAPTER-CRAFT + SVG-DIAGRAMS 自检。

---

## Phase 6 · 静音录屏

**跳过 WVP 的 Checkpoint Audio 与 Phase 3（音频合成）**。

按 `references/SUBTITLE-AND-RECORDING.md` 第 4 节：

1. `?auto=1&reset=1` → `SPACE` 启动 → 无音频时按字数估时自动推进
   （`reset=1` 保证从第 1 页开始，不受上次游标影响）；
2. 字幕随 step 显示，全程免点击；
3. 录屏 → ffmpeg 裁头尾。

若节奏不对：改 `estimateMs` 的字数系数（`App.tsx`），或拆 step / 改稿，
**不要**加 hold 旋钮。

---

## Phase 7 · DTF 反 AI 味终审

成片前用 `DTF` 做一次终审（**只取适用条款**）：

**适用**（拿来审）：

- §9 AI tells：紫粉渐变、彩色圆角边框、假插画、emoji、纯黑等；
- §4.1 字体纪律：有没有无理由的 serif、混排字号问题；
- §4.2 配色校准：单一强调色、饱和度、配色家族是否重复。

**不适用**（明确忽略，固定 16:9 舞台不是响应式落地页）：

- §4.7 的 hero/nav/CTA 规则、§3.E 响应式与 `dvh`、§4.5 的 CTA/表单、
  §6.C 深色模式、§8 明暗双模式。

发现 AI 味 → 改主题 token 或该章视觉，改完复验。

---

## 与两个依赖 Skill 的边界（重要）

| 事项 | 归谁 |
|---|---|
| 内容流程 / 章节 / step / 动效方法论 / 脚手架 / 录屏 | **WVP** |
| 论文 digest / 章节映射 / 字幕层 / 静音路径 | **本 Skill** |
| 主题的字体与配色审美、反 AI 味终审 | **DTF（仅这两处）** |
| 单章代码怎么写 | **WVP 的 CHAPTER-CRAFT**（DTF 不参与） |

**冲突时以 WVP 为准**（它是本工作流的结构骨架）；DTF 只做「顾问」，
不覆盖 WVP 的流程与舞台规则。

---

## 相关资源

| 文件 | 何时读 |
|---|---|
| `references/PAPER-DIGEST.md` | Phase 1 必读；Phase 3 取章节映射 |
| `references/SUBTITLE-AND-RECORDING.md` | Phase 4.3 注入字幕、Phase 6 录屏 |
| `references/SVG-DIAGRAMS.md` | Phase 5 画架构/流程/结果图时 |
| `WVP/SKILL.md` | 全流程；Checkpoint Plan 模板 |
| `WVP/references/SCRIPT-STYLE.md` | Phase 2 |
| `WVP/references/OUTLINE-FORMAT.md` | Phase 3 |
| `WVP/references/CHAPTER-CRAFT.md` | Phase 5 每章单一必读 |
| `WVP/references/THEMES.md` | Phase 4 造/选主题 |
| `WVP/references/RECORDING.md` | Phase 6 录屏工具细节 |
| `DTF/SKILL.md` | Phase 4 主题审美、Phase 7 终审 |
| `scripts/install-subtitle.sh` | Phase 4.3 跑一次 |
