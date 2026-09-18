---
name: paper-explainer
license: MIT
description: 把一篇学术论文（PDF / arXiv 链接 / 网页 / 粘贴文本）做成**带全局字幕**的网页讲解演示。用法极简：调用 skill + 论文链接，主题默认固定（跨任务深浅统一），语言 / 篇幅 / 封面 / 录屏全部按配置自动决策，中途不向用户确认。字幕是核心特征：口播稿逐 step 显示在屏幕底部，与画面同源、可开关、可导出 SRT。流程：解析论文（arXiv 优先取 LaTeX 源码）→ 结构化 digest（贡献与创新优先，技术含量高的部分自动加篇幅）→ 口播稿 script → 章节 outline → 套用 web-video-presentation 脚手架 + 字幕层 → 逐章实现 → DTF 终审 →（可选）录屏；录屏是整条流水线的**最后一步**，等终审与全部修改定稿后只录一次，避免反复渲染；架构图 / 流程图优先 SVG 重绘并逐步揭示，允许嵌入论文原图 / 公式 / 原文。录屏默认关闭，仅用户明确要求或配置 `recording.enabled=true` 时出片。首次运行自动写默认配置、缺失依赖自动安装；产物按可扩展性铁律组织，交付后可按反馈最小改动迭代（Phase 8）。触发场景：论文讲解视频、paper explainer video、把论文做成视频、论文精读/拆解视频、论文总结 + 可视化讲解、paper to video、学术论文讲解稿 + 视频、论文网页讲解。
---

# Paper Explainer

把一篇论文变成一份**带全局字幕、网页实现**的讲解演示。字幕是核心特征：
口播稿的每一句都逐 step 显示在屏幕底部，与画面同源、可开关
（`S` / `?subs=0`）、可导出 SRT。**录屏是可选出口、且是最后一步**：默认
不录屏，交付可运行、可交互的网页项目；仅用户明确提出「录屏 / 要视频文件」
或配置 `recording.enabled=true` 时才走 Phase 7 出片——且等 DTF 终审与全部
修改定稿后**只录一次**，不在修改过程中反复渲染。

本 Skill 是**编排层**，串起两个已安装的 skill：

- **`web-video-presentation`**（WVP）—— 内容流程、章节 / step 结构、
  动效方法论、主题 token、脚手架、录屏工具。**本工作流的骨架。**
- **`design-taste-frontend`**（DTF）—— 审美与反 AI 味。**只在「造 / 选
  主题」和「终审」两处用**，不指导单章代码。

本 Skill 自己负责 WVP 没有的部分：**论文结构化 digest**、**论文→章节
映射（按贡献权重）**、**论文素材提取（原图 / 公式 / 原文 + arXiv LaTeX
源）**、**全局字幕层（核心特征）**、**录屏（可选 · 最后一步）**、
**一次性初始化**（首次自动写默认配置；依赖缺失自动安装）。

> 路径约定：
> `WVP = ~/.config/opencode/skills/web-video-presentation`
> `DTF = ~/.config/opencode/skills/design-taste-frontend`
> `SELF = ~/.config/opencode/skills/paper-explainer`
> `CONFIG = ~/.config/paper-explainer/config.json`（`PAPER_EXPLAINER_CONFIG` 可覆盖）

## 设计原则

- **一步到位**：整条流水线自动跑完，**中途不向用户确认任何事**（WVP 的
  Checkpoint 在本工作流全部移除）；所有自主决定在最终汇报里列明。
- **贡献优先**：全片围绕论文的**主要贡献与创新点**组织；技术含量越高的
  部分自动获得越多 step / 时长 / 讲解层次（权重见 `PAPER-DIGEST.md`）。
- **素材求真**：允许并鼓励直接使用论文素材——原图 / 公式 / 原文摘录，
  与 SVG 重绘混用（决策见 `PAPER-ASSETS.md` §0）。
- **可扩展 · 可快改**：生成即按铁律组织产物，交付后按最小改动面响应
  反馈（`REVISION.md`）。
- **录屏最后做**：默认只交付可运行网页项目；触发条件见 Phase 7。录屏排在
  DTF 终审与所有修改之后，全片只录一次——内容没定稿不录，避免反复渲染。

## 核心约定

### 输入与用法：skill + 论文链接，别的什么都不用输入

```
paper-explainer https://arxiv.org/abs/1706.03762
把 https://arxiv.org/pdf/1706.03762 做成讲解视频，要 mp4
```

论文链接是唯一必需输入：arXiv `abs` / `pdf`、DOI、任意 PDF / 网页 URL、
本地 PDF 路径、直接粘贴的论文文本都算。

**拿到输入后不确认、不提问**——主题、语言、时长、篇幅、封面、开发模式、
输出目录全部自动决策，只在最终汇报里列明「我替你做了哪些决定」。
**唯一允许的提问**：完全没给论文（无链接、无文件、无文本）时，只问一次
「论文链接或文件？」，拿到后立刻开工。交付汇报末尾附一句：想改哪里直接说
（Phase 8）。

### 自动决策表

| 决策点 | 自动动作 |
|---|---|
| 初始化配置 | 有则直接用；无则写推荐默认值（不问卷、不确认）——见 `INIT.md` |
| 依赖 skill / 系统工具 | 缺失自动安装；失败按 `INIT.md` §2.3 降级（录屏工具仅在要求录屏时装） |
| 主题 | 按配置（默认 `fixed` + `midnight-press`，**跨任务统一深浅**）；`auto`（显式配置）才按论文气质挑并**汇报理由**；`ask` 按 `auto`；避开手写 / 花体气质主题 |
| 封面素材 | 按配置；`ask` 按 `svg`；`generate` 缺 gpt-image-2 → 回退 `svg` |
| 论文图 / 公式 / 原文 | 按 `PAPER-ASSETS.md` §0 自动决策（重绘 or 原图） |
| 开发模式 | 按配置；`A`（逐章确认）→ 按 `B`（顺序）执行 |
| 第 1 章 | **不验收**；作为风格锚点做完直接继续 |
| 音频 | 不合成配音，跳过；字幕承载全部口播文本 |
| 录屏 | **默认不录屏**；仅用户明确提出或 `recording.enabled=true` 时执行 Phase 7（整条流水线最后一步，等全部修改定稿后一次录完） |
| 后台进程 | 交付前全部停止并复查残留（见「进程卫生」） |

原则：**先做完，再汇报**；拿不准时选保守默认，并在最终汇报里列出
「我替你做了哪些决定」。

> **边界**：以上只约束**首次生成**。交付后用户主动提出的展开 / 修改走
> **Phase 8**——允许先定位、必要时最多问一个澄清问题，然后按最小改动面
> 直接改，不再「闷头做完」。

## 跨阶段铁律（生成与修改都必须遵守）

### 1. 可扩展性铁律（生成前先读 `REVISION.md` Part A）

真相源链固定且不绕过（`paper.md → digest.md → script.md → outline.md →
narrations.ts → 章节 tsx → chapters.ts`）；章节独立、生成后不改名；
step 数唯一来源是 `narrations.ts`；视觉数据驱动（数组 + `step` 映射）；
三份定位表互为索引（outline / script / digest）；素材可复现，修改追加
`revisions.md`。

### 2. 字体可读性铁律（学术页英文禁花体）

- 英文一律用可读字体，禁 `cursive` / 手写 / 装饰字体（Patrick Hand、
  Caveat、Dancing Script、Pacifico 等）；用 Inter / IBM Plex / Source 系
  等无衬线或正文衬线；中文字体不受限。
- **公式例外（必须保留）**：KaTeX 数学字体（含 `\mathcal` / `\mathscr` /
  `\mathfrak` 等花体字形）是数学排版的一部分，不适用本禁令。公式 CSS 只调
  `color` / `font-size`，**不要给 `.katex` 及其子元素设 `font-family`**
  （细则见 `PAPER-ASSETS.md` §3）。
- 选主题时避开手写 / 花体气质主题；脚手架后检查项目
  `presentation/src/styles/tokens.css`，命中花体栈（含 `--font-display-cn`）
  就在**项目文件里**替换为可读字体栈（`fixed` 主题同样执行；不改 WVP 源
  主题目录）。字幕继承 `--font-body`，尤其要保证可读。
- 自检：`grep -rn "cursive" presentation/src` 必须为空（`KaTeX_*` 数学
  字体名除外）；判断标准是画面压缩 / 缩放后仍能一眼认清每个字母，拿不准
  就当花体处理。

### 3. 进程卫生（交付即清理，零遗留）

**任何由本次运行启动的后台进程，都不许活过本次运行。** 每次收尾（含
Phase 7 录屏 / Phase 8 重录）必须先清理再汇报——不把 dev server、浏览器、
录屏工具、ffmpeg、临时 HTTP 留在后台「方便用户看」。启动即登记：

```bash
mkdir -p .pe-run
npm run dev -- --port 5173 --strictPort >.pe-run/dev.log 2>&1 &
echo $! > .pe-run/dev.pid
```

交付前清理（用脚本，不裸 `kill`；完整用法见脚本头部）：

```bash
bash "$SELF/scripts/stop-processes.sh" --pidfile .pe-run/dev.pid --port 5173
rm -rf .pe-run
```

- 脚本按进程树（含进程组）TERM → 等待 → KILL；端口默认**只复查、不杀**
  （避免误杀别的项目），有残留时 exit 1。确需清掉本项目的孤儿监听进程：
  `--kill-port <port> --match "<项目绝对路径>"`。
- 浏览器 / 录屏工具 / ffmpeg 若由本流程启动，启动时同样记 PID，收尾用
  `--pid <pid>` 一并停掉。
- **禁止** `nohup` / `disown` 后不管；想给用户预览，就在汇报里给命令
  （`cd presentation && npm run dev`），由用户自己启动。
- 自检（汇报前必做）：脚本 exit 0；`ps` 里没有本次启动的 node / vite /
  chromium / ffmpeg；占用过的端口已释放。汇报里写一行：
  `进程 已清理（dev server / 浏览器 / ffmpeg）`。
- 该规则贯穿所有 Phase（4.3 验证、5 预览、7 录屏、8 重录），一次都不例外。

## 工作流总览

```
Phase -1 初始化            → 读配置（无则自动写默认）；依赖自动补齐
Phase 0  论文解析 + 素材提取 → paper.md / paper-src/（arXiv LaTeX 源）/ assets/
Phase 1  结构化摘要        → digest.md（类型 + 贡献 + 前置概念 + 7 维）
Phase 2  口播稿            → script.md（贡献与创新重点展开）
Phase 3  开发计划          → outline.md（按技术含量分配篇幅）
   ▼（无 Checkpoint，直接推进）
Phase 4  脚手架 + 字幕层 + 素材接入
Phase 5  逐章实现（技术核心章节自动加篇幅）
   ▼（不合成配音，跳过音频）
Phase 6  DTF 反 AI 味终审
   ▼（内容定稿后）
Phase 7  录屏（可选 · 仅用户明确要求时；**最后一步**，全片只录一次）
Phase 8  反馈迭代（按需，用户发起）→ 定位 → 最小改动 → 同步真相源
         → 改完验证（不录屏）→ 本轮全部改完后按需整片录一次（Phase 7）
```

工作目录（在用户当前目录下创建）：

```
<paper-slug>-video/
├── paper.md            # 原文抽取，不删（画面细节源）
├── paper-src/          # arXiv LaTeX 源码（有则存，素材第一来源）
├── assets/             # 取出的原图 / 公式 / 原文摘录（进网页的素材）
├── digest.md           # 类型 + 贡献 + 前置概念 + 7 维（内容中枢）
├── script.md           # 口播稿 = 字幕文本（`---` 块 = step）
├── outline.md          # 章节 + step + 信息池（修改时的定位表）
├── revisions.md        # Phase 8 改动记录（追加式；改前先读）
└── presentation/       # WVP 脚手架 + 字幕层
```

## 硬性自检协议

每个产出**写完必须自检 → 修复 → 再推进**。执行方式按能力降级：
**独立 reviewer subagent（最优）→ subagent → 自检（兜底）**。

| 产出 | 自检清单 |
|---|---|
| `digest.md` | `PAPER-DIGEST.md` 末尾自检（含贡献权重） |
| `script.md` | WVP `SCRIPT-STYLE.md` 三层自检 |
| `outline.md` | WVP `OUTLINE-FORMAT.md` 自检 |
| 素材 | `PAPER-ASSETS.md` §7 |
| 单章 | WVP `CHAPTER-CRAFT.md` 完工自检 + `SVG-DIAGRAMS.md` §5 |
| 字幕层 | `SUBTITLE-AND-RECORDING.md` §6（录屏项仅在录屏时执行，且必须在 DTF 终审与修改定稿后） |
| 交付终审（网页项目） | DTF §9 AI tells 终审（无论是否录屏都要做） |
| 全片字体 | `grep -rn "cursive" presentation/src` 为空，无花体 / 手写字体名（`KaTeX_*` 除外） |
| 交付前（全部 Phase 完成后） | 「进程卫生」自检：`stop-processes.sh` exit 0、无本次启动的后台进程、端口已释放 |
| 修改（Phase 8） | `REVISION.md` B4 自检 |

**铁律**：拿到 fail 项**先改完再汇报**，不允许「目测一遍就放行」。

## Phase -1 · 初始化（自动，几秒钟）

**每次运行开头**先做这两件事：

```bash
bash "$SELF/scripts/init-config.sh" --ensure   # 读配置（无则写默认；旧配置自动补齐/迁移）
bash "$SELF/scripts/check-deps.sh"             # 依赖自检
```

- **有配置** → 直接应用（网页主题 / 开发模式 / 封面素材 / 讲解语言 /
  录屏开关与自动推进），一行汇报「已加载配置：…」后继续。`--ensure` 会
  自动补齐缺失字段，并把旧默认的 `auto` 主题迁移为固定的
  `midnight-press`（保证跨任务深浅一致；显式配置的 `auto` / 其他主题不动）。
  各配置项在哪个 Phase 生效见 `INIT.md` §3。
- **无配置** → **不提问**：直接写入推荐默认值（`theme=fixed:midnight-press` /
  `devMode=B` / `cover=svg` / `lang=auto` / `record=false` /
  `autoAdvance=true`）并继续。用户想自定义 → 预先写 `CONFIG`，或事后说
  「重配 paper-explainer」。
- **依赖 skill 缺失**（WVP / DTF）→ **直接自动安装**：
  `bash "$SELF/scripts/install-deps.sh"`；装完提醒用户**重启 opencode**
  才会加载；装不上按 `INIT.md` §2.3 降级（缺 WVP 不能开工；缺 DTF 可降级
  并注明）。
- **系统工具缺失** → 按 `INIT.md` §2.1 自动安装 / 降级（缺了先装，不要
  假装能跑；录屏工具默认不装；Node 缺失必须停下说明）。

> **完整规格**（字段表 / 运行时工具 / 自动安装 / 降级 / 重配）见
> [`references/INIT.md`](references/INIT.md)。开工前先读它。

## Phase 0 · 论文解析 + 素材提取

| 输入 | 做法 |
|---|---|
| arXiv 链接 / ID | **先取 LaTeX 源码**：`bash "$SELF/scripts/fetch-arxiv.sh" <url-or-id> ./paper-src`。正文公式、图注、原文从 `.tex` 直接取（最准）；图从源码 `figures/` 取（见 `PAPER-ASSETS.md` §1）。无源码（老论文）→ 回退 HTML / PDF。 |
| PDF | `pdftotext -layout`（poppler）或 `python3 -m pip install pymupdf` 后抽取 → `paper.md`；原图 / 公式按 `PAPER-ASSETS.md` §2–§3 抽取。保留章节标题、图表标题、公式附近文本。 |
| 网页链接 | webfetch 取正文 → `paper.md`。若页面提供 arXiv LaTeX 源码，走第一行。 |
| 粘贴文本 | 直接落盘 `paper.md`。 |

要求：

- `paper.md` **不删**。它是后续「画面细节源」（双源原则里的 article 角色）。
- 抽取后**扫一遍图表标题**，把图号 / 表号列出来，Phase 1 的素材清单要用。
- **素材落盘**：按 `PAPER-ASSETS.md` 建 `assets/`，把要进网页的原图 /
  公式 / 原文摘录取出来并命名（`fig1.png` / `eq3.tex` / `quote1.md`），
  在 digest 的「图表 / 素材清单」登记。
- 公式抽取乱码时**不要硬猜**：优先回 arXiv LaTeX 源；没有源码再按
  `PAPER-ASSETS.md` §3 从 PDF 取原图。

（可选）若用户想先**读懂**论文再决定做不做视频，可用已安装的
`paper-assist` skill 做深读对话；理解阶段结束后再回到本流程。

## Phase 1 · 结构化摘要 digest.md

**读** `references/PAPER-DIGEST.md`，按它的 schema 与铁律写 `digest.md`：

1. **论文类型（type）**：先判 `AI_method` / `benchmark` / `clinical` /
   `社科人文` / `综述`，7 维按该类型的语义填。
2. **主要贡献与创新点（第 0 节，第一屏）**：1–3 条，逐条给出论文依据
   （abstract / intro 贡献列表 / method / conclusion）与**技术含量分级**
   （高 / 中 / 低 + 理由）——它决定全片的篇幅分配。
3. **前置概念 / 依赖（第 0.5 节）**：1–5 条「不解释就看不懂主线」的观众
   先修概念 / 前作，每条带原文定义与讲解策略（独立 step / 一句带过 /
   不展开）。
4. **7 个维度**：动机与问题 / 核心思想 / 模型设计 / 模型结构 / 算法流程 /
   实验设计 / 实验结果与结论。
5. **图表 / 素材清单**：每张关键图、表、公式、原句登记素材策略
   （`SVG 重绘` / `原图嵌入` / `KaTeX 公式` / `原文引用`）+ 来源。

关键约束：每个数字 / 结论可回溯到 `paper.md` 或 LaTeX 源，**不编造**；
作者声称 vs 你的解读分开标注；论文没涉及的维度写「论文未涉及」；每维都要
有具体到能直接指导画面的「可上屏」条目。

写完走 `PAPER-DIGEST.md` 自检，修完再进 Phase 2。

## Phase 2 · 口播稿 script.md

**读** `WVP/references/SCRIPT-STYLE.md`，把 digest 转成平台化口播稿。
论文题材的额外要求：

- **贡献优先**：开场钩子直接指向核心创新；动机 / 背景压缩到「讲清 gap」
  即可；核心创新（新模块 / 新目标函数 / 新训练策略 / 新发现）用多个 step
  拆开讲——直觉 → 形式化 → 与已有方法对照 → 效果。篇幅按 digest 的
  **技术含量权重**分配（高权重贡献多拿 step，背景性内容 1–2 step 带过）。
- **术语**首次出现给「中文（English）」，之后只用中文简称；digest 第 0.5 节
  标「独立 step」的前置概念按「是什么 → 为什么出现 → 在本论文中的角色」
  展开 1–2 个 step。
- **公式**念成人话：先给直觉，再说符号；长公式拆成 2–3 个 step。
- **结果**先给结论再给数字（「比最强 baseline 高 3.2 个点」），不要一上来
  念一长串指标。
- **每句话就是一 step 的字幕**——写的时候就想着它会显示在屏幕底部，单句
  别超过约 40 字，超了就拆 step。
- **节拍即修改单位**：`---` 分隔块 = outline 的 step = `narrations.ts` 的
  一项，三处顺序严格一致——Phase 8 的展开 / 压缩都按节拍操作。
- **原文引用**：关键定义 / 作者原话可直接引用 `paper.md` / LaTeX 源
  （短句，注明出处），字幕里用引号标出。
- 语言按配置 `narration.language`：`auto` = 中文论文→中文稿、英文论文→
  默认中文讲解；`zh` / `en` 强制。

写完走 SCRIPT-STYLE 三层自检。

## Phase 3 · 开发计划 outline.md

**读** `WVP/references/OUTLINE-FORMAT.md`，按 `PAPER-DIGEST.md` 里的
**章节映射表**切章（默认 9 章：开场钩子 / 动机与不足 / 核心思想 / 模型设计 /
模型结构 / 算法流程 / 实验设计 / 实验结果 / 结论与局限）：

- **按技术含量分配篇幅**：各章 step 预算、核心创新章节的占比下限、类型
  微调，全按映射表的权重规则执行；背景章压到下限。
- 每章 30–60s；每步屏幕内容 + 章节首段**信息池**（数字 / 引用 / 标签），
  从 `digest.md` + `paper.md` 抽。
- **每步标注素材策略**：`SVG 重绘` / `原图 Fig.X` / `公式 eq.N` /
  `原文引用`（素材已由 Phase 0 落盘）。
- outline **只写节奏与信息密度，不写动画**（WVP 铁律）。
- **outline 同时是修改定位表**：每章 id / step 行 / 总步数保持可对照；
  实现时 step 数变了回写这里；Phase 8 收到反馈先在这里定位。

写完走 OUTLINE-FORMAT 自检。

## Phase 4 · 脚手架 + 字幕层 + 素材接入

### 4.1 自动决策（直接执行）

- **主题**（`theme.mode`）：`fixed`（默认）→ 用 `theme.id`（默认
  `midnight-press`）；先确认 `WVP/themes/<id>/` 存在，否则警告并回退
  `auto`。`auto` / `ask`（需显式配置）→ 按论文气质读
  `themes/*/theme.json`（`bestFor` / `descriptionZh`）挑最匹配的一套，
  **汇报你选了什么、为什么**；跳过手写 / 花体气质主题。
- **封面素材**（`materials.cover`）：`svg` 自绘；`generate` 用
  `gpt-image-2`（未安装则回退 `svg` 并说明）；`placeholder` 占位；
  `ask` → 按 `svg` 处理。
- **开发模式**（`devMode`）：A / B / C 直接执行；`A` 按 `B` 处理（本工作流
  不逐章确认）。

**主题这一步仍引入 DTF**：用 DTF 的 **design read + 三档 dial**
（`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`）判断主题是否
合适（学术讲解通常 `DENSITY` 偏高、`MOTION` 中低）；若需造新主题，按 WVP
`references/THEMES.md` 的「创作新主题」流程，字体 / 配色决策参考 DTF
§4.1 / §4.2（避开 AI 默认紫、避免 Inter 默认、serif 只在确实编辑风时用）。

### 4.2 脚手架

```bash
bash "$WVP/scripts/scaffold.sh" ./presentation --theme=<选定主题id>
rm -rf presentation/src/chapters/01-example   # 并清掉 chapters.ts 里的 EXAMPLE_CHAPTER
```

- 删掉示例章 = 结构变更，**顺手 bump** `useStepper.ts` 的 `STORAGE_KEY`
  （如 `v4`→`v5`），否则旧的持久化游标可能落在已不存在的 step 上。
- 脚手架后立即执行「字体可读性铁律」的兜底检查：`src/styles/tokens.css`
  命中花体 / `cursive` → 在项目里替换为可读字体栈。

### 4.3 注入全局字幕层（核心特征，必做）

```bash
bash "$SELF/scripts/install-subtitle.sh" ./presentation
```

然后按 `references/SUBTITLE-AND-RECORDING.md` §2 修改 `App.tsx` 和
`src/hooks/useStepper.ts`，接入字幕与自动播放。改完 `npm run dev` 验证
字幕条出现、`S` 键可开关，**验证完立即停掉 dev server**（见「进程卫生」）。

### 4.4 素材接入

把 `assets/` 里要用的文件复制进 `presentation/public/assets/`；公式按
`PAPER-ASSETS.md` §3 装 KaTeX 或走图片；原图按「纸面卡片」适配暗色主题。
路径与命名规范见 `PAPER-ASSETS.md` §5。

### 4.5 第 1 章（不验收，作为风格锚点）

按 `WVP/references/CHAPTER-CRAFT.md` 做第 1 章（通常是「开场钩子」），做完
**直接继续**后续章节——本工作流不设验收停顿。第 1 章的代码是后续章节的
风格参考。

## Phase 5 · 逐章实现

每章**必读** `WVP/references/CHAPTER-CRAFT.md`（单一入口），并遵守：

- 每章必须有视觉演示，禁纯文字；清单 / 列表 1 项 = 1 step，禁一次全展示。
- 图表按 `SVG-DIAGRAMS.md`（SVG 重绘）与 `PAPER-ASSETS.md`（原图 / 公式 /
  原文）：架构图逐模块点亮、流程图逐节点点亮、结果图逐柱 / 逐线揭示；
  **原图同样由 `step` 驱动**（高亮框 / 局部放大 / 逐块揭示），颜色全走
  token。
- **技术核心章节加码**：按 digest 的贡献权重，给核心创新更多 step 与更细
  的讲解层次（直觉 → 公式 → 对照 → 结果）；背景章克制。
- 双源原则：节奏跟 `script.md`，画面细节回 `digest.md` / `paper.md`。
- **可扩展**：视觉数据驱动（数组 + `step` 映射），步数取自
  `narrations.length`；插入 / 删除 step 只动数组与 narrations，不重写整章
  （规格见 `REVISION.md` Part A）。
- 每章独立 CSS 前缀，不改 `chapters.ts` 结构（除非按 WVP 规则同步）；改章节
  结构或 `narrations.ts` 长度后 bump `STORAGE_KEY`。
- 英文标注 / SVG 文字一律可读字体（「字体可读性铁律」；公式字体例外）。

并行模式（`devMode=C`，WVP 模式 C）可用 subagent；subagent prompt 需附：
本章 outline 段 + CHAPTER-CRAFT 路径 + 主题气质 + 第 1 章代码作风格参考 +
**SVG-DIAGRAMS / PAPER-ASSETS 路径**（图表章尤其）+ 硬规则（独立 CSS 前缀、
`npx tsc --noEmit`）。

每章完工走 CHAPTER-CRAFT + SVG-DIAGRAMS + PAPER-ASSETS 自检。

## Phase 6 · DTF 反 AI 味终审

交付前用 DTF 做一次终审（**只取适用条款**；无论是否录屏都要做，且**必须
排在录屏之前**——终审发现的修改如果发生在录屏之后，就得多录一遍）：

**适用**（拿来审）：

- §9 AI tells：紫粉渐变、彩色圆角边框、假插画、emoji、纯黑等；
- §4.1 字体纪律：有没有无理由的 serif、混排字号问题；英文有没有花体 /
  手写 / `cursive` 残留（自检命令见「字体可读性铁律」）；
- §4.2 配色校准：单一强调色、饱和度、配色家族是否重复。

**不适用**（明确忽略，固定 16:9 舞台不是响应式落地页）：§4.7 的
hero/nav/CTA 规则、§3.E 响应式与 `dvh`、§4.5 的 CTA/表单、§6.C 深色模式、
§8 明暗双模式。

发现 AI 味 → 改主题 token 或该章视觉，改完复验。

> 若 DTF 未安装且自动安装失败（`INIT.md` §2.3 降级）：改用 WVP
> `references/CHAPTER-CRAFT.md` 的 ANTI-AI 清单做终审，并在汇报里注明
> 「本次无 DTF 终审」。

## Phase 7 · 录屏（可选 · 默认跳过 · 整条流水线的最后一步）

录屏放在 DTF 终审之后、所有内容与修改定稿之后，**全片只录一次**。内容
还在改（含 Phase 8 迭代）时不要录屏——每改一次就渲染一遍视频会非常慢。

**触发条件（满足其一才执行本节）**：用户**明确提出**要视频产出（如
「录成视频」「帮我录屏」「做成视频」「要 mp4 / 成片」），或配置
`recording.enabled=true`。只给论文链接 / 只说「讲解一下」**不算**——按默认
不录屏处理，并在汇报里提示「要出片说一声」。

**不满足 → 整节跳过**：不装录屏工具、不录屏，交付可运行网页项目
（`npm run build` + `npx tsc --noEmit` 通过、进程已清理），汇报里说明
「默认未录屏；要出片说一声」。**不要**因为「来都来了」顺手录一版。

触发时按 `references/SUBTITLE-AND-RECORDING.md` §4 执行：跳过 WVP 的
音频合成（字幕就是全部口播文本）；走法由配置 `recording.autoAdvance`
决定（默认 `?auto=1&reset=1` → `SPACE` 启动 → 按字幕字数估时自动推进、
全程免点击；或手动推进）；录屏 → ffmpeg 裁头尾。若节奏不对：改
`estimateMs` 的字数系数（`App.tsx`），或拆 step / 改稿，**不要**加 hold
旋钮。结束后按「进程卫生」清理。

## Phase 8 · 反馈迭代（按需，用户发起）

首次交付后，产物进入「可快速修改」状态。**首次汇报里主动告诉用户**：
想改哪里直接说（例：「展开讲 06 算法流程」「把结果图的数字核对一下」），
不需要重跑全流程。收到反馈时：

1. **定位**：把反馈映射到章节 id + step 区间 + 改动层（文案 / 内容 /
   结构 / 视觉 / 素材 / 主题）。先翻 `outline.md`（step→画面），再翻
   `revisions.md`（改过什么）；反馈模糊时先给出定位判断，必要时最多问
   一个澄清问题。
2. **最小改动面**：按 `REVISION.md` Part B 的类型表动手——**先改上游
   真相源，再改下游**；`script.md` 与 `narrations.ts` 必须同改。
3. **收尾**：`npx tsc --noEmit` + `REVISION.md` B4 自检 → 预览验证
   （`?auto=1&reset=1` 全片过一遍）。**修改期间一律不录屏**：若本项目录过
   屏或用户要求出片，等本轮反馈全部改完、用户不再提新改动后，才按 Phase 7
   整片录一次（字幕驱动自动推进，无接缝）→ 按「进程卫生」清理后台进程并
   复查 → `revisions.md` 追加记录 → 按 B6 模板汇报。

**不重跑 Phase 0–6**；只有换论文（回 Phase 0）或换主题（回 Phase 4.1）
才回到对应阶段（Phase 7 录屏按需在最后统一执行）。完整协议（四步定位 /
改动类型表 / 展开一节的步骤 / 录屏策略）见
[`references/REVISION.md`](references/REVISION.md)。

## 与两个依赖 Skill 的边界（重要）

| 事项 | 归谁 |
|---|---|
| 内容流程 / 章节 / step / 动效方法论 / 脚手架 / 录屏工具（可选） | **WVP** |
| 论文 digest / 章节映射 / 素材提取（原图/公式/原文/LaTeX 源）/ 全局字幕层（核心特征）/ 无配音自动推进路径 | **本 Skill** |
| 主题的字体与配色审美、反 AI 味终审 | **DTF（仅这两处）** |
| 单章代码怎么写 | **WVP 的 CHAPTER-CRAFT**（DTF 不参与） |

**冲突时以 WVP 为准**（它是本工作流的结构骨架）；DTF 只做「顾问」，
不覆盖 WVP 的流程与舞台规则。

## 相关资源

**本 Skill**

| 文件 | 何时读 |
|---|---|
| `references/INIT.md` | **Phase -1 开工前必读**：初始化 / 配置字段 / 运行时工具 / 依赖安装与降级 |
| `references/PAPER-DIGEST.md` | Phase 1 必读；Phase 3 取章节映射与权重 |
| `references/PAPER-ASSETS.md` | Phase 0 素材提取 + Phase 4.4 接入 + Phase 5 用原图 / 公式 / 原文时 |
| `references/SUBTITLE-AND-RECORDING.md` | Phase 4.3 注入字幕；Phase 7 录屏（可选 · 最后一步） |
| `references/REVISION.md` | **生成前读 Part A**（可扩展性）；Phase 8 读 Part B（修改协议） |
| `references/SVG-DIAGRAMS.md` | Phase 5 画架构 / 流程 / 结果图时 |
| `scripts/init-config.sh` | 首次运行写默认配置；之后 `--show` 读配置 |
| `scripts/check-deps.sh` | 每次开工前依赖自检 |
| `scripts/install-deps.sh` | 自动安装缺失的 WVP / DTF |
| `scripts/fetch-arxiv.sh` | Phase 0 下载并解压 arXiv LaTeX 源码 |
| `scripts/install-subtitle.sh` | Phase 4.3 跑一次 |
| `scripts/stop-processes.sh` | 启动过后台服务后、交付前清理（「进程卫生」） |

**依赖 Skill**

| 文件 | 何时读 |
|---|---|
| `WVP/SKILL.md` | 全流程；Checkpoint 模板（本工作流已移除，仅作参考） |
| `WVP/references/SCRIPT-STYLE.md` | Phase 2 |
| `WVP/references/OUTLINE-FORMAT.md` | Phase 3 |
| `WVP/references/CHAPTER-CRAFT.md` | Phase 5 每章单一必读 |
| `WVP/references/THEMES.md` | Phase 4 造 / 选主题 |
| `WVP/references/RECORDING.md` | Phase 7（可选 · 最后一步）录屏工具细节 |
| `DTF/SKILL.md` | Phase 4 主题审美、Phase 6 终审 |
