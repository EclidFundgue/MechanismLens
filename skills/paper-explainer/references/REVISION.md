# REVISION.md — 可扩展性铁律 + 反馈迭代协议

本工作流默认「一步到位」把视频做完；但**做完不是终点**。用户看完预览 /
成片后最常提两类需求：

1. **展开**——「算法流程那部分太快，展开讲」；
2. **修改**——「开头那句改一下」「结果图的数字核对一下」「换个主题」。

本文件规定两件事：

- **Part A · 生成时的可扩展性铁律**：从写 digest 的第一行起，就把
  「以后要插入 / 修改」的成本压到最低。
- **Part B · 交付后的快速修改工作流**：收到反馈后如何定位、按最小改动
  面修改、同步真相源、增量重录。

> 「一步到位」只约束**首次生成**（不向用户确认）。修改是用户**主动**
> 发起的，属于 Phase 8，允许先定位、必要时最多问一个澄清问题。

---

## Part A · 生成时的可扩展性铁律

### A1. 真相源链固定，永不绕过

```
paper.md ──> digest.md ──> script.md ──> outline.md ──> narrations.ts ──> 章节 tsx ──> chapters.ts ──> 录屏
（原文）     （内容底账）   （文案/节拍）  （step 定位表）  （step 数 SSOT）  （视觉）      （注册顺序）
```

- 每层只做一件事；下游可以引用上游，**禁止**在上游没改时先改下游。
- `narrations.ts` 是 step 数的**唯一**来源（WVP 铁律）：章节代码不得
  写死总步数，一律用 `narrations.length` 或数据数组长度。
- `script.md` 的每个 `---` 块 = 一个 step；顺序与 `narrations.ts` 严格
  一致。只改 `narrations.ts` 会让稿子与成片漂移；只改 `script.md`
  则成片没变——**必须同改**。

### A2. 章节 = 独立可替换单元

- 一章一目录、独立 CSS 前缀、不跨章 import（WVP 已要求）。
- 章节 id / 目录名 / 组件名**生成后不再改名**——改名会让素材路径、
  录屏游标、`revisions.md` 记录全部失效。
- 文件夹编号只表示创建顺序，**允许留空隙**（如 `10-case-study/`）；
  播放顺序由 `chapters.ts` 注册顺序决定。中间插入新章不重命名旧章。

### A3. step 是唯一的动画时钟，也是唯一的定位坐标

- 每步画面是 `step` 的纯函数；揭示索引用 `activeIndex = step` 推出，
  禁止 `setInterval` / 定时器（WVP 铁律，同时保证插入 step 后自动对齐）。
- 视觉元素**数据驱动**：节点 / 柱 / 线 / 列表项写成数组
  （`NODES` / `BARS` / `LINES` / `ITEMS`），`step` 映射到数组下标。
  **插入一步 ≈ 数组插一项 + `narrations.ts` 插一条**，而不是重排
  一大段手写 JSX。
- 步数边界优先由 `narrations.length` / 数组长度推出，避免散落的魔法数
  （WVP 要求的 `if (step === N)` 仍要满足，但 N 的语义尽量来自数据）。

### A4. 三份文件互为定位表

| 想知道 | 查 |
|---|---|
| 某一步屏幕上是什么 | `outline.md` 该章「开发计划」第 N 行 |
| 某一步字幕文本 | `script.md` 第 N 个 `---` 块 / `narrations.ts` 第 N 项 |
| 某个数字 / 素材从哪来 | `digest.md` 对应维度 +「图表 / 素材清单」 |
| 之前改过什么 | `revisions.md` |

`outline.md` 的每章 step 列表 = 从「用户反馈里的说法」到「代码位置」的
翻译表：**先在这里定位，再动文件**。

### A5. 素材可复现

- `assets/` 命名与 digest 素材清单编号一致（`fig1.png` / `eq3.tex`）。
- digest 素材清单记录**取图参数**（PDF 页码 / bbox / dpi / LaTeX 源文件），
  换裁切 / 换分辨率时按参数重跑（命令见 `PAPER-ASSETS.md`）。
- 章节代码只引用 `public/assets/<稳定文件名>`，不内联 base64。

### A6. 留插入点，不提前实现

可扩展 ≠ 预留空章 / 引入配置系统。**只做两件事**：结构分层清晰 +
数据驱动。不要为「以后可能加」预先写没人看的代码或空 step。

### A7. 改动留痕

工作目录维护 `revisions.md`（追加式，**不删旧记录**；首次修改时创建）：

```markdown
# Revisions

## 2026-09-18 · 算法流程展开
- 反馈原话：「06 算法流程太快，展开讲训练循环」
- 改动：digest §5 补 2 条 → script 插 2 个节拍 → outline 06: 6→8 step
  → narrations.ts 插 2 条 → AlgorithmFlow.tsx NODES 插 2 节点 → STORAGE_KEY v5
- 重录：整片（00:00–12:40）
```

---

## Part B · 交付后的快速修改工作流

### B0. 触发与原则

- 触发：用户看完预览 / 成片，提出展开、修改、纠错、换素材、换主题等。
- 原则：**先定位，再动手；改最小面；沿链同步；改完自检 + 汇报**。
- 反馈模糊时（「实验部分有点赶」）：先给出你的定位判断，再动手；
  确实无法判断时最多问**一个**澄清问题。

### B1. 四步定位

1. **哪一章**：把用户说法映射到 `outline.md` 的章节（id + 标题）。
2. **哪几步**：在该章「开发计划」里找到 step 区间。
3. **哪一层**：文案（script）/ 内容（digest）/ 结构（章节或 step 增删）/
   视觉（tsx / css）/ 素材（assets）/ 主题（tokens）。
4. **历史**：翻 `revisions.md`，确认这次反馈是不是之前改过的地方
   （避免回归 / 冲突）。

### B2. 按需求类型走最小改动面

| 用户想要 | 修改顺序（先上游后下游） | bump STORAGE_KEY | 重录（默认整片） |
|---|---|---|---|
| 改一句话 / 语气 | `script.md` 对应 `---` 块 → `narrations.ts` 同索引 | 否 | 该章 |
| **展开某一节（加 step）** | digest 取料 → script 插 `---` → outline 插 step 行 → narrations 插条目 → 章节视觉插数据项 / 分支 | 是 | 该章起 |
| 压缩 / 删 step | 反向执行上一行 | 是 | 该章起 |
| 某一步太快 / 太慢 | 拆 step（展开）或调动画时长；**禁止**加 per-step hold | 拆 step 才 bump | 该章起 |
| 拆章 / 合章 / 加章 / 换序 | outline 章节表 → 新目录或 `chapters.ts` 注册顺序 | 是 | 受影响起 |
| 纯画面调整（布局 / 动效 / 配色微调） | 章节 `tsx` / `css`（走 token） | 否 | 该章 |
| 换图 / 换裁切 / 补素材 | `assets/` 重取 → `public/assets/` → digest 素材清单 | 否 | 该章 |
| 数字 / 事实纠错 | 回 `paper.md` 核对 → digest → script → narrations → 画面数字 | 否 | 该章 |
| 换主题 | 按 Phase 4.1 重选主题 → 换 `tokens.css` → 各章抽查 token 合规 + 纸面卡片 | 否 | 全部 |
| 节奏整体偏快 / 偏慢 | `App.tsx` 的 `estimateMs` 系数（字幕层唯一旋钮） | 否 | 全部 |

> **文案层铁律**：`script.md` 与 `narrations.ts` 必须同改。改完检查
> 三处 step 数一致：`script.md` 节拍数 == `outline.md` step 数 ==
> `narrations.length`（被改章）。

### B3. 展开一节的标准动作（最高频需求）

以「06 算法流程太快，展开讲」为例：

1. **定位**：`outline.md` 06 章，当前 6 step；对应 `digest.md` §5。
2. **取料**：从 digest §5（步骤序列 / 训练 vs 推理 / 复杂度 / 伪代码）
   和 `paper.md` Algorithm 1 选 2–3 个新 step 的内容。
3. **扩稿**：在 `script.md` 该章节拍之间插入 2–3 个 `---` 块
   （一 step 一句，≤ 40 字；叙事顺序不变）。
4. **更新 outline**：06 章 step 列表插入对应行，更新章末 step 数与
   顶部总步数。
5. **更新 narrations**：在 `narrations.ts` **同索引位置**插入字符串。
6. **更新视觉**：流程图为 `NODES` 数组时插入节点；伪代码高亮为行数组
   时插入行；`activeIndex = step` 映射自动顺延——**不要重写整章**。
7. **收尾**：bump `STORAGE_KEY` → `npx tsc --noEmit` →
   `?auto=1&reset=1` 全片过一遍（重点看插入点前后）→ 重录。
8. **留痕**：`revisions.md` 追加一条。

**判定标准**：展开后该章仍「一 step 一句」，动画时长 ≤ 字幕停留时长；
新 step 的信息来自 digest / paper，不是即兴发挥。

### B4. 修改后自检

- [ ] `npx tsc --noEmit` 通过？
- [ ] `narrations.length` == 章节代码用到的最大 step + 1？（全章）
- [ ] `script.md` 节拍数 == `narrations.ts` 长度 == `outline.md` step 数？（被改章）
- [ ] step 数 / 章节结构变化时 bump 了 `STORAGE_KEY`？
- [ ] `?auto=1&reset=1` 从第 1 页连续推进到底、字幕不空条？
- [ ] 被改章走一遍 CHAPTER-CRAFT 完工自检（视觉 / token / 反 AI 味）？
- [ ] `revisions.md` 已记录？

### B5. 重录策略

- **默认整片重录**：本工作流是静音自动推进（`?auto=1&reset=1` + Space），
  无人值守、无接缝，重录成本低。
- 只有片长很长且只改一章时，才考虑分段录：切到 `manual` 模式录该章，
  或临时注释 `App.tsx` 里 `autoStarted` 的重置 effect 并在录完后恢复；
  注意分段录的字幕节奏可能与原片有细微差异。
- 换主题 / 改 `estimateMs` / 改章节顺序 → **必须整片重录**。

### B6. 汇报模板

```
修改完成：<用户反馈一句话>
  定位    06 算法流程（6 → 8 step）
  改动    script +2 节拍 / outline 更新 / narrations +2 / NODES +2 / STORAGE_KEY v5
  自检    tsc ✓ / step 数一致 ✓ / 自动播放全片 ✓
  产物    预览：npm run dev；重录：?auto=1&reset=1
```

---

## Part C · 自检（每次修改后强制）

见 B4。**任一未过 → 先改完再汇报**；不允许「看起来没问题」放行。
