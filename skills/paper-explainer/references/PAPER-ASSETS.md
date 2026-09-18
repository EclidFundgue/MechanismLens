# PAPER-ASSETS.md — 从论文提取素材（原图 / 公式 / 原文）并放进网页

目的：**讲得准**。允许并鼓励直接使用论文素材——原图、公式、原文摘录，
与 SVG 重绘混用。本文件规定：从哪取、怎么取、怎么用。

素材统一落在工作目录的 `assets/`，命名与 digest 的「图表 / 素材清单」
编号一致：`fig1.png` / `tab2.png` / `eq3.tex` / `quote1.md`。

---

## 0. 素材策略决策（先选路径，再动手）

| 内容 | 首选 | 备选 |
|---|---|---|
| 架构图 / 流程图（模块清晰、≤ 10 个、连线简单） | SVG 重绘（逐模块点亮） | 原图 + 高亮框 |
| 复杂系统总览 / 大图 / 连线密集 | 原图（裁切 + 局部放大） | SVG 简化重绘 |
| 作者示意图比你能重绘得更清楚 | **原图**（准确优先） | SVG 简化重绘 |
| 定性结果（照片 / 渲染 / 对比图） | **原图**（SVG 无法忠实复现） | — |
| 结果表格（小） | SVG / flex 重绘 | — |
| 结果表格（大而密） | 原图裁切 + 行高亮 | SVG 重绘 |
| 公式 | **KaTeX 渲染**（推荐） | 原图裁切 / LaTeX→SVG |
| 关键定义 / 作者原话 | 原文引用块 | 改写 |
| 封面 / 概念插画 / 氛围图 | SVG 自绘或 `gpt-image-2` | 占位 |

原则：**能重绘且重绘更好讲 → 重绘；重绘会失真或成本过高 → 用原图。**
唯一禁止的是用图像生成模型画结构图（会画错）。

---

## 1. arXiv LaTeX 源码（首选素材源）

输入是 arXiv 链接 / ID 时，Phase 0 先取源码：

```bash
bash "$SELF/scripts/fetch-arxiv.sh" <arxiv-url-or-id> ./paper-src
```

脚本下载 `https://arxiv.org/e-print/<id>` 并解包（兼容 tar.gz / 单 .tex.gz /
单 .tex），产出：

```
paper-src/
├── source.tar.gz   # 原始下载
├── src/            # .tex / .bbl / figures/ ...
└── MAIN_TEX        # 识别到的主 .tex 相对路径
```

从源码取什么：

- **公式**：`.tex` 里的 `equation` / `align` / `gather` 环境原文——最准，
  无 OCR 错误。连同 `\newcommand` 自定义宏一起抄走（KaTeX 需要，见 §3）。
- **图**：`\includegraphics{...}` 指向的 `figures/*.pdf|png|jpg|eps`。
  矢量 PDF 转 SVG 或高分辨率 PNG：

  ```bash
  pdftocairo -svg paper-src/src/figures/fig1.pdf assets/fig1.svg
  pdftocairo -png -r 300 paper-src/src/figures/fig1.pdf assets/fig1.png
  ```

  EPS 先转 PDF（`epstopdf` 或 `magick`），再走上面。**TikZ / PGF 内联图**
  在 .tex 里没有独立文件——回 PDF 按区域渲染（§2），或按结构用 SVG 重绘。
- **原文**：abstract、贡献列表、定理 / 定义，直接复制到 `paper.md` /
  `quote*.md`，不用 OCR。
- **表格**：`tabular` 环境 → 数字来源（重绘时逐个核对）。
- **图注**：`\caption{}` → 画面文案。

老论文可能没有 e-print 源码 → 回退 HTML / PDF 路径（§2）。

---

## 2. PDF 抽取

**文本**：

```bash
pdftotext -layout paper.pdf paper.md          # poppler
# 或 python3 -m pip install pymupdf 后用 fitz 读取
```

**内嵌位图**（扫描图 / 照片 / 渲染图）：

```bash
pdfimages -png -f 9 -l 9 paper.pdf assets/fig   # 只抽第 9 页
```

**矢量图 / 公式区域**（推荐 pymupdf，按 bbox 高 DPI 渲染）：

```python
import fitz  # pymupdf
doc = fitz.open("paper.pdf")
page = doc[4]  # 第 5 页（0-based）
# 先看这张页上有哪些图，拿 bbox（pt）
for info in page.get_image_info():
    print(info["bbox"], info["width"], info["height"])
# 按区域渲染 300dpi（bbox 可略向外扩 4–8pt 留白）
rect = fitz.Rect(72, 100, 540, 400)
page.get_pixmap(clip=rect, dpi=300).save("assets/fig1.png")
```

找不准坐标时，先低分辨率渲染整页对一眼：

```bash
pdftoppm -png -r 100 -f 5 -l 5 paper.pdf /tmp/page5
```

**整页矢量转 SVG**（图很复杂、想保留矢量）：

```bash
pdftocairo -svg -f 5 -l 5 paper.pdf /tmp/page5.svg
```

然后在 SVG 里删掉正文元素 / 收紧 `viewBox`，只留图区域；或直接改用
上面的 bbox 渲染。

**裁白边**：

```bash
magick assets/fig1.png -trim +repage assets/fig1.png
```

---

## 3. 公式

**首选 KaTeX**（清晰、随主题换色、可随 step 高亮）：

```bash
cd presentation && npm i katex
```

```tsx
// src/components/Formula.tsx
import katex from "katex";
import "katex/dist/katex.min.css";

export function Formula({ tex, block = false }: { tex: string; block?: boolean }) {
  return (
    <span
      className={block ? "formula-block" : "formula-inline"}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, {
          displayMode: block,
          throwOnError: false,
          macros: { "\\R": "\\mathbb{R}" }, // 从主 .tex 抄来的自定义宏
        }),
      }}
    />
  );
}
```

```css
.formula-block .katex { color: var(--text); font-size: 40px; }
.formula-inline .katex { color: var(--text); }
```

- **公式字体保留**：KaTeX 数学字体（含 `\mathcal` 等花体字形）不适用
  「字体可读性铁律」（SKILL.md 跨阶段铁律 §2）。公式 CSS 只调 `color` /
  `font-size` / 间距，**禁止给 `.katex` 或其子元素设 `font-family`**；
  `katex.min.css` 从 npm 包引入（`node_modules`），不要复制进 `src/`
  （它内部不含 `cursive`，不会触发字体自检的误报）。
- 公式内容**以 LaTeX 源为准**；没有源码时对照 PDF 逐字符核对，别凭印象。
- 主 .tex 的 `\newcommand` 收进 `macros`，否则渲染报错。
- 极复杂 / KaTeX 不支持的公式 → 原图裁切（§2）或 LaTeX→SVG。

**备选：原图公式**——从 PDF bbox 渲染 PNG 或从源码转 SVG；放进纸面
卡片（§5）。适用于符号极多、或论文用特殊字体的公式。

---

## 4. 原文摘录

- 只取**关键句**（≤ 2 行）：问题定义、核心假设、作者对贡献的总结。
- 引用块样式：左侧 `var(--accent)` 竖线 + `var(--surface-2)` 底：

  ```css
  .quote {
    border-left: 4px solid var(--accent);
    background: var(--surface-2);
    padding: 24px 32px;
    font-size: 32px;
  }
  ```

- 注明出处（`§3.2` / `Fig. 4` / `Tab. 1`）。
- 语言：英文原句可保留 + 字幕翻译；或按 `narration.language` 直接翻译
  （引用块保留原文更显准确，二者择一）。

---

## 5. 放进网页

- 文件复制到 `presentation/public/assets/`；代码里用 BASE_URL 拼路径：

  ```tsx
  <img src={`${import.meta.env.BASE_URL}assets/fig1.png`} alt="Fig. 1" />
  ```

- **纸面卡片**：论文图多为白底。暗色主题下包一层浅底容器，不反色、
  不加滤镜：

  ```css
  .paper-card {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 1px 0 var(--rule);
  }
  ```

- **尺寸**：一图一文案时图宽 ≤ 可用区（约 1100px）；全宽图高 ≤ 620px
  （1920×1080 舞台，见 `SVG-DIAGRAMS.md` §1）。
- **分辨率**：位图 ≥ 显示尺寸的 2 倍（300dpi 渲染通常够）。
- **揭示**：原图也必须由 `step` 驱动——高亮框 / 箭头 / 局部放大 /
  逐块裁剪，禁止静态贴图一屏到底（与 SVG 图同一原则）。
- 命名与 digest 素材清单一一对应，章节代码注释里可写 `Fig. 1`。
- **可复现**：取图时把页码 / bbox / dpi / LaTeX 源文件记进 digest 素材
  清单；Phase 8 用户要换裁切 / 换分辨率时按参数重跑，不凭印象重找。

---

## 6. 学术规范

- 画面角落注明 `Fig. 1 · <论文短名>`；原图**不整页搬运**，只取所需区域。
- 引用原文加引号；图 / 公式保留作者原编号。
- 论文有明确许可证（arXiv 常见 CC-BY）时按许可证署名；不确定时保留
  出处标注即可。

---

## 7. 自检

- [ ] 素材策略是否按 §0 选对（该重绘的重绘、该原图的原图）？
- [ ] 原图是否注明编号与来源？裁切是否干净（无页码 / 页眉 / 大块白边）？
- [ ] 公式是否来自 LaTeX 源或逐字符核对过？自定义宏是否处理？
- [ ] 暗色主题下原图是否在纸面卡片上、清晰可读？
- [ ] 素材文件是否复制进 `presentation/public/assets/` 且路径用 BASE_URL？
- [ ] 原图是否也有 `step` 驱动的揭示 / 高亮，而不是静态贴图？
- [ ] 素材清单与 digest 是否对得上（编号、用于章节）？
- [ ] 取图参数（页码 / bbox / dpi / 源文件）是否记进 digest，便于日后重取？
