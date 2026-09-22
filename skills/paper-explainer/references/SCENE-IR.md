# Generated Scene IR 2.1

Scene IR 是 `paper-ir.json + visual-intent.json + templates/catalog.json` 的确定性编译产物。Schema：`schemas/scene-ir.schema.json`。运行时只读取它；Agent 不直接编辑它。

顶层包含：

- `build`：compiler、catalog 版本及 source hash；
- `worlds`：已布局的 primitives、relations、anchors、固定 frames、detail views 和 world bounds；
- `scenes`：章节及完整 step 目标快照。

每个 primitive 都有 world-space `x/y/width/height`。group 父子关系在 Intent 中以 `parentId` 表达，编译后所有坐标展平到同一 world。world 可以比屏幕大，也允许负坐标；运行时通过 viewBox 相机显示目标范围。

anchors 为 equation term、code line、chart item 和 image region 提供可聚焦 bounds。relation 带稳定 ID、端点和编译后的 SVG path。

每个 compiled frame 包含 `targetIds/mode/requiredReadableIds/requestReason/bounds`。每个 step 包含：完整 `visual`、带 `frameId` 的 camera target bounds、transition 和 timing。默认值已展开，所以恢复任意 step 不依赖播放历史。同一 frame 的 camera bounds 必须完全一致；运行时仍会对相同起终点短路。`viaOverview` 使用 world bounds 作为中间共同上下文。

Scene IR 2.0 保留旧 `focusIds` 编译结果；2.1 对应固定 frame 契约。运行时同时读取两者，但不从 Scene IR 反推或修改 Visual Intent。

编译器写临时文件并在校验成功后替换 `content/scene-ir.json`。相同 Paper IR、Visual Intent、模板目录和编译器产生相同 JSON；生成失败必须阻止已有 Scene IR 被当作本次交付。
