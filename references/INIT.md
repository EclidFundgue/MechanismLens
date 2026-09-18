# INIT.md — 初始化与持久化配置

paper-explainer 的原则：**能配置一次的事，不重复问**。

- **首次运行**：跑一次初始化 —— 依赖自检（缺失的 skill 经确认可自动
  安装）+ 一次性配置问卷，落盘到用户配置。
- **之后每次运行**：先读配置，直接应用；主题 / 素材 / 开发模式不再提问。
- **依赖检查**：每次开工前快速自检；发现依赖 skill 缺失 → 问用户是否
  自动安装。

本文件是初始化的唯一规格。SKILL.md 的「Phase -1」指向这里。

---

## 1. 配置文件

| 项 | 值 |
|---|---|
| 默认路径 | `~/.config/paper-explainer/config.json` |
| 路径覆盖 | 环境变量 `PAPER_EXPLAINER_CONFIG` |
| 读写工具 | `scripts/init-config.sh`（校验字段后写入；也可直接编辑 JSON） |

配置**不放 skill 目录**（那是 git 仓库，避免脏工作区）；它是**用户级**的，
换项目目录也生效。

### 字段表（version 1）

| 字段 | 取值 | 默认 | 作用 |
|---|---|---|---|
| `theme.mode` | `auto` / `fixed` / `ask` | `auto` | 网页主题怎么定：每次自动挑 / 固定一个 / 每次问 |
| `theme.id` | 主题 id（如 `paper-press`） | `""` | `fixed` 时使用；从 WVP `themes/*/theme.json` 读，不硬编码 |
| `devMode` | `A` / `B` / `C` | `B` | 开发模式：逐章确认 / 顺序 / 并行（subagent） |
| `materials.cover` | `svg` / `generate` / `placeholder` / `ask` | `svg` | 封面 / 概念图怎么来：SVG 重绘 / `gpt-image-2` 生成 / 占位 / 每次问 |
| `narration.language` | `auto` / `zh` / `en` | `auto` | 口播语言；`auto` = 中文论文用中文，英文论文默认中文讲解 |
| `recording.autoAdvance` | `true` / `false` | `true` | 录屏时 `?auto=1` 自动推进 / 手动点击 |
| `dependencies.wvpSource` | git URL 或本地路径 | ConardLi/garden-skills | 自动安装 WVP 的来源 |
| `dependencies.dtfSource` | git URL 或本地路径 | Leonxlnx/taste-skill | 自动安装 DTF 的来源 |

> 论文图表策略（架构 / 流程 / 结果图一律 SVG 重绘）是**固定铁律**，
> 不进配置；`materials.cover` 只管封面 / 氛围图这类非图表素材。

---

## 2. 首次初始化流程

### 2.1 依赖自检

```bash
bash "$SELF/scripts/check-deps.sh"
```

报告里 `[OK] / [MISS] / [OPT-MISS] / [WARN]` 一眼可读，退出码
`1` = 必需项缺失。按缺失类型处理：

| 缺失 | 处理 |
|---|---|
| 依赖 skill（WVP / DTF） | **列给用户 + 问一次「是否自动安装」**；同意后见 §2.2；拒绝见 §2.3 降级 |
| Node / npm / git | 必需；给出安装命令，用户确认后执行（agent 按平台选 `apt` / `brew` / nvm 等） |
| ffmpeg / 浏览器 / pdftotext | 推荐；缺失可先继续，但要在开工前告知影响（录屏 / PDF 解析） |

### 2.2 自动安装依赖 skill（用户确认后）

```bash
bash "$SELF/scripts/install-deps.sh"                 # 装缺失的 WVP + DTF
bash "$SELF/scripts/install-deps.sh" --skills=wvp    # 只装 WVP
bash "$SELF/scripts/install-deps.sh" --wvp-src=<url|path> --dtf-src=<url|path>
```

- 默认装到 `~/.config/opencode/skills/`（`--skills-dir` 可覆盖）。
- 脚本用 sparse clone 只拉子目录，装完校验 `SKILL.md` 的 frontmatter
  `name`。
- **装完提醒用户：重启 opencode 才会加载新 skill。**

### 2.3 用户拒绝安装时的降级

| 缺什么 | 降级方式 |
|---|---|
| WVP | **不能降级**（它是骨架）。让用户提供已有路径，或终止并说明原因 |
| DTF | 降级：主题审美改用 WVP `references/THEMES.md` 自带规范；Phase 7 终审改用 WVP `CHAPTER-CRAFT.md` 的 ANTI-AI 清单。在汇报里注明「本次无 DTF 终审」 |

### 2.4 配置问卷（一次问完）

用 `question` 工具一次问 4 题（推荐项放第一个并标注），然后把答案写进配置：

```bash
bash "$SELF/scripts/init-config.sh" \
  --theme-mode=auto \
  --dev-mode=B \
  --cover=svg \
  --lang=auto \
  --auto-advance=true
```

- `--theme-mode=fixed` 时必须给 `--theme-id=<id>`；**列主题清单前先读
  WVP `themes/*/theme.json`**（动态列，不硬编码）。
- 配置已存在时脚本会拒绝覆盖（保护已有配置）；重配加 `--force`。
- 写完后给用户看路径 + 内容摘要，并告诉他以后说「重配 paper-explainer」
  就能改。

### 2.5 汇报模板

```
首次初始化完成：
  配置    ~/.config/paper-explainer/config.json
  主题    auto（每次按论文自动挑，不再问）
  模式    B（第 1 章后顺序开发）
  封面    svg
  语言    auto（英文论文默认中文讲解）
  依赖    WVP ✓ / DTF ✓ / ffmpeg ✓ / 浏览器 ✗（录屏前需安装）

以后直接开工，不再重复问这些；想改说一声「重配 paper-explainer」。
```

---

## 3. 之后每次运行

1. **读配置**：`bash "$SELF/scripts/init-config.sh" --show`（或直接读 JSON）。
   - 有配置 → 一行汇报「已加载配置：主题=… 模式=… 封面=… 语言=…」，继续。
   - 无配置 → 跑 §2 首次初始化。
2. **依赖快速自检**：`bash "$SELF/scripts/check-deps.sh"`；有 `[MISS]`
   就按 §2.1 处理（skill 缺失仍要先问用户）。
3. **应用配置**（各 Phase 生效点见下表），不再重复提问。

| 配置 | 生效点 |
|---|---|
| `theme` | Phase 4.1 —— `fixed` 直接用 `theme.id`（不存在则警告并回退 auto）；`auto` 由 agent 按论文气质挑最佳并**汇报选择**；`ask` 才问用户 |
| `devMode` | Phase 4.4 / Phase 5 —— A 逐章验收 / B 顺序 / C subagent 并行 |
| `materials.cover` | Phase 4.1 —— `svg` 自绘封面；`generate` 用 `gpt-image-2`（没装则回退 svg 并说明）；`placeholder` 占位；`ask` 才问 |
| `narration.language` | Phase 2 —— `auto` 按原文语言；`zh` / `en` 强制 |
| `recording.autoAdvance` | Phase 6 —— true 走 `?auto=1&reset=1`；false 手动点击录屏 |

> **单次覆盖**：用户当场说「这次用 X 主题 / 这次并行」→ 只影响本次，
> **不写配置**；除非用户明确说「以后都这样」，才 `init-config.sh --force`
> 更新。

---

## 4. 改配置 / 重置

| 需求 | 做法 |
|---|---|
| 看当前配置 | `init-config.sh --show` |
| 改某一项 | 直接编辑 `~/.config/paper-explainer/config.json`，或 `init-config.sh --force …` 全量重写 |
| 恢复默认 | `init-config.sh --reset`，下次运行重新初始化 |
| 用户说「重配」 | 重跑 §2.4 问卷（可跳过依赖自检），`--force` 写入 |

---

## 5. 非交互 / 自动化模式

没有真人可确认时：

- **不擅自安装任何东西**（skill / 系统工具都不行）；缺依赖就汇报 +
  走 §2.3 降级，WVP 缺失则终止。
- 配置存在 → 直接用；不存在 → 用默认值（`theme=auto`、`devMode=B`、
  `cover=svg`、`lang=auto`、`autoAdvance=true`），并在最终汇报的
  「我替你做了哪些决定」里列出来。
- 所有被跳过的提问点，默认动作沿用 SKILL.md 的非交互表。

---

## 6. 自检

- [ ] 每次运行开始是否先读了配置？有配置时是否**没有**再问主题 / 模式 / 封面 / 语言？
- [ ] 缺失依赖 skill 时是否**先征得用户同意**才安装？
- [ ] 装完是否提醒重启 opencode？
- [ ] 单次覆盖是否没有污染持久配置？
- [ ] `fixed` 主题不存在时是否警告并回退，而不是硬跑？
