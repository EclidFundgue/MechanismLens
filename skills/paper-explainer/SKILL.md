---
name: paper-explainer
license: MIT
description: 把学术论文（arXiv / DOI / PDF / 网页 / 本地文件 / 粘贴文本）自动编译成可交互、可逐步播放、可跳转回论文原文的技术讲解网页。调用方式只有 skill + 论文链接或文件；中途不询问主题、篇幅或场景。Skill 自带 React/Vite 运行时、六类论文场景、字幕、Evidence Drawer、Paper IR / Scene IR schema、数据校验器和 Windows/Linux/macOS 一键启动脚本，不依赖其它 skill。默认只交付网页；用户明确要求 MP4 时才在定稿后导出。
---

# Paper Explainer

输入论文，直接交付一个构建完成、可一键打开、每个关键结论能回到论文原文的
交互式讲解。内部使用轻量 Paper IR 和 Scene IR，但这些实现细节不增加用户步骤。

## 用户契约

唯一必需输入是论文链接、文件或正文：

```text
paper-explainer https://arxiv.org/abs/1706.03762
paper-explainer ./paper.pdf
```

拿到输入后直接完成，不询问主题、语言、篇幅、封面、场景或输出目录。只有三种
情况允许停下：完全没给论文；输入需要用户登录；所有解析路径都失败。

默认输出网页。仅用户明确说“视频 / MP4 / 录屏”或配置
`recording.enabled=true` 时才在网页定稿后导出视频。

## 自包含边界

本 Skill 不读取、不安装、也不要求以下外部能力：

- presentation / video scaffold skill；
- design / taste skill；
- 其它 paper reader skill。

运行时全部位于 `assets/project-template/`：

- `project/`：React/Vite 播放器和六类 renderer；
- `content/`：Paper IR / Scene IR 示例与人类可读文档；
- `schemas/`：两类 IR 的 JSON Schema；
- `runtime/`：校验器以及 Node/Python 本地服务器；
- `open.cmd` / `open.command` / `open.sh`：跨平台入口。

## 开工必读

设 `SELF` 为本 Skill 目录。每次运行按需阅读：

1. `references/INIT.md`：环境、脚手架、产物结构；
2. `references/PAPER-IR.md`：解析论文和 evidence；
3. `references/SCENE-IR.md`：场景选择与 Scene IR；
4. `references/RUNTIME-AND-DELIVERY.md`：构建、启动、验证、交付；
5. 使用论文图或公式时读 `references/PAPER-ASSETS.md`；
6. 修改已有产物时读 `references/REVISION.md`。

维护内置 runtime 或校验器时另读 `references/DEVELOPMENT.md`；普通论文生成流程
不需要加载该开发说明。

## 真相源

```text
原论文 / paper.md
        ↓
paper-ir.json                 事实、claim、evidence
        ↓
scene-ir.json                 场景顺序、step、字幕、focus、evidence
        ↓
内置 renderer                视觉实现
        ↓
site/                         构建产物
```

`scene-ir.json` 是章节、step 数、字幕和画面 focus 的唯一运行时真相源。
不要再生成 `narrations.ts`、`chapters.ts` 或每章重复的字幕数组。
`script.md`、`outline.md` 是给人读的规划副本，必须带稳定 scene/step ID；冲突时
以 IR 为准并修复 Markdown 副本。

## 标准产物

```text
<paper-slug>-explainer/
├── open.cmd
├── open.command
├── open.sh
├── site/
├── content/
│   ├── paper.md
│   ├── paper-ir.json
│   ├── scene-ir.json
│   ├── script.md
│   ├── outline.md
│   └── revisions.md
├── project/
│   ├── public/assets/
│   ├── public/paper/original.pdf
│   └── src/
├── runtime/
├── schemas/
└── reports/explanation-audit.md
```

## 工作流

### Phase -1 · 初始化

```bash
bash "$SELF/scripts/check-deps.sh"
bash "$SELF/scripts/init-config.sh" --ensure
node "$SELF/scripts/scaffold-project.mjs" "./<paper-slug>-explainer" \
  --title "<paper title>" --source "<original URL>"
```

目标目录必须不存在或为空。不要覆盖已有项目；修改已有项目走 Phase 8。

### Phase 0 · 获取论文与原始素材

- arXiv：优先下载 LaTeX 源，再获取 PDF；可用 `scripts/fetch-arxiv.sh`。
- PDF：保存或复制到 `project/public/paper/original.pdf`，抽取正文到
  `content/paper.md`。
- 网页：保存正文到 `paper.md`；记录原始 URL，能找到 PDF 时也保存 PDF URL。
- 粘贴文本：写入 `paper.md`；若没有在线原文，Evidence Drawer 仍显示摘录，
  但不要伪造跳转链接。

写入 `paper-ir.json.paper`：

- `originalUrl`：论文落地页或原始网页；
- `pdfUrl`：可公开访问的 PDF；
- `localPdfPath`：本地 PDF 存在时固定为 `paper/original.pdf`。

### Phase 1 · Paper IR

严格按 `references/PAPER-IR.md` 写 `content/paper-ir.json`：

- 先建立 evidence，再写引用 evidence ID 的 claim / contribution / module 等；
- 每个上屏数字、比较、公式解释和作者结论必须至少有一个 evidence ID；
- `direct` 表示论文直接陈述，`derived` 表示基于论文的系统解读；
- 不确定时删掉该说法或明确标记 derived，不用常识补论文事实。

同时维护简洁的 `script.md`、`outline.md`，每段标注稳定 ID。

### Phase 2 · Scene IR

按 `references/SCENE-IR.md` 将内容映射到六种内置场景：

| type | 选择条件 |
|---|---|
| `concept` | 动机、贡献、前置概念、结论 |
| `architecture_execution` | 模块、数据流、tensor 或训练/推理管线 |
| `equation_walkthrough` | 公式及符号逐项解释 |
| `algorithm_trace` | 伪代码、循环、状态更新 |
| `ablation_comparison` | baseline、主结果、消融、指标对比 |
| `figure_inspector` | 定性图、复杂架构原图、局部观察 |

每个 scene 必须有至少一个 step；每个 step 必须有 `narration`。关键 scene 和
step 绑定 `evidenceIds`，视觉元素用 `focusIds` 控制聚焦。
需要逐步揭示节点、演算状态、公式变化、基线对比或原图放大时，按
`references/SCENE-IR.md` 的相应类型填写 step `visual`；不要另建章节脚本
或复制一套字幕数据。

### Phase 3 · 素材

把网页素材放到 `project/public/assets/`。路径在 Scene IR 中写成
`assets/<filename>`。不要把原论文 PDF 放在 assets；PDF 固定放在
`project/public/paper/original.pdf`，便于来源跳页。

公式直接写 LaTeX 到 equation scene 的 `payload.tex`；运行时自带 KaTeX。

### Phase 4 · 构建与硬校验

```bash
node "$SELF/scripts/build-project.mjs" "./<paper-slug>-explainer"
```

该命令会：

1. 安装项目 npm 依赖（只在缺少 `node_modules` 时）；
2. 校验 Paper IR / Scene IR 的 ID、引用和最小字段；
3. TypeScript 编译；
4. 生成 `site/`。

数据校验失败必须先修复，不能绕过。

### Phase 5 · 浏览器验证

验证时可在生成目录运行平台启动脚本，或开发模式：

```bash
cd <paper-slug>-explainer/project
npm run dev
```

检查：

- 所有 scene / step 都能前后切换；
- 自动播放从头到尾不卡住；
- 字幕与 step narration 一致；
- 当前 step 的 Evidence Drawer 不为空（纯过渡 step 可例外）；
- “跳转到论文原文”打开正确网页或 PDF 页；
- 原图和公式正常构建；
- 小屏不会遮住主导航。

开发验证完成后停止 dev server。最终用户不需要运行 `npm run dev`。

### Phase 6 · Explanation Audit

生成 `reports/explanation-audit.md`，至少记录：

- 主要贡献覆盖率；
- 数字 claim 来源覆盖率；
- 公式、图表和实验结论来源覆盖率；
- `derived` 解读列表；
- 没有专属场景而退化到 `concept` 的章节；
- 构建和来源链接抽查结果。

硬门槛：所有上屏数字和关键结论来源覆盖率 100%。

### Phase 7 · 交付

确认 `site/index.html` 存在，三个启动脚本存在，且没有遗留 dev server。

最终汇报只保留用户需要的信息：目录、章节/step 数、来源覆盖率、如何打开、
是否导出 MP4。不要输出安装流水账。

### Phase 8 · 修改

先读 `references/REVISION.md`。修改内容时先更新 Paper IR，再更新 Scene IR，
最后重新构建 `site/`。稳定 ID 非必要不改；修改记录追加到 `revisions.md`。

## 原文跳转铁律

运行时通过 `EvidenceDrawer` 统一处理来源：

- evidence 有 `url`：直接打开该 URL；
- 有 `page`：优先打开本地 PDF 的 `#page=N`，否则打开 `pdfUrl#page=N`；
- 有 `anchor`：打开原文 URL 的 fragment；
- 两者都没有：打开论文主页，并展示 section / excerpt 帮用户定位。

任何来源按钮都必须来自 Paper IR，禁止在 TSX 中手写第二份链接。

## 视觉约束

- 一步只强调一个逻辑动作；非 focus 元素降权而不是消失；
- 技术内容优先结构、关系、状态变化，避免大量装饰卡片；
- 原论文图不反色、不生成替代图；使用浅色 paper canvas；
- 英文和数字使用清晰字体；KaTeX 数学字体不覆盖；
- 颜色只承担语义：accent 表示当前 focus 或来源入口。

## 进程卫生

Skill 自己启动的 dev server、浏览器或录屏进程必须在交付前结束。最终交付的
`open.*` 是用户主动启动的查看器，不在生成阶段替用户常驻运行。
