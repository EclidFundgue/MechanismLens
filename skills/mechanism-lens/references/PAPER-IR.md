# Paper IR 2.0

Paper IR 是论文事实层。它保存论文身份、evidence、可展示结论、技术对象和对象间关系，不包含布局、镜头或播放步骤。Schema：`schemas/paper-ir.schema.json`。

## 顶层结构

```json
{
  "schemaVersion": "2.0",
  "paper": { "id": "paper.attention", "title": "Attention Is All You Need", "originalUrl": "https://arxiv.org/abs/1706.03762" },
  "evidence": [],
  "claims": [],
  "contributions": [],
  "concepts": [],
  "modules": [],
  "relations": [],
  "equations": [],
  "algorithms": [],
  "experiments": [],
  "figures": []
}
```

ID 使用字母、数字、点、下划线和连字符；交付后保持稳定。先建立 evidence，再建立引用它的 grounded item。

## Evidence

```json
{
  "id": "evidence.eq1",
  "label": "Scaled dot-product attention",
  "kind": "equation",
  "section": "§3.2.1",
  "page": 4,
  "anchor": "S3.SS2.SSS1",
  "excerpt": "Attention(Q,K,V)=...",
  "confidence": "direct"
}
```

`page` 是 PDF 阅读器的 1-based 页码。`direct` 表示论文直接陈述；`derived` 表示系统根据论文计算、合并或教学重命名。derived evidence 的 excerpt 说明推导依据，不写成作者原话。

## 技术对象

所有 grounded item 至少包含 `id/title/evidenceIds`，核心解释写在 `text` 或 `summary`。按实际内容增加这些领域字段：

- `modules`：输入、输出、角色、适用阶段和父模块；
- `relations`：`from/to`、端口、关系类型及 `training/inference/both`；
- `equations`：完整 `tex`、稳定 term ID、符号解释；
- `algorithms`：稳定伪代码行、解释和教学执行例；
- `experiments`：指标、单位、方向、真实值、变体和 baseline；
- `figures`：素材路径、原始尺寸、caption 和可复用 region。

Visual Intent 的视觉分组不自动成为论文声称的模块层级。模板也不能为了填槽位补造关系。

## 来源覆盖

数字、百分比、年份、比较判断、公式与符号、模块输入输出、训练/推理顺序、作者结论和限制必须有 evidence。允许标为 derived 的典型情况包括表格差值、跨段落归纳和教学重命名。

原文跳转顺序：evidence URL → 本地 PDF 页 → 在线 PDF 页 → 原文 anchor → 论文主页与人工 locator。本地 PDF 路径固定为 `paper/original.pdf`。

## 自检

- 所有 ID 唯一，引用存在；
- 关键关系与数值有 evidence；
- direct 与 derived 不混淆；
- page、URL 和 anchor 实际可定位；
- Paper IR 不含模板、坐标、相机或字幕。
