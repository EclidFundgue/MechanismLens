# 初始化与项目脚手架

MechanismLens 是自包含 Skill。构建网页需要 Node.js 18 或更高版本与 npm；Code Intake 需要 Python 3，URL 输入还需要 Git。

## 创建项目

将 Skill 目录记为 `SELF`，生成目录记为 `ROOT`。目标必须不存在或为空，脚手架不会覆盖已有文件。

Paper Lens：

```bash
node "$SELF/scripts/scaffold-project.mjs" "./<slug>-explainer" \
  --mode paper --title "<title>" --source "<paper-url>" --question "<question>"
```

Code Lens：

```bash
node "$SELF/scripts/scaffold-project.mjs" "./<slug>-explainer" \
  --mode code --title "<repository>" --source "<path-or-url>" --question "<question>"
```

Paper ↔ Code：

```bash
node "$SELF/scripts/scaffold-project.mjs" "./<slug>-explainer" \
  --mode paper-code --title "<title>" --source "<paper-url>" \
  --repository "<path-or-url>" --question "<question>"
```

## 来源目录

```text
sources/
├── original.pdf
├── original.html
├── arxiv/
├── supplements/
├── code/repository/       # URL 输入的 depth-one clone，保留 .git
└── manifest.md
```

URL 仓库不会进入 `project/public/` 或 `site/`。本地仓库默认不复制。用户文件只复制或读取，不移动。

## 内容与派生产物

Agent 维护：

```text
content/paper-ir.json      # Paper 模式
content/code-ir.json       # Code 模式
content/mechanism-ir.json
content/visual-intent.json
```

运行时生成：

```text
content/scene-ir.json
content/source-bundle.json
content/script.md
content/outline.md
site/
```

不要手改派生产物。事实错误改来源 IR，机制错误改 Mechanism IR，讲法或镜头错误改 Visual Intent，跨项目都会出现的能力问题才改 engine/runtime。
