# 论文素材

素材服务于准确解释，不服务于装饰。网页素材统一放在
`project/public/assets/`，原论文 PDF 固定放在
`project/public/paper/original.pdf`。

## 选择策略

| 内容 | 首选 |
|---|---|
| 简单架构 / 数据流 | `architecture_execution` 数据重绘 |
| 复杂架构总览 | 原图 + `figure_inspector` callout |
| 定性结果 / 照片 / 渲染 | 原图 + `figure_inspector` |
| 小型结果 / 消融表 | `ablation_comparison` |
| 大型密集表格 | 原图裁切 + callout |
| 公式 | `equation_walkthrough` + KaTeX |
| 作者定义 / 结论 | Evidence Drawer excerpt |

禁止用图像生成模型重画技术结构或实验结果。

## arXiv LaTeX

```bash
bash "$SELF/scripts/fetch-arxiv.sh" <url-or-id> ./paper-src
```

从源码优先提取：

- equation / align 环境；
- `\newcommand` 自定义宏；
- `\includegraphics` 文件；
- caption；
- table 数字；
- abstract、定义和作者贡献原句。

## PDF

正文：

```bash
pdftotext -layout paper.pdf content/paper.md
```

位图：

```bash
pdfimages -png -f 9 -l 9 paper.pdf project/public/assets/fig
```

矢量页或高分辨率渲染：

```bash
pdftocairo -png -r 300 -f 5 -l 5 paper.pdf project/public/assets/page5
pdftocairo -svg -f 5 -l 5 paper.pdf project/public/assets/page5.svg
```

只使用需要解释的区域，不把整页论文当图片贴进场景。取图参数（页码、bbox、
dpi、LaTeX 文件）记录在对应 figure grounded item 的扩展字段中。

## 路径

Scene IR 使用构建后相对路径：

```json
{
  "src": "assets/fig2.png"
}
```

不要写 `project/public/...`，不要写绝对路径，也不要内联大体积 base64。

## 原论文 PDF

保存本地 PDF 后同时设置：

```json
{
  "localPdfPath": "paper/original.pdf"
}
```

Evidence 中的 `page` 会跳到构建后的 `site/paper/original.pdf#page=N`。抽查
页码时以浏览器 PDF viewer 显示页序为准。

## 公式

运行时自带 KaTeX。公式放进 `payload.tex`，分解项放 `payload.parts`。复杂宏
先展开成 KaTeX 可识别写法；不能可靠重建时使用论文公式截图，并在 evidence
中保留 equation 编号和页码。

不要给 `.katex` 或其子元素覆盖 `font-family`。

## 自检

- 图像清晰度至少为显示尺寸的两倍；
- 原图没有反色或生成式修改；
- 数字与表格逐项核对；
- alt、caption、figure 编号齐全；
- 每份素材有 Paper IR evidence；
- 构建后的路径可打开。
