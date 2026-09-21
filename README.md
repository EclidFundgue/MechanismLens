# Paper Explainer

**把复杂文档编译成可交互的视觉讲解。**

给 AI coding agent 用的 [Agent Skill](https://agentskills.io)：装上之后，
「skill + 文档(链接)」即可，**其他什么都不用输入**。链接支持 arXiv / DOI /
PDF / 网页，也支持本地 PDF 或粘贴文本。输出可运行、可交互的 16:9 网页
演示项目——每一步独占整屏、视觉随进度逐步揭示、**字幕逐 step 显示在
屏幕底部（可开关、可导出 SRT）**。**录屏是可选功能：默认不录屏**，
只有明确提出「录成视频 / 要 mp4」等视频产出需求时才输出视频文件；且录屏
永远排在最后——等终审与所有修改定稿后只录一次，避免反复渲染。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## 它能做什么

- **讲解规划**：先做结构化 digest（核心观点与关键概念 + 多维分析），
  内容越重要、理解难度越高的部分自动获得越多 step / 时长 / 讲解层次。
- **素材求真**：架构图 / 流程图优先 SVG 重绘并逐步揭示；允许嵌入文档
  原图、KaTeX 公式、原文摘录保证准确（arXiv 论文优先从 LaTeX 源码取公式）。
- **一步到位**：解析 → digest → 口播稿 → 章节 outline → 网页实现 →
  字幕层，全流程自动跑完，中途不提问；首次运行自动写默认配置，
  交付前自动清理后台进程（不留 dev server / 浏览器 / 录屏进程）。
- **录屏可选且最后做**：默认只交付可运行网页项目，不装录屏工具、不录屏；
  明确说「做成视频」或配置 `recording.enabled=true` 才执行录屏，且等
  反 AI 味终审与所有修改定稿后只录一次——内容还在改时不会反复渲染视频。
- **可快速修改**：产物按真相源链组织（digest → script → outline →
  narrations → 章节代码）。交付后说「展开讲 06 算法流程」或「把结果图的
  数字核对一下」，agent 按最小改动面定位修改；修改期间只做预览验证，
  全部改完后如需出片再统一重录一次。

## 安装

需要 Node.js >= 18；依赖的 `web-video-presentation` / `design-taste-frontend`
skill 与系统工具（ffmpeg、浏览器、poppler 等）会在首次运行时自动安装。

### opencode

```bash
git clone https://github.com/EclidFundgue/paper-explainer.git
ln -s "$PWD/paper-explainer/skills/paper-explainer" ~/.config/opencode/skills/paper-explainer
```

或直接拷贝：

```bash
cp -r paper-explainer/skills/paper-explainer ~/.config/opencode/skills/
```

### Claude Code / 其他 agent

```bash
# Claude Code
cp -r paper-explainer/skills/paper-explainer ~/.claude/skills/
# 通用 agent（.agents/skills 约定）
cp -r paper-explainer/skills/paper-explainer ~/.agents/skills/
```

装好后重启 agent，让它重新扫描 skills 目录。

## 使用

**只需要一句话：skill + 文档链接。其他什么都不用输入。**

```
paper-explainer https://arxiv.org/abs/1706.03762
把这篇论文做成讲解视频，要 mp4 https://arxiv.org/pdf/1706.03762
paper explainer：./technical-report.pdf
```

链接可以是 arXiv / DOI / 任意 PDF / 网页，也可以是本地 PDF 路径或直接
粘贴的文档文本。主题 / 语言 / 时长 / 篇幅 / 封面 / 输出目录全部自动
决策，中途不提问。录屏按需且最后执行：只给链接时交付可运行网页项目；
明确说「做成视频 / 要 mp4 / 录屏」时，等全部内容定稿后才会额外出视频
文件（不会在修改过程中反复重录）。

首次运行会把默认配置写到 `~/.config/paper-explainer/config.json`
（主题 / 开发模式 / 封面 / 讲解语言 / 录屏开关与自动推进），之后直接复用。
想改配置：预先编辑该文件，或事后说「重配 paper-explainer」。

## 依赖

| 依赖 | 作用 | 缺失时 |
|---|---|---|
| [`web-video-presentation`](https://github.com/ConardLi/garden-skills) | 内容流程 / 章节结构 / 脚手架 / 主题 token（工作流骨架） | 自动安装；装不上无法开工 |
| [`design-taste-frontend`](https://github.com/Leonxlnx/taste-skill) | 主题审美 + 反 AI 味终审 | 自动安装；失败可降级 |
| Node.js + npm | 网页项目（Vite + React + TS） | 自动安装；失败终止 |
| Chromium / Chrome、ffmpeg | 录屏与裁切（可选，默认不用） | 仅要求录屏时自动安装；失败则交付可运行项目 |
| pdftotext / pymupdf、curl | PDF 解析、arXiv LaTeX 源码下载 | 自动安装；失败降级到可用输入 |

## 工作流

```
Phase -1  初始化（读配置 / 依赖自检，全自动）
Phase 0   文档解析 + 素材提取（paper.md / paper-src/ / assets/）
Phase 1   结构化 digest（核心观点与关键概念 + 多维分析）
Phase 2   口播稿 script.md（= 字幕文本）
Phase 3   讲解计划 outline.md（章节 + step + 信息池）
Phase 4   脚手架 + 字幕层 + 素材接入
Phase 5   逐章实现（SVG / 原图逐步揭示）
Phase 6   反 AI 味终审
Phase 7   录屏（可选，最后一步：终审与全部修改定稿后只录一次）
Phase 8   反馈迭代（按需：展开 / 修改 → 最小改动面；全部改完后再统一录屏）
```

## 仓库结构

```
paper-explainer/
├── README.md                  # 你正在看的文件（给人看）
├── LICENSE
└── skills/
    └── paper-explainer/       # 安装时复制/链接这个目录
        ├── SKILL.md           # agent 加载的唯一入口
        ├── references/        # 按需加载的规格文档
        │   ├── INIT.md
        │   ├── PAPER-DIGEST.md
        │   ├── PAPER-ASSETS.md
        │   ├── SVG-DIAGRAMS.md
        │   ├── SUBTITLE-AND-RECORDING.md
        │   └── REVISION.md
        ├── scripts/           # 初始化 / 依赖 / arXiv / 字幕层安装
        └── assets/            # 字幕层组件模板
```

## 许可

[MIT](./LICENSE)
