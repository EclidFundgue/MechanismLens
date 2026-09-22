# 论文素材

素材服务于准确解释，不服务于装饰。下载前先按 `INIT.md` 创建项目，固定绝对
路径 `ROOT`。下载原件统一放在 `ROOT/sources/`；网页素材放在
`ROOT/project/public/assets/`，网页 PDF 副本固定放在
`ROOT/project/public/paper/original.pdf`。下文命令中的 `ROOT` 不随工作目录变化。

能获取的原文 PDF、LaTeX 包、相关补充材料和原图应实际保存，不能仅记录 URL。
下载命令必须指定项目内的输出文件名，解压也必须指定项目内目录；不要使用
`./paper-src`、浏览器默认下载目录或系统临时目录。归档解压前检查成员路径及
链接，拒绝绝对路径、`..` 越界路径或指向项目外的链接。
本地输入保留原件并复制；工具返回的外部缓存文件先复制到 `sources/` 再处理。

维护 `sources/manifest.md`：每项列出来源 URL（本地输入注明原路径）、项目内
相对路径、获取状态。下载失败或只能在线访问时写明原因并继续可用的解析路径；
不把错误响应页面当 PDF 或源码。重复运行保留已有文件，不静默覆盖或删除素材。

## 选择策略

| 内容 | 首选 |
|---|---|
| 简单架构 / 数据流 | 视觉意图的 `group/node/relation`，选择合适结构模板 |
| 复杂架构总览 | `image` 原语 + 区域，必要时增加详情视图 |
| 定性结果 / 照片 / 渲染 | `figure_region_exploration` + 原图区域 |
| 小型结果 / 消融表 | `compare_variant` + `chart` 原语 |
| 大型密集表格 | 原图裁切 + 标注 |
| 公式 | `equation_derivation` + `equation` 原语 + KaTeX |
| 作者定义 / 结论 | 证据抽屉中的摘录 |

禁止用图像生成模型重画技术结构或实验结果。

## arXiv LaTeX 源码

```bash
bash "$SELF/scripts/fetch-arxiv.sh" <网址或编号> "$ROOT"
```

第二个参数是已初始化的项目根目录，必须提供。脚本固定写入
`sources/arxiv/source.tar.gz`、`sources/arxiv/src/` 和 `sources/arxiv/MAIN_TEX`；
若目录已存在则停止，先检查是否可复用。失败下载的重试使用项目内新的明确路径，
不要改到外部目录。该脚本只获取源码，PDF 另存为 `sources/original.pdf`。

从源码优先提取：

- `equation` / `align` 环境；
- `\newcommand` 自定义宏；
- `\includegraphics` 文件；
- 图片说明；
- 表格数字；
- 摘要、定义和作者贡献原句。

## PDF 处理

正文：

```bash
pdftotext -layout "$ROOT/sources/original.pdf" "$ROOT/content/paper.md"
```

位图：

```bash
pdfimages -png -f 9 -l 9 "$ROOT/sources/original.pdf" "$ROOT/project/public/assets/fig"
```

矢量页或高分辨率渲染：

```bash
pdftocairo -png -r 300 -f 5 -l 5 "$ROOT/sources/original.pdf" "$ROOT/project/public/assets/page5"
pdftocairo -svg -f 5 -l 5 "$ROOT/sources/original.pdf" "$ROOT/project/public/assets/page5.svg"
```

只使用需要解释的区域，不把整页论文当图片贴进场景。取图参数（页码、边界框、
分辨率、LaTeX 文件）记录在对应图片依据项的扩展字段中。

## 路径

场景 IR 使用构建后相对路径：

```json
{
  "src": "assets/fig2.png"
}
```

不要写 `project/public/...`，不要写绝对路径，也不要内联大体积 base64。

## 原论文 PDF

确认 `sources/original.pdf` 是有效 PDF，再复制到
`project/public/paper/original.pdf`。更新原件后也要更新此副本并重新构建。
仅在发布副本存在时设置：

```json
{
  "localPdfPath": "paper/original.pdf"
}
```

证据中的 `page` 会跳到构建后的 `site/paper/original.pdf#page=N`。抽查
页码时以浏览器 PDF 查看器显示页序为准。

## 公式

运行时自带 KaTeX。公式放进公式对象的 `tex`，分解项放 `parts`。复杂宏
先展开成 KaTeX 可识别写法；不能可靠重建时使用论文公式截图，并在证据
中保留公式编号和页码。

不要给 `.katex` 或其子元素覆盖 `font-family`。

## 自检

- 图像清晰度至少为显示尺寸的两倍；
- 原图没有反色或生成式修改；
- 数字与表格逐项核对；
- 替代文本、图片说明、图片编号齐全；
- 每份素材都有论文 IR 证据；
- 构建后的路径可打开。
- 下载原件及解压文件都在 `ROOT/sources/` 中，清单路径可定位；
- PDF 原件与发布副本一致，源码包和无关补充材料没有进入 `site/`。
