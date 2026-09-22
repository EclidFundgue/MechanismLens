<p align="center">
  <img src="docs/assets/readme-hero.svg" alt="Paper Explainer：从文档，到逐步讲解，再回到证据。" width="100%" />
</p>

<h1 align="center">Paper Explainer</h1>
<p align="center"><strong>把复杂文档，变成看得懂、点得动、查得到出处的视觉讲解。</strong></p>
<p align="center">一个自包含的 Agent Skill · 输入链接或文件 · 交付交互式网页</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-93c5fd?style=flat-square" alt="MIT License" /></a>
  <a href="skills/paper-explainer/SKILL.md"><img src="https://img.shields.io/badge/Agent_Skill-self--contained-a7f3d0?style=flat-square" alt="Self-contained Agent Skill" /></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/Node.js-%E2%89%A5_18-c4b5fd?style=flat-square" alt="Node.js 18 or later" /></a>
</p>

<p align="center">
  <a href="#experience">你会得到什么</a> ·
  <a href="#quick-start">快速开始</a> ·
  <a href="#scenes">视觉讲解能力</a> ·
  <a href="#delivery">交付与分享</a> ·
  <a href="#development">开发文档</a>
</p>

---

阅读复杂文档时，最难的往往是把概念、结构、流程和数据连起来。Paper Explainer 让 Agent 读取原文，把关键内容组织成可以逐步探索的讲解：看数据如何流动，拆开一个公式，跟踪一次算法执行，再点开对应的原文依据。

在支持本地 Skill 的 Agent 对话中输入：

```text
paper-explainer https://arxiv.org/abs/1706.03762
```

**从原文解析到网页构建，一次调用完成。** 支持论文、技术报告、产品文档、教程、文章、网页、PDF、本地文件和粘贴文本；讲解深度取决于原文可提取的信息。

<a id="experience"></a>
## 你会得到什么

| 读懂内容 | 掌握节奏 | 核对依据 |
| :--- | :--- | :--- |
| 用架构、公式、算法和图表解释复杂内容 | 手动前后切换，或开启自动播放 | 从当前步骤打开「来源依据」 |
| 一步聚焦一个逻辑动作 | 字幕跟随当前步骤变化 | 查看摘录，跳转原网页或 PDF 页 |
| 将数据、方案对比与对应结论放在一起 | 按章节浏览，回看难点 | 区分原文直接陈述与推导性解读 |

适合个人学习、技术评审、培训和分享，以及需要反复核对来源的内容讲解。网页、内容数据和可编辑源码一起交付，后续可以继续让 Agent 修改。

> **默认交付网页。** 明确要求「MP4 / 视频 / 录屏」时，才在内容定稿后安排视频导出；需要额外的录屏环境与 ffmpeg。

<a id="quick-start"></a>
## 快速开始

### 1. 安装 Skill

准备一个能读取本地 Skill、执行命令的 Agent，以及 **Node.js ≥ 18 和 npm**。模板目录、场景编译器、通用视觉舞台和校验器随仓库提供，无需安装其它 Skill。构建时会安装 npm 依赖；使用附带的 `.sh` 工具需要 Bash，Windows 可使用 Git Bash 或 WSL。

先克隆仓库：

```bash
git clone https://github.com/EclidFundgue/paper-explainer.git
```

将 `skills/paper-explainer` 整个目录复制到你的 Agent 的 Skill 目录。以下按平台选择一种：

<details open>
<summary><strong>macOS / Linux / Git Bash</strong></summary>

```bash
# Claude Code
mkdir -p ~/.claude/skills
cp -r paper-explainer/skills/paper-explainer ~/.claude/skills/

# 使用 ~/.agents/skills 的 Agent（如 Codex）
mkdir -p ~/.agents/skills
cp -r paper-explainer/skills/paper-explainer ~/.agents/skills/
```

</details>

<details>
<summary><strong>Windows PowerShell</strong></summary>

```powershell
# 使用 ~/.agents/skills 的 Agent（如 Codex）
$skillDir = Join-Path $HOME '.agents/skills'
New-Item -ItemType Directory -Force -Path $skillDir | Out-Null
Copy-Item -Recurse -Path './paper-explainer/skills/paper-explainer' -Destination $skillDir
```

Claude Code 用户将目标目录改为 `.claude/skills`。

</details>

### 2. 给它一份文档

安装后，在 Agent 的新会话里使用以下任一提示。**这些是对话提示，不是终端命令。**

```text
paper-explainer https://arxiv.org/abs/1706.03762
```

```text
用 paper-explainer 讲解 ./technical-report.pdf
```

```text
用 paper-explainer 讲解这份文档，内容定稿后再导出 MP4：<文档链接>
```

不必先指定主题、篇幅、场景或输出目录。输入需要登录或无法解析时，Agent 会请求可访问的文件或正文。

### 3. 打开讲解

在生成的 `<paper-slug>-explainer/` 目录中：

| 系统 | 打开方式 |
| :--- | :--- |
| Windows | 双击 `open.cmd` |
| macOS | 双击 `open.command` |
| Linux | 运行 `bash open.sh` |

启动器会选择空闲端口并打开浏览器。查看已构建的网页需要 Node.js 或 Python；不需要运行开发服务器。

<a id="scenes"></a>
## 内容决定讲法，稳定画幅保护阅读

| 内容能力 | 适合解释 | 你可以看到 |
| :--- | :--- | :--- |
| **概念讲解** | 问题、前置知识、关键观点与结论 | 固定画面内切换关键概念的强调 |
| **架构执行** | 模型模块、数据流、训练与推理管线 | 模块与连接随步骤高亮 |
| **公式拆解** | 核心公式、符号含义、数学关系 | LaTeX 公式与当前解释对应 |
| **算法跟踪** | 伪代码、循环、状态更新 | 当前代码行与状态逐步变化 |
| **对比分析** | 数据、方案、baseline、消融结果 | 固定尺度下逐步显示并强调比较对象 |
| **原图检视** | 架构图、定性结果、复杂图表 | 原图区域标注、局部放大与解读 |

这些内容能力由统一场景图表达。Agent 先识别顺序、分支融合、层级模块、公式项、状态更新或区域比较等结构模式，再从模板目录选择表达方式；编译器把视觉意图展开为场景图。强调对象变化不会自动改变相机：一段讲解复用同一个固定 frame，复杂架构优先采用“固定局部讲解 → 折叠总图整合”，只有必读细节无法看清时才请求有理由的取景变化。

每个关键结论、数字、公式解释和技术关系都要求绑定来源；基于原文的推导性解读单独标记，交付前生成来源与视觉审计报告。

## 从一份原文到一场讲解

```mermaid
flowchart LR
    A["01 · 读取原文<br/>正文 / 公式 / 图表"] --> B["02 · 组织证据<br/>观点 / 结论 / 出处"]
    B --> C["03 · 选择表达<br/>模板 / world / 固定 frame"]
    C --> D["04 · 确定性编译<br/>布局 / 场景图 / camera"]
    D --> E["05 · 构建与验证<br/>交互网页 / 来源审计"]
```

事实和来源保存在 Paper IR，模板选择、固定 frame、字幕、步骤与强调保存在 Visual Intent；Scene IR 由编译器生成。修改后重新构建，播放器、画面、字幕与来源会回到同一份可验证的数据链。完整执行规范见 [SKILL.md](skills/paper-explainer/SKILL.md)。

<a id="delivery"></a>
## 交付的是一个可以带走的项目

```text
<paper-slug>-explainer/
├── open.cmd / open.command / open.sh  # 本地打开入口
├── site/                             # 构建好的静态网页
├── sources/                          # 下载原件统一归档
│   ├── original.pdf                  # 原始 PDF（获取成功时）
│   ├── arxiv/                        # LaTeX 源码包与解压素材（适用于论文）
│   ├── supplements/                  # 相关补充材料（按需）
│   └── manifest.md                   # 来源、相对路径与获取状态
├── content/                          # 原文、结构化内容与讲解稿
├── templates/                        # 模板能力目录
├── engine/                           # 确定性编译、布局与校验
├── project/                          # 可编辑的 React / TypeScript 源码
├── runtime/                          # 本地查看器与数据校验器
├── schemas/                          # 内容数据格式
└── reports/explanation-audit.md       # 来源覆盖与验证记录
```

分享给他人时，可以打包整个输出目录，通过启动脚本打开；也可以将 `site/` 部署到静态网站托管服务。网页所需的素材随构建产物提供，跳转外部原文时仍需联网。

默认在任务开始时的工作目录下创建项目，先初始化再下载。可下载的原文与相关素材统一保存在项目内的 `sources/`，不会散落到旁边的文件夹或默认下载目录。网页所需 PDF 和图片复制或提取到 `project/public/` 后参与构建，完整素材归档随整个项目保留。

<details>
<summary><strong>常见问题</strong></summary>

**这是一个独立聊天应用吗？**

它是供 Agent 使用的 Skill。Agent 负责阅读与编排内容，附带的运行时负责呈现讲解。

**只能处理论文或技术文档吗？**

可以处理论文、技术报告、产品文档、教程、文章、网页或正文。公式、流程、数据、图表等场景需要原文提供相应材料。

**需要配置其它设计或演示 Skill 吗？**

不需要。模板目录、通用视觉舞台、字幕、来源面板和启动器都已内置。

**扫描 PDF 或受限链接怎么办？**

提供可提取文本的 PDF、可访问链接或直接粘贴正文。PDF 文本提取可使用 Poppler 或 PyMuPDF；扫描件可能需要额外 OCR。

**能自动保证讲解没有错误吗？**

数据校验会检查结构与引用，来源审计帮助复核关键结论；内容准确性仍需结合原文检查，尤其是推导性解读。

</details>

<a id="development"></a>
## 开发与深入阅读

| 文档 | 内容 |
| :--- | :--- |
| [执行规范](skills/paper-explainer/SKILL.md) | 输入约定、生成流程与交付要求 |
| [环境与初始化](skills/paper-explainer/references/INIT.md) | 依赖与项目脚手架 |
| [文档内容模型](skills/paper-explainer/references/PAPER-IR.md) | 事实、结论和证据组织 |
| [视觉意图](skills/paper-explainer/references/VISUAL-INTENT.md) | world、固定 frame、步骤、强调和状态 |
| [模板选择](skills/paper-explainer/references/TEMPLATE-SELECTION.md) | 内容模式、候选与适用边界 |
| [生成场景图](skills/paper-explainer/references/SCENE-IR.md) | 编译后的 geometry 与执行快照 |
| [镜头与过渡](skills/paper-explainer/references/CAMERA-AND-MOTION.md) | camera、detail 和播放语义 |
| [运行时与交付](skills/paper-explainer/references/RUNTIME-AND-DELIVERY.md) | 构建、验证与打开方式 |
| [修改已有讲解](skills/paper-explainer/references/REVISION.md) | 内容更新与重新构建 |
| [开发与测试](skills/paper-explainer/references/DEVELOPMENT.md) | 编译器、舞台、校验器与回归测试 |

<details>
<summary><strong>本地开发：创建并构建示例项目</strong></summary>

在仓库根目录执行；`demo-explainer` 必须不存在或为空：

```bash
node skills/paper-explainer/scripts/scaffold-project.mjs ./demo-explainer --title "Demo document" --source "https://example.com/document.pdf"
node skills/paper-explainer/scripts/build-project.mjs ./demo-explainer
```

脚手架包含演示数据，以上命令用于验证运行时，不会自动读取示例 URL 并生成真实文档讲解。正式内容由 Agent 按 Skill 流程写入。

运行时源码位于 [`assets/project-template/`](skills/paper-explainer/assets/project-template/)。欢迎通过 [Issues](https://github.com/EclidFundgue/paper-explainer/issues) 提交问题和改进建议。

</details>

---

<p align="center"><strong>让每一步讲解，都有原文可循。</strong><br/><a href="LICENSE">MIT License</a></p>
