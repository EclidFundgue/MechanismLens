# 初始化与项目脚手架

MechanismLens 是自包含技能。构建网页需要 Node.js 18 或更高版本与 npm；代码采集需要 Python 3，URL 输入还需要 Git。

## 创建项目

将技能目录记为 `SELF`，生成目录记为 `ROOT`。目标必须不存在或为空，脚手架不会覆盖已有文件。

论文讲解：

```bash
node "$SELF/scripts/scaffold-project.mjs" "./<短标识>-explainer" \
  --mode paper --title "<标题>" --source "<论文网址>" --question "<问题>"
```

代码讲解：

```bash
node "$SELF/scripts/scaffold-project.mjs" "./<短标识>-explainer" \
  --mode code --title "<仓库名称>" --source "<路径或网址>" --question "<问题>"
```

论文与代码联动：

```bash
node "$SELF/scripts/scaffold-project.mjs" "./<短标识>-explainer" \
  --mode paper-code --title "<标题>" --source "<论文网址>" \
  --repository "<路径或网址>" --question "<问题>"
```

## 来源目录

```text
sources/
├── original.pdf
├── original.html
├── arxiv/
├── supplements/
├── code/repository/       # URL 输入的浅层克隆，保留 .git
└── manifest.md
```

URL 仓库不会进入 `project/public/` 或 `site/`。本地仓库默认不复制。用户文件只复制或读取，不移动。

## 内容与派生产物

自动化代理维护：

```text
content/paper-ir.json      # 论文模式
content/code-ir.json       # 代码模式
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

不要手改派生产物。事实错误改来源 IR，机制错误改机制 IR，讲法或镜头错误改视觉意图，跨项目都会出现的能力问题才改 `engine/` 或 `runtime/`。
