---
name: paper-explainer
license: MIT
description: 把学术论文（arXiv、DOI、PDF、网页、本地文件或粘贴文本）编译成可交互、逐步播放、可回到原文证据的技术讲解网页。输入只需论文；Skill 自带 Paper IR、Visual Intent、确定性场景编译器、模板目录、通用视觉舞台和跨平台启动器。默认交付网页，只有用户明确要求时才导出 MP4。
---

# Paper Explainer

读取论文后直接交付构建完成的交互式讲解。先核对事实与来源，再选择适合内容结构的视觉表达；模型负责编排讲法，编译器负责布局、几何、镜头目标和可执行场景图。

## 用户契约

唯一必需输入是论文链接、文件或正文。拿到输入后直接完成，不询问主题、语言、篇幅、封面、场景或输出目录。只有完全没给论文、输入需要用户登录、或所有解析路径都失败时才停下。

默认输出网页。仅用户明确说“视频 / MP4 / 录屏”时，才在网页定稿后导出视频。

本 Skill 自包含，不读取或安装其它 presentation、design、video 或 paper-reader skill。运行时、模板、编译器和验证器全部位于 `assets/project-template/`。

## 按需阅读

设 `SELF` 为本 Skill 目录。每次生成至少按顺序阅读：

1. `references/INIT.md`：初始化、目录和依赖；
2. `references/PAPER-IR.md`：论文事实与 evidence；
3. `references/VISUAL-INTENT.md`：world、视觉对象、step 和状态；
4. `references/TEMPLATE-SELECTION.md`：内容模式与模板选择；
5. `references/RUNTIME-AND-DELIVERY.md`：构建、验证和交付。

使用论文图、公式或补充材料时读 `references/PAPER-ASSETS.md`。修改已有讲解时读 `references/REVISION.md`。维护编译器、布局、舞台或校验器时读 `references/DEVELOPMENT.md`；需要理解生成结果或排查镜头时再读 `references/SCENE-IR.md` 与 `references/CAMERA-AND-MOTION.md`。

## 真相源

```text
原论文 / paper.md
        ↓
paper-ir.json              事实、技术对象、关系、claim、evidence
        ↓
visual-intent.json         模板选择、world、scene、step、字幕、焦点
        ↓  compile-content.mjs
scene-ir.json              generated：布局、几何、camera、完整步骤快照
        ↓
通用 WorldStage           视觉原语、动画、字幕、Evidence Drawer
        ↓
site/
```

只手动维护 Paper IR 和 Visual Intent。`scene-ir.json`、`script.md`、`outline.md` 属于派生产物；不要直接修改生成的 Scene IR 来掩盖内容、布局或编译问题。事实错误改 Paper IR，讲法或镜头错误改 Visual Intent，跨论文都会出现的能力问题才改 engine/runtime。

## 标准产物

```text
<paper-slug>-explainer/
├── open.cmd / open.command / open.sh
├── site/
├── sources/
│   ├── original.pdf
│   ├── arxiv/
│   ├── supplements/
│   └── manifest.md
├── content/
│   ├── paper.md
│   ├── paper-ir.json
│   ├── visual-intent.json
│   ├── scene-ir.json              # generated
│   ├── script.md / outline.md     # generated readable copies
│   └── revisions.md
├── templates/catalog.json
├── engine/                        # compiler、layout、validation
├── project/                       # React/Vite 通用播放器
├── runtime/                       # CLI 与本地服务器
├── schemas/
└── reports/explanation-audit.md
```

## 工作流

### 1. 初始化

```bash
bash "$SELF/scripts/check-deps.sh"
node "$SELF/scripts/scaffold-project.mjs" "./<paper-slug>-explainer" \
  --title "<paper title>" --source "<original URL>"
```

目标目录必须不存在或为空。以任务开始时的工作目录为 `WORKSPACE`，默认 `ROOT = WORKSPACE/<paper-slug>-explainer`；用户已指定位置时遵从。下载、解压和抽取命令都显式使用 `ROOT` 下的路径，不把素材散落到 Skill、系统下载目录或工作区外。

### 2. 获取原文与素材

- arXiv：先运行 `bash "$SELF/scripts/fetch-arxiv.sh" <url-or-id> "$ROOT"` 获取源码，再获取 PDF；源码失败时继续用 PDF 或网页。
- PDF：归档到 `sources/original.pdf`，复制到 `project/public/paper/original.pdf`，正文抽取到 `content/paper.md`。
- 网页：原始页面保存到 `sources/`，整理正文到 `content/paper.md`；能获取 PDF 时也归档。
- 粘贴文本：写入 `content/paper.md`；没有在线来源时保留摘录，不伪造链接。
- 相关补充材料和原图保存到 `sources/`；网页使用的副本放在 `project/public/assets/`。

在 `sources/manifest.md` 记录来源、项目内路径和失败原因。用户文件只复制，不移动。

### 3. Paper IR

按 `references/PAPER-IR.md` 写 `content/paper-ir.json`。先建立 evidence，再建立引用它的 claim、技术对象和关系。所有上屏数字、比较、公式解释、模块关系与作者结论必须有 evidence；推导性解释标为 `derived` 并说明依据。不确定的内容删掉或明确标为推导，不能用常识补论文事实。

### 4. Visual Intent

按 `references/VISUAL-INTENT.md` 和 `references/TEMPLATE-SELECTION.md` 写 `content/visual-intent.json`：

1. 从 Paper IR 识别结构模式；
2. 对有真实选择空间的内容比较 2–3 个模板候选，记录最终选择理由；
3. 建立可跨步骤复用的 world，绑定 Paper 对象和关系；
4. 编排 scene 与 step，先为一段讲解选择固定 frame，再指定强调、显隐、状态、detail 与必要转场；
5. 一步只引入或强调一个逻辑动作。

默认使用 `cameraPolicy: "static_first"`：`emphasisIds` 只改变注意力，`frameId` 才决定取景。同一 frame 内连续讲完一个小问题；只有当前 frame 无法让 `requiredReadableIds` 可读时，才使用带理由的非默认 frame。内容类型只描述“在讲什么”，不决定 renderer。总览、固定局部页和 detail 是可以叠加在不同结构模板上的叙事方式。不要填写像素坐标；原图 region 的 0–1 归一化位置除外。

### 5. 素材绑定

网页素材路径写成 `assets/<filename>`。公式写入 equation primitive 的 `tex`；运行时使用 KaTeX。原论文 PDF 固定发布为 `paper/original.pdf`，不要混入 assets。

### 6. 编译与硬校验

```bash
node "$SELF/scripts/build-project.mjs" "./<paper-slug>-explainer"
```

该命令安装缺失依赖，并依次执行：源 IR 校验、确定性编译、生成 Scene IR 校验、TypeScript 编译和 Vite 构建。任何数据或构建错误必须修复，不绕过。重复编译同一输入应产生相同 Scene IR 和 `sourceHash`。

### 7. 浏览器验证

在生成目录运行平台启动脚本，或在 `project/` 中运行 `npm run dev`。验证：

- 所有 scene / step 前后切换和目录跳转都正确；
- `←` / `→` 在主体、导航按钮或链接获得焦点时切换步骤，在输入和可编辑区域不接管；
- 顺序播放与直接跳到某一步的最终画面一致；
- 同一 frame 的连续步骤只改变强调和状态，不发生相机动画；
- 确有必要的 `viaOverview` 先恢复共同上下文再进入远处目标；
- detail panel 不遮挡焦点，小屏改为上下布局；
- 发生取景变化时，字幕在画面稳定后出现，自动播放从稳定时刻开始计算停留；
- 公式、算法状态、对比尺度、图片 region 和素材错误提示正常；
- 字幕、当前视觉对象与 Evidence Drawer 来源一致；
- reduced-motion 下直接到达完整目标状态；
- 自动播放从头到尾结束，不遗留 dev server。

### 8. Audit 与交付

`reports/explanation-audit.md` 至少记录：贡献覆盖、数字/公式/关系/实验来源覆盖、derived 解读、模板选择、generic fallback、构建结果、来源链接抽查和视觉核查。

硬门槛：所有上屏数字与关键结论来源覆盖率 100%。区分“引用结构完整”与“人工核对语义正确”，不能把 schema 通过写成事实准确率 100%。

交付前确认 `site/index.html`、三个启动脚本和项目内原件存在，PDF 发布副本与归档一致，整个目录移动后仍可构建和打开。最终汇报目录、章节/step 数、来源覆盖率、打开方式及是否导出 MP4。

## 原文跳转

Evidence Drawer 只读取 Paper IR：精确 `url` 优先；其次本地 PDF + `page`、在线 PDF + `page`、原文 URL + `anchor`、最后论文主页加 section/excerpt。禁止在 TSX 或 Visual Intent 中手写第二份来源链接。

## 视觉约束

- 同一 world 的对象在步骤间保持稳定 identity 和 geometry；显隐不引发布局跳动。
- 非 emphasis 元素降权并保留必要上下文；需要显著改变结构时使用固定局部 world 或 detail view。
- 相机移动只解决必读内容不可读、原图细节检查或恢复空间上下文；不能用于增加动感或代替高亮。
- 模板不能创造论文没有声明的模块、关系、训练路径或数值。
- 原论文图保持原色，使用浅色 paper canvas；公式、英文和数字保持可读。
- 颜色只承担语义：accent 表示当前 focus、活动路径或来源入口。
- 完成后停止 Skill 启动的开发服务器、浏览器或录屏进程。
