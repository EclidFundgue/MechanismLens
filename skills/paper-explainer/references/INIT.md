# INIT.md — 初始化与持久化配置

paper-explainer 的原则：**能配置一次的事，不重复问；不能配置的事，
也不问**。整条流水线一步到位：

- **首次运行**：依赖自检（缺失自动安装）+ **自动写入推荐默认配置**
  （不再发问卷）。
- **之后每次运行**：先读配置，直接应用；主题 / 素材 / 开发模式不再提问。
- **依赖检查**：每次开工前快速自检；发现依赖 skill / 系统工具缺失 →
  **自动安装**，失败才降级。

用户想改配置：预先写 `CONFIG`，或事后说「重配 paper-explainer」
（见 §4）。本文件是初始化的唯一规格。SKILL.md 的「Phase -1」指向这里。

---

## 1. 配置文件

| 项 | 值 |
|---|---|
| 默认路径 | `~/.config/paper-explainer/config.json` |
| 路径覆盖 | 环境变量 `PAPER_EXPLAINER_CONFIG` |
| 读写工具 | `scripts/init-config.sh`（无参数 = 写推荐默认值；校验字段后写入） |

配置**不放 skill 目录**（那是 git 仓库，避免脏工作区）；它是**用户级**的，
换项目目录也生效。

### 字段表（version 2）

| 字段 | 取值 | 默认 | 作用 |
|---|---|---|---|
| `theme.mode` | `auto` / `fixed` / `ask` | `fixed` | 网页主题：**固定一个（跨任务深浅统一）** / 每次自动挑 /（`ask` 已废弃 → 按 `auto` 处理） |
| `theme.id` | 主题 id（如 `midnight-press`） | `midnight-press` | `fixed` 时使用；从 WVP `themes/*/theme.json` 读，不硬编码 |
| `devMode` | `A` / `B` / `C` | `B` | 开发模式：`A`（逐章确认，已废弃 → 按 `B`）/ 顺序 / 并行（subagent） |
| `materials.cover` | `svg` / `generate` / `placeholder` / `ask` | `svg` | 封面 / 概念图：SVG 自绘 / `gpt-image-2` 生成 / 占位 /（`ask` 已废弃 → 按 `svg`） |
| `narration.language` | `auto` / `zh` / `en` | `auto` | 口播语言；`auto` = 中文论文用中文，英文论文默认中文讲解 |
| `recording.enabled` | `true` / `false` | `false` | **是否录屏**：默认 `false`（不录屏，只交付可运行网页项目）；`true` = 视为用户已明确要求录屏 |
| `recording.autoAdvance` | `true` / `false` | `true` | 录屏时 `?auto=1` 自动推进 / 手动点击（仅在 `recording.enabled=true` 时生效） |
| `dependencies.wvpSource` | git URL 或本地路径 | ConardLi/garden-skills | 自动安装 WVP 的来源 |
| `dependencies.dtfSource` | git URL 或本地路径 | Leonxlnx/taste-skill | 自动安装 DTF 的来源 |

> **论文图表素材策略**（SVG 重绘 or 原图嵌入）由 `PAPER-ASSETS.md` §0
> 按图自动决策，**不进配置**；`materials.cover` 只管封面 / 氛围图这类
> 非图表素材。
>
> `ask` / `A` 为向后兼容保留：一步到位流程下分别按 `auto` / `B` 执行，
> **不会**停下来提问。

---

## 2. 首次初始化流程（全自动）

### 2.1 依赖自检

```bash
bash "$SELF/scripts/check-deps.sh"
```

报告里 `[OK] / [MISS] / [OPT-MISS] / [WARN]` 一眼可读，退出码
`1` = 必需项缺失。运行时工具与缺失处理：

| 工具 | 用途 | 缺失处理 |
|---|---|---|
| Node + npm | WVP 是 Vite + React + TS | 自动装 Node LTS（>= 18）；装不上则终止 |
| git | 自动安装依赖 skill | 自动装；装不上 → 手动放置 skill |
| Chromium / Chrome | 录屏（可选，默认不用） | **仅本次要求录屏时自动装**；装不上 → 跳过录屏，交付可运行项目 |
| ffmpeg | 录屏裁切（可选，默认不用） | 仅本次要求录屏时自动装；装不上 → 不裁切并说明 |
| pdftotext 或 pymupdf | 解析 PDF / 抽原图 | 自动装；装不上 → 仅能处理 arXiv 源码 / 网页输入 |
| curl 或 wget | 拉取 arXiv LaTeX 源码 | 自动装；装不上 → 手动下载源码 |
| pdftocairo / pdfimages | PDF 图转 SVG / 抽位图 | 随 poppler-utils 一起装 |

依赖 skill（WVP / DTF）缺失 → **直接自动安装**（§2.2），装不上见 §2.3。
**不再有「是否安装」的确认环节**；失败与降级写进最终汇报。

### 2.2 自动安装依赖 skill

```bash
bash "$SELF/scripts/install-deps.sh"                 # 装缺失的 WVP + DTF
bash "$SELF/scripts/install-deps.sh" --skills=wvp    # 只装 WVP
bash "$SELF/scripts/install-deps.sh" --wvp-src=<url|path> --dtf-src=<url|path>
```

- 默认装到 `~/.config/opencode/skills/`（`--skills-dir` 可覆盖）。
- 脚本用 sparse clone 只拉子目录，装完校验 `SKILL.md` 的 frontmatter
  `name`。
- **装完提醒用户：重启 opencode 才会加载新 skill。**

### 2.3 安装失败时的降级

| 缺什么 | 降级方式 |
|---|---|
| WVP | **不能降级**（它是骨架）。让用户提供已有路径，或终止并说明原因 |
| DTF | 降级：主题审美改用 WVP `references/THEMES.md` 自带规范；Phase 6 终审改用 WVP `CHAPTER-CRAFT.md` 的 ANTI-AI 清单。在汇报里注明「本次无 DTF 终审」 |
| 系统工具 | 按 §2.1 表降级：无浏览器 / ffmpeg → 跳过录屏，交付可运行项目 + build 通过（默认不录屏时本来就不需要）；无 PDF 工具 → 仅处理 arXiv 源码 / 网页输入 |

### 2.4 自动写默认配置

无配置文件时，**直接**写入推荐默认值（不问卷）：

```bash
bash "$SELF/scripts/init-config.sh"    # 无参数 = 推荐默认值
```

写入内容：`theme=fixed:midnight-press` / `devMode=B` / `cover=svg` /
`lang=auto` / `recording.enabled=false` / `autoAdvance=true`。之后每次运行
直接读取。主题固定是**刻意设计**——避免不同任务之间深色 / 浅色漂移。

### 2.5 汇报模板

```
初始化完成（自动，未打断）：
  配置    ~/.config/paper-explainer/config.json（新建，默认值）
  主题    fixed · midnight-press（跨任务统一；想换说一声）
  模式    B（顺序开发）
  封面    svg
  语言    auto（英文论文默认中文讲解）
  录屏    关闭（默认；想录屏说一声，或配置 recording.enabled=true）
  依赖    WVP ✓ / DTF ✓ / 录屏工具（ffmpeg / 浏览器）按需安装

想改默认说一声「重配 paper-explainer」。
```

---

## 3. 之后每次运行

1. **读配置**：`bash "$SELF/scripts/init-config.sh" --ensure`。
   - 有配置 → 补齐缺失字段 / 迁移旧默认后打印；一行汇报「已加载配置：主题=… 模式=… 封面=… 语言=… 录屏=…」，继续。
   - 无配置 → 自动写默认值（§2.4），继续。
   - 旧默认（v1 `auto` + 空 id）→ **自动迁移**为 `fixed:midnight-press`
     并打印迁移说明；显式配置的 `auto` / 其他主题保持不变。
   - 只看不改用 `--show`；`--ensure` 失败（JSON 损坏）→ 报告并让用户
     决定修复或 `--reset`，不要静默重写。
2. **依赖快速自检**：`bash "$SELF/scripts/check-deps.sh"`；有 `[MISS]`
   就按 §2.1 自动处理（skill 缺失直接装，不确认）。
3. **应用配置**（各 Phase 生效点见下表），不再重复提问。

| 配置 | 生效点 |
|---|---|
| `theme` | Phase 4.1 —— `fixed`（默认）直接用 `theme.id`（不存在则警告并回退 auto）；`auto` / `ask`（显式配置）才由 agent 按论文气质挑最佳并**汇报选择** |
| `devMode` | Phase 4.5 / Phase 5 —— A（按 B）/ B 顺序 / C subagent 并行 |
| `materials.cover` | Phase 4.1 —— `svg` 自绘封面；`generate` 用 `gpt-image-2`（没装则回退 svg 并说明）；`placeholder` 占位；`ask` 按 `svg` |
| `narration.language` | Phase 2 —— `auto` 按原文语言；`zh` / `en` 强制 |
| `recording.enabled` | Phase 7（**最后一步**，等终审与全部修改定稿后）—— `false`（默认）整节跳过，不录屏；`true` 视为用户已明确要求录屏 |
| `recording.autoAdvance` | Phase 7（仅录屏开启时）—— true 走 `?auto=1&reset=1`；false 手动点击录屏 |

> **单次覆盖**：用户当场说「这次用 X 主题 / 这次并行」→ 只影响本次，
> **不写配置**；除非用户明确说「以后都这样」，才 `init-config.sh --force`
> 更新。

---

## 4. 改配置 / 重置（用户主动发起）

| 需求 | 做法 |
|---|---|
| 看当前配置 | `init-config.sh --show`（只看不改） |
| 改某一项 | 直接编辑 `~/.config/paper-explainer/config.json`，或 `init-config.sh --force …` 全量重写 |
| 固定 / 切换主题 | `init-config.sh --theme-mode=fixed --theme-id=<id> --force`；恢复「每次自动挑」：`--theme-mode=auto --force` |
| 开启 / 关闭录屏 | 编辑 `recording.enabled`，或 `init-config.sh --record=true --force`（默认 `false`，不录屏） |
| 恢复默认 | `init-config.sh --reset`，下次运行自动写默认值（fixed:midnight-press） |
| 用户说「重配」 | 用 `question` 工具问一轮偏好，`--force` 写入（这是唯一允许的提问场景，由用户主动触发） |

---

## 5. 非交互 / 自动化模式

本工作流**默认就是非交互**：输入只需论文链接，所有决策自动完成（决策
清单见 SKILL.md「自动决策表」）；任何情况下都不因缺少确认而停下。缺依赖
自动装（录屏工具仅在要求录屏时装），装不上降级并汇报；最终汇报里列出
默认值与「我替你做了哪些决定」。

唯一例外：用户**主动**要求重配（§4）；完全没给论文（无链接、无文件、
无文本）时问一次链接；或环境中连 Node 都装不上（无法开工，必须说明）。

---

## 6. 自检

- [ ] 是否只要求论文链接，没有向用户索要主题 / 语言 / 篇幅等额外输入？
- [ ] 每次运行开始是否先读了配置？无配置时是否自动写了默认值（而不是提问）？
- [ ] 缺失依赖 skill 时是否**直接自动安装**（而不是询问）？
- [ ] 装完是否提醒重启 opencode？
- [ ] 安装失败时是否按 §2.3 降级并在汇报里注明？
- [ ] 单次覆盖是否没有污染持久配置？
- [ ] 默认是否没有录屏、没有为录屏安装浏览器 / ffmpeg？（仅当用户明确提出或 `recording.enabled=true` 时才录屏）
- [ ] 主题是否按配置固定（默认 `fixed:midnight-press`），不会跨任务深色 / 浅色漂移？
- [ ] 旧配置是否经 `--ensure` 补齐 / 迁移（而不是直接按残缺配置跑）？
- [ ] `fixed` 主题不存在时是否警告并回退，而不是硬跑？
