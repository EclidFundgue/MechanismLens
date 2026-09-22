# Paper Explainer v2 重构计划

状态：核心 v2 纵向链路已实施。设计日期：2026-09-21；首次实施：2026-09-22。

当前已完成：Paper IR 2.0、Visual Intent 2.0、模板目录、确定性编译器、generated Scene IR 2.0、嵌套 group 布局、anchors、camera direct/viaOverview、detail panel、统一 WorldStage、六类内容能力迁移、稳定 ID cursor、三层校验、独立交付构建和 Skill 文档切换。后续扩展项包括更专门的 encoder-decoder / training-inference 布局策略、最近公共 group 的过渡视角、统一逻辑时钟暂停动画、schema 派生类型和更完整的浏览器视觉回归。

## 1. 重构结论与目标

采用一次明确的 v2 架构替换：从“内容类型选择专属 renderer”，改为“内容事实 → 视觉意图 → 编译后的场景图 → 通用舞台”。实现可以分批验证，但最终只保留一条新运行链路，不长期维护六套旧 renderer 与新引擎并行。

本次重构同时解决两个问题：

1. 模型能依据内容选择、组合表达方式，而不是只能填写既定页面组件。
2. 同一结构具有稳定的对象、空间和镜头关系，支持“总览 → 局部 → 回看整体 → 另一局部”。

继续保留自包含 Skill、静态网页交付、证据回溯、字幕同步、跨平台启动和无需在线模型服务的观看体验。

明确范围：本轮设计之后再实施；不把可视化编辑器、任意用户代码执行、3D、Canvas/WebGL、多后端渲染、语音合成或 MP4 导出纳入 v2 首发。首发也不做任意布局之间的 morph、真实拓扑重排动画或无限模板嵌套。

## 2. 当前代码事实与重构落点

以下路径相对仓库根目录；`T` 表示 `skills/paper-explainer/assets/project-template/`。

| 当前实现 | 实际约束 | v2 处理 |
|---|---|---|
| `T/project/src/components/SceneRenderer.tsx` | 按 `scene.type` 分发六个完整组件 | 按场景图中的 primitive 分发；内容类型只作为语义标签 |
| `T/project/src/components/renderers/ArchitectureExecution.tsx` | 固定 `960×480`，节点矩形、直线边 | 替换为统一 world、嵌套 group、port 和 edge routing |
| `T/project/src/components/renderer-model.ts` | 默认沿一行放置节点 | 拆为布局、几何、视图状态等纯函数 |
| `T/runtime/validation/scenes.mjs` | 显式架构坐标也必须位于 `960×480` | 删除固定画布约束；检查 world 几何与引用关系 |
| `T/project/src/components/renderers/FigureInspector.tsx` | 已有原图总览和区域裁切，但局限于图片组件 | 保留归一化区域能力，接入统一 camera 与 detail panel |
| `T/project/src/types.ts` | `payload: Record<string, unknown>`，step 混合不同场景字段 | 改成明确区分的 Paper / Intent / SceneGraph 类型 |
| `T/project/src/data.ts` | JSON 直接断言为 TS 类型 | 构建前验证并编译；网页只读取合格的生成结果 |
| `T/project/src/App.tsx` | 游标存数组下标；自动播放以字幕长度设单次定时器 | 稳定 ID 游标和统一播放控制器，纳入镜头转场时间 |
| `T/runtime/validation/index.mjs` | 已有无副作用校验入口 | 保留纯函数与结构化诊断设计，扩大到三层 IR |
| `scripts/scaffold-project.mjs`、`scripts/build-project.mjs` | 复制模板后直接校验、构建 | 加入意图校验、编译、产物校验与过期检查 |
| `SKILL.md`、`references/SCENE-IR.md` | 明确要求映射到六种内置场景 | 改写 Agent 编排流程，否则新引擎仍会收到旧表达 |

需要保留的行为契约：

- step 的最终状态不依赖是否播放过前一步。
- 显隐列表省略与显式空数组的含义不同。
- 算法变量变化对比“叙事中的前一步”，不是用户刚访问的页面。
- 比较图使用全数据的固定尺度、真实数值和明确的指标方向。
- 证据链接统一来自 Paper IR。
- 原件集中保存到项目 `sources/`，发布素材走 `project/public/`。

当前已有未提交修改：`SKILL.md`、`project/src/lib/player-keyboard.ts`、`tests/runtime/player-keyboard.test.mjs`。实施开始前先读取其 diff，基于现状合并设计，禁止直接用旧文件覆盖。

## 3. 总体架构与真相源

```text
原文、原图、表格、公式
          │
          ▼
Paper IR 2.0                 模型编写：事实、对象、关系、证据
          │
          ▼
Visual Intent IR 2.0         模型编写：表达选择、内容绑定、步骤、字幕、焦点
          │
          ▼
Deterministic Compiler      校验 → 模板展开 → 布局 → 视图状态 → 场景图
          │
          ▼
Scene IR 2.0                自动生成：world、primitive、geometry、view、step
          │
          ▼
Runtime                     播放控制器 + 通用舞台 + camera + evidence
```

### 3.1 谁写什么

| 数据 | 权威来源 | 是否手动修改 |
|---|---|---|
| `content/paper-ir.json` | 原文事实和 evidence | 是，由 Agent 核对原文后维护 |
| `content/visual-intent.json` | 讲解方式、章节、step、字幕和语义焦点 | 是，是讲解的创作真相源 |
| `content/scene-ir.json` | 上述两者的确定性编译结果 | 否，每次构建重新生成 |
| `content/script.md`、`content/outline.md` | Visual Intent 的可读副本 | 自动派生，不单独编排 |
| `reports/visual-audit.json`、`.md` | 编译诊断和人工核查记录 | 自动结果与人工结论分区 |

Scene IR 是网页的执行输入，不再同时承担模型创作和运行时执行两种职责。字幕只在 Intent 中创作一次，Scene IR 的副本是可重建产物。

编译结果记录输入内容 hash、IR 版本、compiler 版本、template catalog 版本。相同输入和相同版本必须产生相同输出；时间戳只放报告，不污染确定性产物。编译写临时文件，成功后再原子替换，失败不覆盖已有产物，但必须阻止旧产物被当作新交付发布。

### 3.2 模型与程序的边界

- 模型负责识别内容模式，选模板，解释选择理由，确定叙事顺序，引用事实对象。
- 程序负责模板适用性检查、稳定 ID 展开、布局、边路由、几何、视图求解、播放插值。
- 模型原则上不填像素坐标或任意 TSX/CSS；精确布局通过有限的方向、顺序、分组、对齐和间距约束表达。
- 图片 region 是例外：属于原始素材的观察坐标，可以提供归一化矩形。
- 不在浏览器调用 LLM；“模板选择器”首先是 Skill 的编排协议和模板目录，不新增在线 Agent 服务。

## 4. 三层数据契约

### 4.1 Paper IR 2.0：补足可绑定的技术语义

保留现有 `paper/evidence/claims/contributions/concepts/modules/equations/experiments/figures`，把实际需要用到的领域字段结构化；避免为了画图建立一套完整的知识本体。

首发新增或明确：

- `modules`：输入、输出、归属模块、角色、适用阶段。
- `relations`：稳定 ID、源对象/端口、目标对象/端口、关系类型、`training/inference/both` 阶段和 evidence。
- `equations`：完整 LaTeX、稳定 term ID、符号解释与来源。
- `algorithms`：伪代码行 ID、行文本、解释；教学执行例子的输入、变量快照及推导说明。
- `experiments`：指标 ID、单位、方向、变体 ID、真实数值、基线引用和证据。
- `figures`：素材路径、尺寸、caption，以及需要复用的 region。
- 事实或推导在对象/关系层标明 `direct/derived`，derived 附依据说明；保留原始 evidence 的定位信息。

布局上的“视觉分组”可以只存在于 Intent，不能自动被当成论文声称的模块层级。训练和推理关系必须有原文依据，不允许模板为填满槽位创造模块或连线。

### 4.2 Visual Intent IR：模型可控的创作接口

顶层建议包含：

```text
schemaVersion, paperId, title
worlds[]     复用的视觉结构与布局配方
scenes[]     章节、内容类型、worldRef、steps
```

每个 world：

- `id`：跨步骤、必要时跨章节复用的稳定结构 ID。
- `selection`：`contentPatterns`、候选模板的理由/风险、最终选型理由。
- `composition`：一个基础布局模板、类型化 slots 和 layout constraints。
- `bindings`：视觉对象 ID → Paper 对象或 relation ID。
- `annotations`：有来源绑定的解释性标注。
- `detailViews`：子图投影，或有明确来源绑定的机制展开图。

每个 scene：`id/title/contentKind/worldId/claimIds/evidenceIds/steps`。`contentKind` 不参与组件 dispatch。

每个 step：

| 字段 | 作用 |
|---|---|
| `id`, `title`, `narration` | 稳定定位和字幕 |
| `goal` | 这一动作要解释什么 |
| `viewMode` | `overview / focus / detail / compare` |
| `focus` | 明确的对象 ID 和 `fit / tight / contextual` 策略 |
| `contextPolicy` | `showAll / dimOthers / keepNeighbors` |
| `visibleIds`, `emphasisIds`, `activeRelationIds` | 目标可见集合和强调集合 |
| `detail` | 明确为 `null` 或 detail view 引用 |
| `state` | 对 equation/code/chart 等对象的类型化状态快照 |
| `transition` | `direct / viaOverview`、时长及允许的 easing |
| `timing` | 可选讲解停留时长；缺省按字幕估计 |
| `evidenceIds` | 当前步骤依据 |

此处 v2 的 `state` 是新契约，与 v1 明确拒绝的同名方言分开按版本处理，不默默兼容。

默认值只能依赖 world 定义和当前 step。省略 visible 集合表示默认全体；`[]` 表示显式无对象；其他强调列表省略表示无强调，detail 省略或 `null` 表示无面板。编译器将所有默认值展开为完整执行快照，禁止隐式继承上一 step。

模板切换发生在创建 world 时。同一 world 的步骤只切换视角、显隐、状态或 detail，不重新选择主布局。需要不同结构表达时创建另一个 world，通过语义引用关联。

### 4.3 Scene IR 2.0：可执行场景图

建议包含 `build/worlds/scenes`：

- `worlds`：稳定的 objects、groups、edges、ports、bounds、detail views、语义映射。
- `objects`：带判别字段 `kind` 的类型联合；不使用无约束 payload。
- `groups`：通过单一 `parentId` 建立无环树；children 和 bbox 由程序派生，避免两份父子关系。
- `edges`：显式 ID、端点、路由和语义引用；不再用 `from->to` 充当长期身份。
- `views`：detail panel 的对象投影与布局，保留对象身份映射。
- `scenes[].steps`：完整对象状态、来源索引、镜头请求和转场参数。

坐标统一为 world-space；可超出屏幕尺寸，也可为负坐标。布局时可使用父容器局部坐标，输出时展平为 world 坐标，renderer 不自行叠加第二套位置算法。

保留两类相机数据的分工：Scene IR 存放目标 bounds、padding、缩放上限与策略；浏览器结合实际 viewport 求得 `centerX/centerY/zoom`。不把某个桌面尺寸的最终 camera 数值当作所有屏幕的固定结果。

## 5. 模板系统：布局、讲解方式与原语分开

用户材料中的 `overview_detail_spotlight` 和结构模板不是同一个维度。因此目录拆成：

1. **Composition templates**：定义对象如何组织。
2. **Narrative treatments**：定义如何逐步强调和切换视角。
3. **Primitives**：执行绘制、文本、公式、代码或图表。

首发允许“一种主 composition + 一个可选 detail composition + treatment”；限制任意深度模板递归，嵌套模块用 group 表达。

### 5.1 模板元数据

每项至少有 `id/version/applicablePatterns/requiredSlots/optionalSlots/supportedTreatments/constraints/antiPatterns/examples`。slots 是对象引用的结构化合同，不是“这里填一段文本”。编译器与 Agent 阅读同一份 catalog；可读说明由 catalog 生成，避免两套目录漂移。

选择流程：识别模式 → 过滤不满足必需槽位的模板 → 在有意义的候选中比较忠实性、讲解清晰度、空间连续性、密度 → 选一个 → 编译验证。结构有歧义时列 2–3 个候选；明显的单公式或单图不强制制造候选。

候选理由是便于审计的简短设计说明，不要求生成冗长推理过程或无依据的精确评分。

### 5.2 首发目录及顺序

| 模板 / treatment | 作用 | 批次 |
|---|---|---|
| `grouped_overview` | 层级模块、分组与主结构 | 首条完整链路 |
| `overview_detail_spotlight`（treatment） | 总览、聚焦、detail 和返回 | 首条完整链路 |
| `branch_merge_pipeline` | 多分支与融合关系 | 结构扩展 |
| `encoder_decoder` | 编码、瓶颈、解码及跨侧连接 | 结构扩展 |
| `training_inference_dual_view` | 两种执行路径与共享模块 | 结构扩展 |
| `compare_variant` | 结构变体或数据差异 | 结构扩展 |
| `concept_sequence` | 概念关系与逐步解释 | 六类能力迁移 |
| `equation_derivation` | 公式、term 和解释组合 | 六类能力迁移 |
| `algorithm_state_trace` | 代码行、变量与输出组合 | 六类能力迁移 |
| `figure_region_exploration` | 原图与区域解释 | 六类能力迁移 |

这是配方目录，不是十个全页 React renderer。新增模板只增加 metadata、slots 校验、展开逻辑和样例；如果每加一个模板都要增加整页组件，说明解耦没有完成。

### 5.3 通用舞台中的原语

首发：`node/group/edge/text/image/region/annotation/badge/equation/code/chart`。

- group 支持嵌套、标题和 padding；swimlane、stack、grid 是布局策略。
- split/merge、feedback 是关系与路由策略，不制造论文中不存在的计算节点。
- spotlight、dim、halo、trace 是对象呈现状态，不是独立页面。
- equation 保留 KaTeX；code 保留行高亮与状态面板；chart 保留统一数值域。
- SVG 承担几何、连线和图像；HTML 承担可访问文本、公式和交互面板。
- HTML 元素通过同一个 world-to-screen 变换定位，尺寸合同由布局决定；字体和内容加载引起测量修正后重算 bounds，但不在每个 step 重排。

共享对象在双路径图中可能有两个展示实例：语义 ID 相同，visual ID 不同。稳定身份并不意味着同一个 DOM/SVG 元素必须同时出现在两个位置。

## 6. Layout 与几何

编译阶段：绑定解析 → 图结构校验 → 内部元素尺寸估计 → 递归 group 排版 → 边路由 → world/detail bounds → 相机目标预处理。

首发采用有限、确定性的布局策略：sequence、layered branches、nested groups、paired lanes 和 grid。策略共用几何核心；模板只给约束。不同时接入多套自动布局库，也不承诺解决任意图的最优排版。

具体规则：

- 布局覆盖该 world 中所有步骤可能出现的对象；逐步显现只改状态，不移动其他节点。
- group 展开采用已预留的空间和细节显现；会显著改变结构的展开走 detail panel。
- 边优先连接显式 port，路由区分普通路径、分支、跨层连接与反馈环。
- 默认对层级图作确定性排序；有环的计算流程用反馈边表达，不能直接假设所有数据关系是 DAG。
- 避免边穿过非端点节点；无法清晰路由时给诊断，修正分组或布局约束，不静默改变论文关系。
- 字体、长文本、中英文、KaTeX、图片宽高都进入尺寸验收；总览可以隐藏次要标签，放大后显现。
- world 以自然比例呈现；小屏通过相机 fit 和 detail panel 响应式切换适配，不因浏览器宽度改变结构拓扑。

## 7. Camera、detail 与播放语义

### 7.1 相机求解

单一步骤的相机流程：解析 focus IDs → 取目标对象与要求的上下文 bounds → 加留白 → 在实际可用 viewport 内求 fit → 应用缩放限制。

概念计算式：`zoom = min(availableWidth / targetWidth, availableHeight / targetHeight)`，其中 available 已扣除面板与留白。处理零尺寸、非法 bounds、超大留白和缩放越界；这些不能产生 Infinity、NaN 或空白画面。

焦点对象不存在或被隐藏是硬错误；没有显式 focus 时使用 world 总览。`tight` 与 `contextual` 使用明确的 padding/邻居策略，不交给 renderer 临时猜测。

### 7.2 转场

- `direct`：当前视角直接到目标视角。
- `viaOverview`：当前视角 → 同一 world 的共同上下文 → 目标视角。
- 共同上下文优先取两目标的最近公共 group；不存在时使用 world 总览。保证中间视角覆盖起终目标并确实缩回，而不是只换一个 easing。
- 采用固定分段的单条时间轴，不创建多个互不关联的 timeout。
- 平移与缩放共同插值；不支持旋转。
- 不同 world 默认短淡入切换，不伪装成同一张图上的连续飞行。

### 7.3 detail panel

支持两种明确的数据来源：

1. 子图投影：复用同一 world 中对象，单独布局时维护 `instanceId → objectId` 映射。
2. 机制展开：增加公式、示例或内部过程，通过 `explainsObjectId` 指向总图模块；新增教学内容有独立语义 ID 和 derived 标记，不能伪称原图已有对象。

主图保留定位框与锚点，高亮可以同步到 panel；桌面右侧、小屏下方。panel 打开时先确定主 viewport 尺寸，再解算 camera，避免对焦后被面板挡住。关闭时恢复该 step 所规定的视图，不恢复一段不可追溯的历史状态。

### 7.4 播放器必须明确的行为

| 操作 | 规定行为 |
|---|---|
| 下一步 / 顺序自动播放 | 按目标 step 的入场策略转场，字幕和 evidence 立即切到目标 step |
| 上一步 | 以当前实际画面作为动画起点，按统一回退策略到前一目标状态；不要求倒放原路径 |
| 目录跳转 / 首次加载 / 刷新恢复 | 直接恢复目标完整状态，默认不播放跨多个步骤的飞行 |
| 转场中再次切步 | 取消旧动画，从当前插值画面接到新目标，旧回调失效 |
| 暂停 | 冻结当前转场和停留倒计时；手动切步取消该冻结转场，执行新目标 |
| 标签页隐藏 | 暂停逻辑时间，回来后继续，不一次跳过多个步骤 |
| resize / panel 切换 | 重算 viewport camera，不重写叙事 cursor 或 world 语义布局 |
| reduced motion | 立即到目标状态，保留字幕、强调和来源功能 |

播放器是唯一时间源，向 motion engine 提供 `progress`。每步总时长 = 转场时长 + 讲解停留时长；暂停和恢复都使用同一逻辑时钟。

允许在内存维护“当前插值帧”等瞬态状态，但不能把它当作目标画面的真相源。变量 diff 等教学效果仍比较叙事相邻快照。

游标缓存改存 `paperId + sceneId + stepId`；删除对象时回到有效 scene/step。旧数组下标缓存通过新版 key 隔离，不猜测旧位置的语义。

## 8. 验证、诊断与来源

### 8.1 三道验证关口

1. Paper 结构与证据：对象、关系、事实值和 evidence 引用。
2. Intent 语义：模板槽位、跨层引用、步骤状态、detail 归属、选型能力。
3. SceneGraph 执行：ID、parent 无环、bounds、路由、焦点可见性、镜头目标和尺寸。

Schema 作为结构合同的唯一来源；结构校验代码与 TS 类型由它生成并纳入一致性检查，关系检查仍使用手写纯函数。生成后的校验器随模板分发，普通数据校验不依赖仓库环境。生成工具只用于维护契约，不能成为“复制 Skill 后无法使用”的隐含前提。

保留结构化 issue：`code/path/message/sceneId/stepId`，新增 `layer/templateId/objectId`。编译器不静默修复缺失 ID、类型或论文关系。

### 8.2 错误与警告

硬错误：断链、重复 ID、parent 环、模板槽位缺失、非法枚举、无效几何、活动边端点不可见、镜头聚焦隐藏对象、已结构化数字或关键关系缺少来源。

警告：标签拥挤、总览过密、过多跨边、低于可读字号、过于频繁的长距离飞行、generic fallback、没有解释选型理由。

字体裁切或焦点被遮挡虽然可能先作为布局警告输出，但浏览器验收中必须解决；不能以“校验通过”作为可读性合格的替代。

### 8.3 证据覆盖

Evidence Drawer 汇总当前 step 的显式来源、claim 和当前讲解对象绑定的来源；detail 新增解释也参与汇总。图中节点、边、数值和公式项均可回溯到 Paper 对象，避免仅给整页附上一条无关来源。

结构校验只能证明引用存在，不能证明字幕中的自然语言说法受原文支持。audit 分别报告“可自动检查的绑定完整性”和“Agent 对关键结论、数字、推导的原文核查”；不得把 schema 通过写成语义准确率 100%。

## 9. 代码组织与迁移矩阵

新模块仍留在 `assets/project-template/`，随 Skill 复制，避免拆出必须额外安装的内部包。

```text
skills/paper-explainer/
├── SKILL.md
├── references/
│   ├── PAPER-IR.md
│   ├── VISUAL-INTENT.md          新增：模型创作协议
│   ├── TEMPLATE-SELECTION.md     新增：选型规则与反例
│   ├── SCENE-IR.md               重写：生成的执行合同
│   ├── CAMERA-AND-MOTION.md       新增：镜头和播放语义
│   └── DEVELOPMENT.md 等
└── assets/project-template/
    ├── content/
    │   ├── paper-ir.json
    │   ├── visual-intent.json
    │   └── scene-ir.json         generated
    ├── schemas/                 三层合同及公共 defs
    ├── templates/
    │   ├── catalog.json
    │   └── examples/             有效输入、效果和反例
    ├── engine/
    │   ├── compiler/             模板展开与执行计划
    │   ├── layout/               排版、bounds、routing
    │   └── validation/           三层纯校验及生成代码
    ├── runtime/
    │   ├── compile-content.mjs   薄 CLI
    │   ├── validate-data.mjs      薄 CLI
    │   └── serve.mjs / serve.py
    └── project/src/
        ├── contracts/            生成的类型
        ├── components/           UI shell 与 EvidenceDrawer
        ├── stage/                world、primitives、overlays、detail
        ├── camera/               求解与插值
        └── player/               cursor、时间轴和控制器
```

布局与编译核心优先使用纯 ESM 模块，方便现有 Node 脚本和测试直接调用；React 继续用 TSX。不要为编译器再引入一套服务。Schema 派生物的生成工具和检查命令在仓库开发入口统一管理。

| 文件 / 模块 | 动作 |
|---|---|
| `SceneRenderer.tsx` | 用 WorldStage 取代，移除内容类型 switch |
| 六个 renderer | 按语义拆解复用有价值的计算与小组件；完成迁移后删除旧全页分支 |
| `MathText.tsx` | 保留公式渲染能力，迁入 equation primitive |
| `renderer-model.ts` | 拆分几何、图表数值域、区域转换；保留对应行为测试 |
| `App.tsx` | 保留页面框架，将播放和缓存逻辑抽入 player |
| `styles.css`、`renderer-enhancements.css` | 按 shell/stage/primitives 整理，避免旧样式影响新对象 |
| `types.ts`、两个旧 schema | 替换成三层版本化合同，消除宽泛 payload |
| `validation/*` | 分成 paper/intent/graph 与跨层 checks，保留 CLI 诊断格式 |
| `data.ts` | 读取生成 Scene IR，禁止绕过编译直接加载 Intent |
| `scaffold-project.mjs` | 复制完整 engine/catalog/schema，初始化 v2 示例与来源目录 |
| `build-project.mjs`、项目 npm scripts | validate source → compile → validate output → tsc → Vite |
| 开发模式 | 启动前编译；监听 Paper/Intent/catalog 改动，成功后触发刷新，失败展示诊断 |
| README、所有 references、audit 模板 | 同步新的创作、修改、构建和验收流程 |

## 10. v1 兼容策略

按用户允许大改的前提，默认采用清晰的破坏性升级：新 Skill 只生成 v2，运行时只解释 v2，不加 legacy renderer 或宽松猜测。

- 已交付的 v1 项目有自身 runtime 和构建产物，继续保持原样，不批量覆盖。
- 在 v2 工具中输入 v1，返回明确的版本错误及迁移说明。
- 仓库中的 legacy fixture 改为“明确拒绝旧版本”的测试；其中有价值的边界行为迁入 v2 fixture。
- 不把自动迁移器纳入首发。若后续确认有大量旧项目要升级，再做显式、离线的迁移工具；不能假装从旧的平铺数据自动恢复论文语义分组和关系。
- 重新编排旧内容时尽量保留 Paper/scene/step ID，但新数据仍需来源和镜头验收。

## 11. 分批实施与每批完成标准

以下是依赖顺序，不是旧架构的长期兼容路线。每批结束都应有可核验产物。

### P0：冻结边界与建立验收样例

- 阅读已有工作区 diff，记录必须保留的行为。
- 运行现有测试，记录 baseline；本计划编写阶段尚未运行测试。
- 准备三类本地样例：层级架构；训练/推理双路径；包含公式、算法、图表、原图的混合讲解。
- 定义首个演示的六个镜头：全图 → encoder → fusion → 缩回 → decoder → 全图。

完成标准：样例事实与证据、讲解动作和期望视角都有明确对应；不是只写“效果更好”。

### P1：合同与最小编译链

- 定义三层 schema、ID 作用域、引用与默认值规则。
- 加 catalog 和 `grouped_overview` 最小 slots。
- 实现 CLI、结构校验、绑定解析、稳定 ID 展开、输出 hash 与原子写入。
- 将 Script/Outline 改为派生文档。

完成标准：同一 Paper + Intent 重复编译结果一致；非法槽位/引用准确定位；最小示例能生成合法 Scene IR；契约派生物检查通过。

### P2：打通首条可见链路

- 新增 WorldStage、node/group/edge/text/annotation。
- nested groups 布局、稳定 bounds、基础 routing。
- 接入 camera、直接转场、viaOverview、一个子图 detail panel。
- 接入 player 控制器、step 状态、字幕和 evidence。

完成标准：六镜头演示在浏览器中实际播放；同一 world 对象位置不因切步变化；直接跳到 fusion 与顺序播放到 fusion 的最终状态一致；无需定制论文 TSX。

### P3：丰富结构表达

- 加 branch-merge、encoder-decoder、training/inference、compare variant 配方。
- 支持 port、反馈边、共享语义对象的多实例映射。
- 完成 detail 机制展开、主图定位和小屏布局。
- 完成中途打断、回退、暂停恢复、resize 和 reduced motion。

完成标准：同一套 primitives 支撑不同结构；训练独有模块不会混进推理路径；跨局部切换有可见的共同上下文；面板不遮挡焦点。

### P4：迁移其余六类能力

- concept、equation、algorithm、comparison、figure 全部变为配方和 primitives 组合。
- 迁移 KaTeX、变量 diff、指标方向/零轴/基线、原图 region 和失败提示。
- 移除旧 scene.type dispatch、旧 renderer 和旧 CSS。

完成标准：混合样例包含全部原有能力；内容类型不再决定布局；不存在一类内容只能返回整页旧组件的例外。

### P5：重写 Skill 创作流程与交付链

- 更新 SKILL、Paper/Intent/Scene references、选型反例和修改规范。
- 生成流程改为：内容抽取 → 意图与选型 → 编译诊断 → 局部修订 → 浏览器核查 → audit。
- Agent 修视觉问题时改 Intent，修事实问题时改 Paper，修通用能力时才改 engine；禁止改 generated Scene IR 来掩盖编译缺陷。
- 同步 scaffold、build、dev watcher 和模板中的演示内容。

完成标准：只复制 Skill 到独立目录即可生成、编译和打开讲解；修改字幕或镜头不需要改 React；交付不依赖仓库绝对路径。

### P6：回归、清理与发布就绪

- 跑三层合同、编译、几何、播放与浏览器验收。
- 跑复制并移动输出目录后的交付集成测试；含中文、空格路径和本地素材。
- 三个平台分别验证启动脚本，不把未运行的平台写成已通过。
- 清理未使用的旧字段、旧 fixtures、旧文档约束；README 展示新的总览与局部流程。

完成标准：所有首发模板有样例；无 v1 隐式路径；关键视觉与证据问题解决；构建、启动、来源跳转和整个项目可移动性通过验收。

## 12. 测试与视觉验收矩阵

| 层 | 重点用例 |
|---|---|
| Schema / references | 空/错误结构、重复 ID、跨 world 引用、模板缺槽、parent 环、不兼容版本 |
| Compiler | 确定性、稳定 ID、无输入修改、默认值展开、无累计状态、来源继承、旧输出拦截 |
| Layout | 嵌套 bounds、长标签、负坐标、反馈边、跨组 port、显隐不改布局 |
| Camera | 单/多目标 fit、共同祖先、padding、小 viewport、缩放限值、零尺寸防护 |
| Player | 顺放、倒退、直接跳转、中断、暂停、隐藏标签页、恢复、删除 step 后缓存回退 |
| Detail | 同对象映射、机制展开来源、面板开关、主 viewport 变化 |
| 内容 primitives | 公式错误、变量 diff、负值指标、固定 domain、基线、图片 region、图片失败恢复 |
| 集成 | scaffold → compile → validate → build → serve，移动目录后资源与来源链接仍有效 |
| 浏览器 | 实际文字溢出、焦点遮挡、zoom 连续性、步骤字幕同步、键盘和小屏 |

浏览器记录至少包含 desktop 与窄屏的关键帧，以及 `overview → A → viaOverview → B` 的转场中间帧。截图外还要检查几何和目标状态，不能只靠像素快照判断正确性。

新增非产品 UI 的测试入口，允许固定 step、viewport 和 animation progress 以复现问题。性能样例先以 80 个节点、120 条边、3 层 group 为压力基线；在记录浏览器与设备后测量，不预先宣称固定 FPS。要求动画期间不反复运行布局、不逐帧重排整棵 React 内容树，rapid navigation 不留下并行动画。

关键验收区别：P2 演示成功只是证明架构可行；只有六类能力迁完、Skill 能生成新数据、交付链独立可用，才算本次重构完成。

## 13. 主要风险与约束措施

| 风险 | 约束措施 |
|---|---|
| 新 IR 过重，Agent 难以正确填写 | 只创作 Paper + Intent；具体 geometry 自动生成；按需读取模板例子 |
| 模板换名后仍是完整 renderer | 新模板必须由现有 primitives 和布局展开；禁止复制整页 |
| 布局引擎范围失控 | 有限布局家族、有限组合层级；先解决验收样例，再扩展算法 |
| 总览细节太多导致文字不可读 | 稳定 geometry + 逐层显现 + detail panel；不只无限 zoom |
| 自动排版改变论文关系 | 显式 relation 绑定，程序只路由，不补事实 |
| 镜头动画与跳转产生状态漂移 | 目标快照确定，瞬态动画可取消，播放器拥有唯一时间源 |
| 意图与场景图形成双重真相源 | generated 标识、hash、每次构建重编译、禁止手改执行 IR |
| Schema、类型、校验器漂移 | 单一合同生成派生物并检查一致性；语义规则保留行为测试 |
| 新能力挤掉公式、原图、来源等基础功能 | P4、P6 明确为发布门槛，不能在架构演示后提前结束 |

建议从 P0/P1 开始，紧接 P2 做一条贯通的视觉链路。先验证“模型能选表达，镜头能保留空间关系”，再扩充模板；整个过程围绕同一套 v2 合同实施。
