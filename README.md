# Paper Explainer

**把一篇学术论文变成一支「带全局字幕」的网页讲解视频。**

给 AI coding agent 用的 [Agent Skill](https://agentskills.io)：装上之后，直接说
「把这篇论文做成讲解视频」即可。输入 arXiv 链接 / PDF / 网页 / 粘贴文本，
输出可录屏的 16:9 网页视频项目——每一步独占整屏、视觉随进度逐步揭示、
**字幕逐 step 显示在屏幕底部（可开关、可导出 SRT）**。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## 它能做什么

- **贡献优先**：先做结构化 digest（主要贡献与创新点 + 7 个维度），
  技术含量越高的部分自动获得越多 step / 时长 / 讲解层次。
- **素材求真**：架构图 / 流程图优先 SVG 重绘并逐步揭示；允许嵌入论文
  原图、KaTeX 公式、原文摘录保证准确（arXiv 论文优先从 LaTeX 源码取公式）。
- **一步到位**：解析 → digest → 口播稿 → 章节 outline → 网页实现 →
  字幕层 → 录屏，全流程自动跑完，中途不提问；首次运行自动写默认配置。
- **可快速修改**：产物按真相源链组织（digest → script → outline →
  narrations → 章节代码）。交付后说「展开讲 06 算法流程」或「把结果图的
  数字核对一下」，agent 按最小改动面定位修改并增量重录。

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

直接用自然语言触发，例如：

- 把这篇论文做成讲解视频：`https://arxiv.org/abs/1706.03762`
- paper explainer：`./attention-is-all-you-need.pdf`
- 帮我读一下这篇论文，做成带字幕的网页讲解视频

首次运行会把默认配置写到 `~/.config/paper-explainer/config.json`
（主题 / 开发模式 / 封面 / 讲解语言 / 录屏自动推进），之后直接复用。
想改配置：预先编辑该文件，或事后说「重配 paper-explainer」。

## 依赖

| 依赖 | 作用 | 缺失时 |
|---|---|---|
| [`web-video-presentation`](https://github.com/ConardLi/garden-skills) | 内容流程 / 章节结构 / 脚手架 / 主题 token（工作流骨架） | 自动安装；装不上无法开工 |
| [`design-taste-frontend`](https://github.com/Leonxlnx/taste-skill) | 主题审美 + 反 AI 味终审 | 自动安装；失败可降级 |
| Node.js + npm | 网页项目（Vite + React + TS） | 自动安装；失败终止 |
| Chromium / Chrome、ffmpeg | 录屏与裁切 | 自动安装；失败则交付可运行项目 |
| pdftotext / pymupdf、curl | PDF 解析、arXiv LaTeX 源码下载 | 自动安装；失败降级到可用输入 |

## 工作流

```
Phase -1  初始化（读配置 / 依赖自检，全自动）
Phase 0   论文解析 + 素材提取（paper.md / paper-src/ / assets/）
Phase 1   结构化 digest（贡献与创新点 + 7 维）
Phase 2   口播稿 script.md（= 字幕文本）
Phase 3   开发计划 outline.md（章节 + step + 信息池）
Phase 4   脚手架 + 字幕层 + 素材接入
Phase 5   逐章实现（SVG / 原图逐步揭示）
Phase 6   录屏（字幕驱动自动推进）
Phase 7   反 AI 味终审
Phase 8   反馈迭代（按需：展开 / 修改 → 最小改动面 + 增量重录）
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
