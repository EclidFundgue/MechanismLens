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

先固定本次任务的工作目录 `WORKSPACE`，再创建其中的 `<slug>-explainer/`；
用户明确指定输出目录时使用该位置。将生成目录的绝对路径记为 `ROOT`，
将 Skill 目录的绝对路径记为 `SELF`。必须先初始化再下载，所有原始素材写入
`ROOT/sources/`；不要以工具默认下载目录或后续命令的当前目录决定存放位置。

```bash
node "$SELF/scripts/scaffold-project.mjs" ./<slug>-explainer \
  --title "<论文标题>" --source "<原始链接>"
```

安全规则：目标必须不存在或为空。脚手架永不覆盖已有文件，也没有 `--force`
递归删除选项。

脚手架会创建 `sources/`。该目录集中保存下载原件，按需要添加：

```text
sources/
├── original.pdf           # PDF 原件；网页副本在 project/public/paper/original.pdf
├── original.html          # 可获取的原文网页
├── arxiv/                 # 原始源码包、解压目录及 MAIN_TEX
├── supplements/           # 相关补充材料及作者提供的原图
└── manifest.md            # 来源 URL、项目内相对路径、获取状态或失败原因
```

无需创建不存在的素材或空的子目录。解析中间文件如有需要，放在 `ROOT/work/`。
源文件在项目外时复制进来，保留用户原文件；若工具只能返回外部缓存文件，立即
复制到 `sources/`，后续处理仅引用项目内副本。网页引用的 PDF、图片从归档复制
或提取到 `project/public/`，不将全部源码包、补充材料放入静态网站。

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
sources/
project/public/assets/
project/public/paper/original.pdf
```

只有内置 scene 无法表达必要的论文语义时，才扩展 renderer；不要为了单篇论文
复制整套组件。
