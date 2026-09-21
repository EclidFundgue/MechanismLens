# 初始化与项目脚手架

Paper Explainer 是自包含 Skill。唯一必需的构建依赖是 Node.js >= 18 与 npm；
不检查或安装其它 skill。

## 环境检查

```bash
bash "$SELF/scripts/check-deps.sh"
```

必需项：

- Node.js >= 18；
- npm。

推荐但可降级：

- `curl` / `wget`：下载 arXiv 源码；
- `pdftotext` 或 PyMuPDF：PDF 正文；
- `pdftocairo` / `pdfimages`：论文图；
- ffmpeg：仅可选视频导出。

## 配置

配置默认位于 `~/.config/paper-explainer/config.json`，当前版本为 v3：

```json
{
  "version": 3,
  "theme": "paper-dark",
  "narration": { "language": "auto" },
  "playback": { "autoAdvance": false },
  "recording": { "enabled": false }
}
```

旧 v1/v2 配置会由 `init-config.sh --ensure` 压缩迁移；WVP、DTF、devMode、
cover 等旧字段会被删除，因为它们不再参与运行。

## 创建项目

```bash
node "$SELF/scripts/scaffold-project.mjs" ./<slug>-explainer \
  --title "<论文标题>" --source "<原始链接>"
```

安全规则：目标必须不存在或为空。脚手架永不覆盖已有文件，也没有 `--force`
递归删除选项。

## 脚手架所有权

以下文件由运行时维护，通常不按论文重复改：

```text
project/src/components/
project/src/lib/
project/src/App.tsx
project/src/styles.css
runtime/
schemas/
open.cmd / open.command / open.sh
```

每篇论文主要只改：

```text
content/paper-ir.json
content/scene-ir.json
content/*.md
project/public/assets/
project/public/paper/original.pdf
```

只有内置 scene 无法表达必要的论文语义时，才扩展 renderer；不要为了单篇论文
复制整套组件。
