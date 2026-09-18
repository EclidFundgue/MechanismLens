---
name: paper-explainer
license: MIT
description: 把一篇学术论文（PDF / arXiv 链接 / 网页 / 粘贴文本）做成**带全局字幕**的网页讲解视频。**用法极简：调用 skill + 论文链接，其他什么都不用输入**（主题 / 语言 / 篇幅 / 封面 / 录屏全部自动决策）。字幕是本 Skill 的核心特征：口播稿的每一句都逐 step 显示在屏幕底部，与画面同源、可开关、可导出 SRT。全流程一步到位、中途不向用户确认：解析论文（arXiv 有 LaTeX 源码时直接从源码取公式/图/原文）→ 结构化 digest（含主要贡献与创新点，技术含量高的部分自动加大篇幅）→ 口播稿 script → 章节 outline → 套用 web-video-presentation 的脚手架与章节方法论 → 注入全局字幕层 → 录屏；架构图/流程图优先 SVG 重绘并逐步揭示，允许嵌入论文原图 / 公式 / 原文摘录以保证准确。首次运行自动写入默认配置（也可预先自定义），依赖 skill 缺失时自动安装；生成时按可扩展性铁律组织产物（真相源链 / 章节独立 / 数据驱动 / step 定位表），交付后支持按用户反馈快速展开或修改某一节（最小改动面 + 增量重录，见 Phase 8）。触发场景：论文讲解视频、paper explainer video、把论文做成视频、论文精读/拆解视频、论文总结 + 可视化讲解、paper to video、学术论文讲解稿 + 视频。
---

# Paper Explainer

把一篇论文变成一支**带全局字幕、网页实现、可录屏**的讲解视频。
**字幕是核心特征**：口播稿的每一句都逐 step 显示在屏幕底部，与画面
同源、可开关（`S` / `?subs=0`）、可导出 SRT。
做完不是终点——产物按「以后要加要改」组织，用户一句「这部分展开讲」
就能低成本改稿 / 扩章 / 重录（Phase 8）。

四条主线：

- **一步到位**：整条流水线自动跑完，**不在中途向用户确认任何事**
  （原 Checkpoint 已全部移除）；所有自主决定在最终汇报里列明。
- **贡献优先**：全片围绕论文的**主要贡献与创新点**组织；技术含量越高的
  部分自动获得越多 step / 时长 / 讲解层次（见 `references/PAPER-DIGEST.md`）。
- **素材求真**：为了讲准，允许并鼓励直接使用论文素材——**原图、公式、
  原文摘录**（PDF 抽取或 arXiv LaTeX 源码），与 SVG 重绘混用（见
  `references/PAPER-ASSETS.md`）。
- **可扩展 · 可快改**：真相源链固定、章节独立、视觉数据驱动、step 定位
  表齐全；交付后按最小改动面协议快速响应反馈（见
  `references/REVISION.md`）。

## 使用方式（输入 = 论文链接，别的什么都不用输入）

**调用方式：skill + 论文链接。** 例：

```
paper-explainer https://arxiv.org/abs/1706.03762
把 https://arxiv.org/pdf/1706.03762 做成讲解视频
```

- 「论文链接」是唯一必需输入：arXiv `abs` / `pdf`、DOI、任意 PDF / 网页
  URL、本地 PDF 路径、直接粘贴的论文文本都算。
- **拿到输入后禁止任何确认 / 提问**：主题、语言、时长、篇幅、封面、
  开发模式、输出目录……全部自动决策，只在最终汇报里列明
  「我替你做了哪些决定」。
- **唯一允许的提问**：完全没给论文（无链接、无文件、无文本）时，只问
  一次「论文链接或文件？」，拿到后立刻开工，之后不再交互。
- 交付汇报末尾附一句：想改哪里直接说（Phase 8）。

本 Skill 是**编排层**：它不重复造轮子，而是串起两个已安装的 skill：

- **`web-video-presentation`**（下称 WVP）—— 内容流程、章节/step 结构、
  动效方法论、主题 token、脚手架、录屏。**本工作流的骨架。**
- **`design-taste-frontend`**（下称 DTF）—— 审美与反 AI 味。**只在
  「造/选主题」和「终审」两处用**，不指导单章代码。

本 Skill 自己负责 WVP 没有的部分：**论文结构化 digest**、**论文→章节
映射（按贡献权重）**、**论文素材提取（原图/公式/原文 + arXiv LaTeX
源）**、**全局字幕层（核心特征）**、**录屏**，以及**一次性初始化**
（首次自动写默认配置；依赖缺失自动安装，见 `references/INIT.md`）。

> 路径约定：
> `WVP = ~/.config/opencode/skills/web-video-presentation`
> `DTF = ~/.config/opencode/skills/design-taste-frontend`
> `SELF = ~/.config/opencode/skills/paper-explainer`
> `CONFIG = ~/.config/paper-explainer/config.json`（`PAPER_EXPLAINER_CONFIG` 可覆盖）

---

## Phase -1 · 初始化（自动，几秒钟）

**每次运行开头**先做这两件事：

```bash
bash "$SELF/scripts/init-config.sh" --show    # 读配置
bash "$SELF/scripts/check-deps.sh"            # 依赖自检
```

- **有配置** → 直接应用（网页主题 / 开发模式 / 封面素材 / 讲解语言 /
  录屏自动推进），一行汇报「已加载配置：…」后继续。各配置项在哪个
  Phase 生效见 `references/INIT.md` §3。
- **无配置** → **不提问**：直接写入推荐默认值（`theme=auto` /
  `devMode=B` / `cover=svg` / `lang=auto` / `autoAdvance=true`）并继续。
  用户想自定义 → 预先写 `CONFIG`，或事后说「重配 paper-explainer」。
- **依赖 skill 缺失**（WVP / DTF）→ **直接自动安装**（不再询问）：

```bash
bash "$SELF/scripts/install-deps.sh"          # 装缺失的 WVP / DTF
```

  装完提醒用户**重启 opencode** 才会加载；装不上 → 按 `INIT.md` §2.3
  降级（缺 WVP 不能开工；缺 DTF 可降级并注明）。
- **系统工具缺失** → 自动尝试安装（按平台选包管理器）；装不上就报告
  影响并降级继续（Node 缺失除外——必须停下说明）。

> **完整规格**（字段表 / 自动安装 / 降级 / 重配）见
> [`references/INIT.md`](references/INIT.md)。开工前先读它。

### 运行时工具（缺了先装，不要假装能跑）

| 工具 | 用途 | 缺失处理 |
|---|---|---|
| Node + npm | WVP 是 Vite + React + TS | 自动装 Node LTS（>= 18）；装不上则终止 |
| Chromium / Chrome | 录屏 | 自动装；装不上 → 交付可运行项目 + build 通过 |
| ffmpeg | 裁切 / 可选烧字幕 | 自动装；装不上 → 不裁切并说明 |
| pdftotext 或 pymupdf | 解析 PDF / 抽原图 | 自动装；装不上 → 仅能处理 arXiv 源码 / 网页输入 |
| curl 或 wget | 拉取 arXiv LaTeX 源码 | 自动装；装不上 → 手动下载源码 |
| pdftocairo / pdfimages | PDF 图转 SVG / 抽位图 | 随 poppler-utils 一起装 |

`check-deps.sh` 一次性报告以上全部；缺失项按上表自动处理。

---

## 一步到位原则（无 Checkpoint）

| 决策点 | 自动动作 |
|---|---|
| 用户输入 | **只要论文链接**；主题 / 语言 / 时长 / 篇幅 / 封面 / 目录等一概不要求、不追问（仅完全没给论文时问一次链接） |
| 初始化配置 | 有则直接用；无则写推荐默认值（不问卷、不确认） |
| 依赖 skill / 系统工具 | 自动安装；失败按 `INIT.md` §2.3 降级 |
| 主题 | 按配置；`auto` → 自动挑最匹配并**汇报理由**；配置为 `ask` 时按 `auto` 处理 |
| 封面素材 | 按配置；`ask` → 按 `svg` 处理；`generate` 缺 gpt-image-2 → 回退 svg |
| 论文图 / 公式 / 原文 | 按 `PAPER-ASSETS.md` §0 自动决策（重绘 or 原图） |
| 开发模式 | 按配置；`A`（逐章确认）→ 按 `B`（顺序）执行 |
| 第 1 章 | **不验收**；作为风格锚点做完直接继续 |
| 音频 | 不合成配音，跳过；字幕承载全部口播文本 |
| 录屏 | 默认自动推进一镜到底；环境不支持则交付可运行项目 + build 通过 |
| 后台进程 | 交付前用 `scripts/stop-processes.sh` 全部停止并复查残留；不留 dev server / 浏览器 / 录屏进程 |

原则：**先做完，再汇报**；拿不准时选保守默认，并在最终汇报里列出
「我替你做了哪些决定」。

> **边界**：以上只约束**首次生成**。交付后用户主动提出的展开 / 修改
> 走 **Phase 8**——允许先定位、必要时最多问一个澄清问题，然后按最小
> 改动面直接改，不再「闷头做完」。

---

## 可扩展性铁律（生成阶段就要遵守）

生成完才想「以后怎么改」就晚了。写每个产出时按以下结构组织，Phase 8
的修改成本才能压到最低（完整规格 + 修改工作流见 `REVISION.md`）：

1. **真相源链不漂**：`digest.md → script.md → outline.md → narrations.ts
   → 章节 tsx → chapters.ts`；下游只引用上游，不绕过。
2. **章节独立可替换**：一章一目录、独立 CSS 前缀、不跨章 import；
   章节 id / 目录名生成后**不再改名**（插入新章靠 `chapters.ts` 注册
   顺序，文件夹编号允许留空隙）。
3. **step 数只有 `narrations.ts` 一个来源**：章节代码不写死步数，用
   `narrations.length` / 数据数组长度。
4. **视觉数据驱动**：节点 / 柱 / 线 / 列表项写数组，揭示索引由 `step`
   推出——插入一步 ≈ 数组插一项 + narration 插一条。
5. **三份定位表互为索引**：outline（step→画面）、script（`---` 块→文案）、
   digest（内容 / 素材→出处），改任何一步都能先定位再动手。
6. **素材可复现 + 改动留痕**：素材命名与 digest 编号一致、记录取图参数；
   每次修改追加 `revisions.md`。

---

## 进程卫生（交付即清理，零遗留）

**任何由本次运行启动的后台进程，都不许活过本次运行。** 生成完成
（Phase 6 录屏结束 / Phase 8 重录结束）后，必须先清理再汇报——不允许把
dev server、浏览器、录屏工具、ffmpeg、临时 HTTP 留在后台「方便用户看」。

**启动即登记**（凡是用 `&` 放后台的服务）：

```bash
mkdir -p .pe-run
npm run dev -- --port 5173 --strictPort >.pe-run/dev.log 2>&1 &
echo $! > .pe-run/dev.pid
```

**交付前清理**（用脚本，不要裸 `kill`）：

```bash
bash "$SELF/scripts/stop-processes.sh" --pidfile .pe-run/dev.pid --port 5173
rm -rf .pe-run
```

- `stop-processes.sh` 按进程树（含进程组）TERM → 等待 → KILL；端口
  默认**只复查、不杀进程**（避免误杀别的项目）；有残留时 exit 1。
- 确需清掉本项目的孤儿监听进程：
  `--kill-port <port> --match "<项目绝对路径>"`（只杀命令行匹配的监听进程）。
- 浏览器 / 录屏工具 / ffmpeg 若由本流程启动，启动时同样记 PID，收尾用
  `--pid <pid>` 一并停掉。
- **禁止** `nohup` / `disown` 后不管；**禁止**把「服务还开着」当交付
  说明——想给用户预览，就在汇报里给命令
  （`cd presentation && npm run dev`），由用户自己启动。
- 自检（汇报前必做）：脚本 exit 0；`ps` 里没有本次启动的 node / vite /
  chromium / ffmpeg；占用过的端口已释放。汇报里写一行：
  `进程 已清理（dev server / 浏览器 / ffmpeg）`。

> 该规则贯穿所有 Phase：4.3 验证、5 开发预览、6 录屏、8 重录，一次都不
> 例外。进程清理属于交付的一部分——没清理 = 没完成。

---

## 工作流总览

```
Phase -1 初始化            → 读配置（无则自动写默认）；依赖自动补齐
Phase 0  论文解析 + 素材提取 → paper.md / paper-src/（arXiv LaTeX 源）/ assets/
Phase 1  结构化摘要        → digest.md（类型 + 贡献 + 前置概念 + 7 维；本 Skill 独有）
Phase 2  口播稿            → script.md（贡献与创新重点展开）
Phase 3  开发计划          → outline.md（按技术含量分配篇幅）
   ▼（无 Checkpoint，直接推进）
Phase 4  脚手架 + 字幕层 + 素材接入
Phase 5  逐章实现（技术核心章节自动加篇幅）
   ▼（不合成配音，跳过音频）
Phase 6  录屏（字幕驱动自动推进 + 进程清理）
Phase 7  DTF 反 AI 味终审
Phase 8  反馈迭代（按需，用户发起）→ 定位 → 最小改动 → 同步真相源 → 增量重录
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

---

## 硬性自检协议

每个产出**写完必须自检 → 修复 → 再推进**。执行方式按能力降级：
**独立 reviewer subagent（最优）→ subagent → 自检（兜底）**。

| 产出 | 自检清单 |
|---|---|
| `digest.md` | `references/PAPER-DIGEST.md` 末尾自检（含贡献权重） |
| `script.md` | WVP `references/SCRIPT-STYLE.md` 三层自检 |
| `outline.md` | WVP `references/OUTLINE-FORMAT.md` 自检 |
| 素材 | `references/PAPER-ASSETS.md` 第 7 节自检 |
| 单章 | WVP `references/CHAPTER-CRAFT.md` 完工自检 + 本 Skill `references/SVG-DIAGRAMS.md` 自检 |
| 字幕层 | `references/SUBTITLE-AND-RECORDING.md` 第 6 节 |
| 成片 | DTF §9 AI tells 终审 |
| 交付前（全部 Phase 完成后） | 「进程卫生」自检：`stop-processes.sh` exit 0、无本次启动的后台进程、端口已释放 |
| 修改（Phase 8） | `references/REVISION.md` B4 自检 |

**铁律**：拿到 fail 项**先改完再汇报**，不允许「目测一遍就放行」。

---

## Phase 0 · 论文解析 + 素材提取

| 输入 | 做法 |
|---|---|
| arXiv 链接 / ID | **先取 LaTeX 源码**：`bash "$SELF/scripts/fetch-arxiv.sh" <url-or-id> ./paper-src`。正文公式、图注、原文从 `.tex` 直接取（最准）；图从源码 `figures/` 取（见 `PAPER-ASSETS.md` §1）。无源码（老论文）→ 回退 HTML / PDF。 |
| PDF | `pdftotext -layout`（poppler）或 `python3 -m pip install pymupdf` 后抽取 → `paper.md`；原图 / 公式按 `PAPER-ASSETS.md` §2–§3 抽取。保留章节标题、图表标题、公式附近文本。 |
| 网页链接 | webfetch 取正文 → `paper.md`。若页面提供 arXiv LaTeX 源码，走第一行。 |
| 粘贴文本 | 直接落盘 `paper.md`。 |

要求：

- `paper.md` **不删**。它是后续「画面细节源」（双源原则里的 article 角色）。
- 抽取后**扫一遍图表标题**，把图号/表号列出来，Phase 1 的素材清单要用。
- **素材落盘**：按 `PAPER-ASSETS.md` 建 `assets/`，把要进网页的原图 /
  公式 / 原文摘录取出来并命名（`fig1.png` / `eq3.tex` / `quote1.md`），
  在 digest 的「图表 / 素材清单」登记。
- 公式抽取乱码时**不要硬猜**：优先回 arXiv LaTeX 源；没有源码再按
  `PAPER-ASSETS.md` §3 从 PDF 取原图。

（可选）若用户想先**读懂**论文再决定做不做视频，可用已安装的
`paper-assist` skill 做深读对话；理解阶段结束后再回到本流程。

---

## Phase 1 · 结构化摘要 digest.md

**读** `references/PAPER-DIGEST.md`，按它的 schema 写 `digest.md`：

1. **论文类型（type）**：先判 `AI_method` / `benchmark` / `clinical` /
   `社科人文` / `综述`，7 维按该类型的语义填（边界问题见
   `PAPER-DIGEST.md`）。
2. **主要贡献与创新点（第一屏，必写）**：1–3 条，逐条给出论文依据
   （abstract / intro 贡献列表 / method / conclusion）与**技术含量分级**
   （高 / 中 / 低 + 理由）。
3. **前置概念 / 依赖（必写）**：1–5 条「不解释就看不懂主线」的观众先修
   概念 / 前作，每条带原文定义与讲解策略（独立 step / 一句带过 / 不展开）。
4. **7 个维度**：动机与问题 / 核心思想 / 模型设计 / 模型结构 / 算法流程 /
   实验设计 / 实验结果与结论。
5. **图表 / 素材清单**：每张关键图、表、公式、原句登记素材策略
   （`SVG 重绘` / `原图嵌入` / `KaTeX 公式` / `原文引用`）+ 来源。

关键约束：

- 每个数字 / 结论可回溯到 `paper.md` 或 LaTeX 源；**不编造**。
- 作者声称 vs 你的解读分开标注。
- 每维都要有「可上屏」条目，具体到能直接指导画面。
- **篇幅跟着技术含量走**：标「高」的贡献，可上屏条目更多、在 outline
  里允许扩章（映射表见 `PAPER-DIGEST.md`）。
- 论文没涉及的维度写「论文未涉及」，不要用常识填。

写完走 `PAPER-DIGEST.md` 自检，修完再进 Phase 2。

---

## Phase 2 · 口播稿 script.md

**读** `WVP/references/SCRIPT-STYLE.md`，把 digest 转成平台化口播稿。
论文题材的额外要求：

- **贡献优先**：开场钩子直接指向核心创新；动机 / 背景压缩到「讲清
  gap」即可；核心创新（新模块 / 新目标函数 / 新训练策略 / 新发现）
  用多个 step 拆开讲——直觉 → 形式化 → 与已有方法对照 → 效果。
- **技术含量定篇幅**：digest 里标「高」的贡献，至少拿到 3–6 个 step；
  背景性内容 1–2 个 step 带过；核心创新合计约占全片时长的 50% 以上。
- **术语**首次出现给「中文（English）」，之后只用中文简称；digest 第 0.5 节
  标「独立 step」的前置概念，按「是什么 → 为什么出现 → 在本论文中的角色」
  展开 1–2 个 step，标「一句带过」的按本条处理。
- **公式**念成人话：先给直觉，再说符号；长公式拆成 2–3 个 step。
- **结果**先给结论再给数字（「比最强 baseline 高 3.2 个点」），不要
  一上来念一长串指标。
- **每句话就是一 step 的字幕**——写的时候就想着它会显示在屏幕底部，
  单句别超过约 40 字，超了就拆 step。
- **节拍即修改单位**：`---` 分隔块 = outline 的 step = `narrations.ts`
  的一项，三处顺序严格一致——Phase 8 的展开 / 压缩都按节拍操作。
- **原文引用**：关键定义 / 作者原话可直接引用 `paper.md` / LaTeX 源
  （短句，注明出处），字幕里用引号标出。
- 语言按配置 `narration.language`：`auto` = 中文论文→中文稿、英文论文→
  默认中文讲解；`zh` / `en` 强制。

写完走 SCRIPT-STYLE 三层自检。

---

## Phase 3 · 开发计划 outline.md

**读** `WVP/references/OUTLINE-FORMAT.md`，按 `PAPER-DIGEST.md` 里的
**章节映射表**切章（默认 9 章）：

```
01 开场钩子 · 02 动机与不足 · 03 核心思想 · 04 模型设计 · 05 模型结构
06 算法流程 · 07 实验设计 · 08 实验结果 · 09 结论与局限
```

- **按技术含量分配篇幅**：技术核心章节（贡献标「高」的落点）可扩到
  8–14 step；背景章（02 动机、07 实验设计）压到 3–5 step。核心创新
  章节合计 ≥ 全片 step 的 50%。
- 每章 30–60s；每步屏幕内容 + 章节首段**信息池**（数字/引用/标签）。
- **每步标注素材策略**：`SVG 重绘` / `原图 Fig.X` / `公式 eq.N` /
  `原文引用`（素材已由 Phase 0 落盘）。
- outline **只写节奏与信息密度，不写动画**（WVP 铁律）。
- 信息池从 `digest.md` + `paper.md` 抽，图表步标注重绘或原图策略。
- **outline 同时是修改定位表**：每章 id / step 行 / 总步数保持可对照；
  实现时 step 数变了回写这里；Phase 8 收到反馈先在这里定位。

写完走 OUTLINE-FORMAT 自检。

---

## Phase 4 · 脚手架 + 字幕层 + 素材接入

### 4.1 自动决策（原 Checkpoint Plan 已移除，直接执行）

- **主题**（`theme.mode`）：
  - `fixed` → 用 `theme.id`；先确认 `WVP/themes/<id>/` 存在，否则警告
    并回退 `auto`；
  - `auto` / `ask` → 按论文气质读 `themes/*/theme.json`（`bestFor` /
    `descriptionZh`）挑最匹配的一套，**汇报你选了什么、为什么**。
- **封面素材**（`materials.cover`）：`svg` 自绘；`generate` 用
  `gpt-image-2`（未安装则回退 `svg` 并说明）；`placeholder` 占位；
  `ask` → 按 `svg` 处理。
- **论文图表素材**（论文特有）：按 `PAPER-ASSETS.md` §0 决策——
  模块清晰的架构图 / 流程图**优先 SVG 重绘**；复杂大图、定性结果、
  密集表格、公式**允许直接嵌入论文原图**（注明编号、裁切干净）。
  两种可混用，判断标准只有一个：**怎样讲得更准、更清楚**。
- **开发模式**（`devMode`）：A / B / C 直接执行；`A` 按 `B` 处理
  （本工作流不逐章确认）。

**主题这一步仍引入 DTF**：用 DTF 的 **design read + 三档 dial**
（`DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY`）判断主题
是否合适（学术讲解通常 `DENSITY` 偏高、`MOTION` 中低）；若需造新主题，
按 WVP `references/THEMES.md` 的「创作新主题」流程，字体/配色决策参考
DTF §4.1 / §4.2（避开 AI 默认紫、避免 Inter 默认、serif 只在确实编辑
风时用）。

### 4.2 脚手架

```bash
bash "$WVP/scripts/scaffold.sh" ./presentation --theme=<选定主题id>
rm -rf presentation/src/chapters/01-example   # 并清掉 chapters.ts 里的 EXAMPLE_CHAPTER
```

> 删掉示例章 = 结构变更，**顺手 bump** `useStepper.ts` 的 `STORAGE_KEY`
> （如 `v4`→`v5`），否则旧的持久化游标可能落在已不存在的 step 上。

### 4.3 注入全局字幕层（核心特征，必做）

```bash
bash "$SELF/scripts/install-subtitle.sh" ./presentation
```

然后按 `references/SUBTITLE-AND-RECORDING.md` 第 2 节改 `App.tsx`
（4 处最小改动）。改完 `npm run dev` 验证字幕条出现、`S` 键可开关，
**验证完立即停掉 dev server**（见「进程卫生」）。

### 4.4 素材接入

把 `assets/` 里要用的文件复制进 `presentation/public/assets/`；公式按
`PAPER-ASSETS.md` §3 装 KaTeX 或走图片；原图按「纸面卡片」适配暗色
主题。路径与命名规范见 `PAPER-ASSETS.md` §5。

### 4.5 第 1 章（不验收，作为风格锚点）

按 `WVP/references/CHAPTER-CRAFT.md` 做第 1 章（通常是「开场钩子」），
做完**直接继续**后续章节——本工作流不设验收停顿。第 1 章的代码是
后续章节的风格参考。

---

## Phase 5 · 逐章实现

每章**必读** `WVP/references/CHAPTER-CRAFT.md`（单一入口），并遵守：

- 每章必须有视觉演示，禁纯文字。
- 清单/列表 1 项 = 1 step，禁一次全展示。
- 图表按 `SVG-DIAGRAMS.md`（SVG 重绘）与 `PAPER-ASSETS.md`（原图 /
  公式 / 原文）：架构图逐模块点亮、流程图逐节点点亮、结果图逐柱/逐线
  揭示；**原图同样由 `step` 驱动**（高亮框 / 局部放大 / 逐块揭示），
  颜色全走 token。
- **技术核心章节加码**：按 digest 的贡献权重，给核心创新更多 step 与
  更细的讲解层次（直觉 → 公式 → 对照 → 结果）；背景章克制。
- 双源原则：节奏跟 `script.md`，画面细节回 `digest.md` / `paper.md`。
- **可扩展**：视觉数据驱动（数组 + `step` 映射），步数取自
  `narrations.length`；插入 / 删除 step 只动数组与 narrations，不重写
  整章（规格见 `REVISION.md` Part A）。
- 每章独立 CSS 前缀，不改 `chapters.ts` 结构（除非按 WVP 规则同步）。
- 改章节结构或 `narrations.ts` 长度后，bump `useStepper.ts` 的
  `STORAGE_KEY`。

并行模式（`devMode=C`，WVP 模式 C）可用 subagent；subagent prompt 需附：
本章 outline 段 + CHAPTER-CRAFT 路径 + 主题气质 + 第 1 章代码作风格
参考 + **SVG-DIAGRAMS / PAPER-ASSETS 路径**（图表章尤其）+ 硬规则
（独立 CSS 前缀、`npx tsc --noEmit`）。

每章完工走 CHAPTER-CRAFT + SVG-DIAGRAMS + PAPER-ASSETS 自检。

---

## Phase 6 · 录屏（字幕驱动自动推进）

**跳过 WVP 的 Checkpoint Audio 与 Phase 3（音频合成）**；本工作流不合成
配音，字幕就是全部口播文本。

按 `references/SUBTITLE-AND-RECORDING.md` 第 4 节，走法由配置
`recording.autoAdvance` 决定：

1. `true`（默认）：`?auto=1&reset=1` → `SPACE` 启动 → 按字幕字数
   估时自动推进（`reset=1` 保证从第 1 页开始，不受上次游标影响）；
   字幕随 step 显示，全程免点击；
2. `false`：走 4.2 手动推进（点击 / `→` / 空格），适合后期自己控制节奏；
3. 录屏 → ffmpeg 裁头尾。浏览器 / ffmpeg 缺失时跳过录屏，交付可运行
   项目并在汇报里说明。
4. **清理**：录屏 / 裁切结束后按「进程卫生」停掉 dev server、浏览器、
   录屏工具、ffmpeg（`scripts/stop-processes.sh`），确认无残留再进
   Phase 7。

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

> 若 DTF 未安装且自动安装失败（`INIT.md` §2.3 降级）：改用 WVP
> `references/CHAPTER-CRAFT.md` 的 ANTI-AI 清单做终审，并在汇报里注明
> 「本次无 DTF 终审」。

---

## Phase 8 · 反馈迭代（按需，用户发起）

首次交付后，产物进入「可快速修改」状态。**首次汇报里主动告诉用户**：
想改哪里直接说（例：「展开讲 06 算法流程」「把结果图的数字核对一下」），
不需要重跑全流程。用户看完预览 / 成片提出「这部分展开讲」「XX 改一下」
「数字不对」等反馈时：

1. **定位**：把反馈映射到章节 id + step 区间 + 改动层（文案 / 内容 /
   结构 / 视觉 / 素材 / 主题）。先翻 `outline.md`（step→画面），再翻
   `revisions.md`（改过什么）；反馈模糊时先给出定位判断，必要时最多问
   一个澄清问题。
2. **最小改动面**：按 `REVISION.md` Part B 的类型表动手——**先改上游
   真相源，再改下游**；`script.md` 与 `narrations.ts` 必须同改。
3. **展开一节**（最高频需求）：digest / paper 取料 → `script.md` 插
   `---` 块 → `outline.md` 插 step 行 → `narrations.ts` 插条目 →
   章节视觉插数据项 / 分支 → bump `STORAGE_KEY`。
4. **收尾**：`npx tsc --noEmit` + `REVISION.md` B4 自检 → 默认**整片
   重录**（字幕驱动自动推进，成本低且无接缝）→ 按「进程卫生」清理
   后台进程并复查 → `revisions.md` 追加记录 → 按 B6 模板汇报。

**不重跑 Phase 0–7**；只有换论文（回 Phase 0）或换主题（回 Phase 4.1）
才回到对应阶段。完整协议见
[`references/REVISION.md`](references/REVISION.md)。

---

## 与两个依赖 Skill 的边界（重要）

| 事项 | 归谁 |
|---|---|
| 内容流程 / 章节 / step / 动效方法论 / 脚手架 / 录屏 | **WVP** |
| 论文 digest / 章节映射 / 素材提取（原图/公式/原文/LaTeX 源）/ 全局字幕层（核心特征）/ 无配音自动推进路径 | **本 Skill** |
| 主题的字体与配色审美、反 AI 味终审 | **DTF（仅这两处）** |
| 单章代码怎么写 | **WVP 的 CHAPTER-CRAFT**（DTF 不参与） |

**冲突时以 WVP 为准**（它是本工作流的结构骨架）；DTF 只做「顾问」，
不覆盖 WVP 的流程与舞台规则。

---

## 相关资源

| 文件 | 何时读 |
|---|---|
| `references/INIT.md` | **Phase -1 开工前必读**：自动初始化 / 配置字段 / 依赖安装 / 降级 |
| `references/PAPER-ASSETS.md` | **Phase 0 素材提取 + Phase 4.4 接入 + Phase 5 用原图/公式/原文时** |
| `scripts/init-config.sh` | 首次运行写默认配置；之后 `--show` 读配置 |
| `scripts/check-deps.sh` | 每次开工前依赖自检 |
| `scripts/install-deps.sh` | 自动安装缺失的 WVP / DTF |
| `scripts/fetch-arxiv.sh` | Phase 0 下载并解压 arXiv LaTeX 源码 |
| `references/PAPER-DIGEST.md` | Phase 1 必读；Phase 3 取章节映射与权重 |
| `references/SUBTITLE-AND-RECORDING.md` | Phase 4.3 注入字幕、Phase 6 录屏 |
| `references/REVISION.md` | 生成时按可扩展性铁律组织；Phase 8 收到反馈后（定位 / 改动面 / 同步 / 重录） |
| `references/SVG-DIAGRAMS.md` | Phase 5 画架构/流程/结果图时 |
| `WVP/SKILL.md` | 全流程；Checkpoint 模板（本工作流已移除，仅作参考） |
| `WVP/references/SCRIPT-STYLE.md` | Phase 2 |
| `WVP/references/OUTLINE-FORMAT.md` | Phase 3 |
| `WVP/references/CHAPTER-CRAFT.md` | Phase 5 每章单一必读 |
| `WVP/references/THEMES.md` | Phase 4 造/选主题 |
| `WVP/references/RECORDING.md` | Phase 6 录屏工具细节 |
| `DTF/SKILL.md` | Phase 4 主题审美、Phase 7 终审 |
| `scripts/install-subtitle.sh` | Phase 4.3 跑一次 |
| `scripts/stop-processes.sh` | 启动过后台服务后、交付前清理（「进程卫生」） |
