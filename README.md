# Paper Explainer

**粘贴论文链接，直接得到可运行、可追溯到论文原文的交互式技术讲解。**

Paper Explainer 是一个自包含的 Agent Skill。它不依赖其它 presentation / design
skill，也不要求用户先准备脚手架。输入 arXiv、DOI、PDF、论文网页、本地 PDF
或粘贴文本，Skill 会自动完成论文解析、轻量 Paper IR、Scene IR、交互网页、
来源审计和静态构建。

```text
paper-explainer https://arxiv.org/abs/1706.03762
```

默认交付网页；明确说“要 MP4”时才在所有内容定稿后导出视频。

## 核心区别

- **论文原生场景**：架构执行、公式拆解、算法跟踪、消融比较、论文图检视，
  而不是把论文改写成通用卡片动画。
- **每一步有依据**：场景、claim、数字和公式都绑定 evidence；网页中的
  “论文依据”可直接打开在线原文或本地 PDF 对应页。
- **step-first**：手动浏览、自动播放、字幕和可选 MP4 共用同一份 Scene IR。
- **可回退的 Renderer 状态**：架构路径、公式展开、算法变量、消融基线和原图
  局部放大都由同一 step 快照驱动，前进、回退与跳转不会积累视觉状态。
- **自包含**：React/Vite 运行时、场景 renderer、字幕、Evidence Drawer、
  schema、校验器和启动器全部随 Skill 提供。
- **一次调用**：除输入不可访问外，中途不询问主题、篇幅、场景或输出目录。

## 产物结构

```text
<paper-slug>-explainer/
├── open.cmd                 # Windows 双击
├── open.command             # macOS 双击
├── open.sh                  # Linux / macOS 终端
├── site/                    # 已构建网页，用户查看这一份
├── content/
│   ├── paper.md
│   ├── paper-ir.json        # 论文事实、claim 与 evidence
│   ├── scene-ir.json        # 场景、step、字幕与 evidence 绑定
│   ├── script.md
│   ├── outline.md
│   └── revisions.md
├── project/                 # 可继续编辑的 React/TypeScript 源码
├── runtime/                 # 零依赖本地查看器与数据校验器
├── schemas/
└── reports/explanation-audit.md
```

### 一键打开

- Windows：双击 `open.cmd`
- macOS：双击 `open.command`
- Linux：运行 `./open.sh`

启动器优先使用 Node，缺少 Node 时可用 Python 回退；自动选择空闲端口并打开
浏览器。`npm run dev` 仅用于开发，不再是交付给用户的查看方式。

## 内置场景

| Scene type | 用途 |
|---|---|
| `concept` | 问题、贡献、前置概念与结论 |
| `architecture_execution` | 模块与数据流逐步执行 |
| `equation_walkthrough` | 公式及符号逐项解释 |
| `algorithm_trace` | 伪代码、训练或推理过程逐步运行 |
| `ablation_comparison` | 主结果、消融和 baseline 对比 |
| `figure_inspector` | 原论文图裁切、放大和区域标注 |

## 安装

需要 Node.js >= 18。没有外部 Skill 依赖。

```bash
git clone https://github.com/EclidFundgue/paper-explainer.git

# Claude Code
cp -r paper-explainer/skills/paper-explainer ~/.claude/skills/

# Codex / 通用 Agent Skill 目录
cp -r paper-explainer/skills/paper-explainer ~/.agents/skills/
```

opencode 用户也可以复制到 `~/.config/opencode/skills/`。

## 工作流

```text
论文输入
  ↓
原文 / LaTeX / PDF 素材
  ↓
Paper IR：claim、贡献、模块、公式、实验、evidence
  ↓
Scene IR：场景类型、step、字幕、focus、evidence
  ↓
内置 Runtime
  ↓
构建 site/ + 数据审计 + 一键启动脚本
```

详细执行规范见 [`SKILL.md`](skills/paper-explainer/SKILL.md)。

## 开发运行时

```bash
node skills/paper-explainer/scripts/scaffold-project.mjs ./demo-explainer \
  --title "Demo paper" --source "https://example.com/paper.pdf"

node skills/paper-explainer/scripts/build-project.mjs ./demo-explainer
```

生成后双击对应平台的打开脚本。开发运行时本身位于
`skills/paper-explainer/assets/project-template/`。

## License

[MIT](LICENSE)
