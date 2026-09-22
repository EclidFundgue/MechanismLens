# Runtime 开发说明

## 分层

- `engine/compiler/`：纯 ESM，模板展开、布局、路由、anchors 和 camera bounds；
- `engine/validation/`：Paper、Intent 和 generated Scene Graph 的纯校验；
- `templates/catalog.json`：模板能力的机器可读真相源；
- `runtime/*.mjs`：薄 CLI，只负责读写、打印和退出码；
- `project/src/stage/`：按 primitive kind 绘制的统一 WorldStage；
- `project/src/camera/`：可取消的 viewBox 插值；
- `project/src/App.tsx`：章节、稳定 ID cursor、字幕、自动播放和 Evidence Drawer。

不要恢复按 content kind 分发的整页 renderer。新增视觉能力优先拆成 primitive、布局策略或 treatment；模板只组合这些能力。

## 编译器不变量

- 输入不被修改；相同输入和版本得到相同输出；
- 所有默认值展开到每个 step；
- world geometry 覆盖所有步骤可能出现的对象，显隐不触发布局；
- 关系只路由已有 Paper/Intent 关系，不补造事实；
- nested object、term、line、item 和 region 都有稳定可聚焦 ID；
- 输出通过 Scene Graph 校验后才原子替换。

## Validation

`engine/validation/index.mjs` 导出 `validateSource`、`validateSceneGraph` 和 `validateData`，返回 `{ errors, warnings }`。结构错误、断链、parent 环、模板槽位、隐藏焦点、非法 geometry 和 baseline 隐藏是 error；密度与可读性指导是 warning。不要修复、去重或类型转换输入。

## Runtime

WorldStage 可以有短暂动画状态，但目标画面只由当前 compiled step 决定。算法变量变化与 scene 中前一步比较。图表始终使用全体 item 的数值域。图片失败状态随图片对象实例隔离。

## 测试

```bash
npm test
npm run test:delivery
```

至少覆盖：合同和引用边界、编译确定性、nested layout、camera 插值、各类 anchors、键盘控制，以及把脚手架移动到含空格/中文路径后的 compile → validate → TypeScript → Vite → serve。视觉改动还要在浏览器检查总览、局部、viaOverview 中间状态、detail panel 和窄屏。
