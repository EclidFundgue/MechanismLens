# Generated Scene IR 2.0

Scene IR 是 `paper-ir.json + visual-intent.json + templates/catalog.json` 的确定性编译产物。Schema：`schemas/scene-ir.schema.json`。运行时只读取它；Agent 不直接编辑它。

顶层包含：

- `build`：compiler、catalog 版本及 source hash；
- `worlds`：已布局的 primitives、relations、anchors、detail views 和 world bounds；
- `scenes`：章节及完整 step 目标快照。

每个 primitive 都有 world-space `x/y/width/height`。group 父子关系在 Intent 中以 `parentId` 表达，编译后所有坐标展平到同一 world。world 可以比屏幕大，也允许负坐标；运行时通过 viewBox 相机显示目标范围。

anchors 为 equation term、code line、chart item 和 image region 提供可聚焦 bounds。relation 带稳定 ID、端点和编译后的 SVG path。

每个 step 包含：完整 `visual`、camera target bounds、transition 和 timing。默认值已展开，所以恢复任意 step 不依赖播放历史。`viaOverview` 使用 world bounds 作为中间共同上下文；后续布局策略可以把它收窄为最近公共 group。

编译器写临时文件并在校验成功后替换 `content/scene-ir.json`。相同输入和版本产生相同 JSON；生成失败必须阻止旧 Scene IR 被当作本次交付。

v1 的 `scene.type/payload/visual` 不兼容 v2。旧项目继续使用自身 runtime；v2 校验器返回明确版本错误，不猜测迁移。
