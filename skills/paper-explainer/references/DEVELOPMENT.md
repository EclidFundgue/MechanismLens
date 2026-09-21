# Runtime 开发说明

## Renderer 边界

`project/src/components/SceneRenderer.tsx` 只根据 `scene.type` 分发。六类 renderer
位于 `components/renderers/`，共享的轻量类型与展示辅助函数放在 `shared.ts`，公式
排版放在 `MathText.tsx`。坐标、可见集合和 region 选择等纯计算继续放在
`components/renderer-model.ts`。

renderer 必须只从当前 `scene`、`step` 和 Scene IR 中相邻的 `previousStep` 得出
画面。不要在组件内累积播放历史或创建另一份可序列化场景状态。图片加载失败可以
保留为局部 UI 状态；增强图片组件的 `key` 必须随图片地址变化，以隔离失败状态。

新增或修改 renderer 时，至少补一项纯函数/语义回归测试，并确认：

- 省略可见列表使用默认集合，显式 `[]` 保持为空；
- `regionId` 的省略、`null`、字符串三态不混淆；
- 比较坐标域来自全体条目，不随逐步显现改变；
- 算法变量变化只与 Scene IR 中的前一步比较。

## Validation 边界

`runtime/validation/index.mjs` 导出纯函数 `validateData(paper, sceneIR)`，返回
`{ errors, warnings }`。`validate-data.mjs` 只负责读取文件、打印和退出码。

基础类型、ID 和引用工具位于 `helpers.mjs`；Paper IR 规则位于 `paper.mjs`；
Scene IR 通用与场景专属规则位于 `scenes.mjs`。校验顺序必须先确认结构，再收集
合法 ID，随后检查引用，最后检查显隐、基线、边端点和区域等关系。不要修复、去重
或类型转换用户数据。

## 测试

在仓库根目录执行：

```bash
npm test
npm run test:delivery
```

`tests/runtime/fixtures/` 分为 baseline、legacy、invalid。新增硬规则时，把合法与
非法边界分别写入 fixture 或纯函数测试；内容质量建议应断言为 warning。交付集成
测试必须使用脚手架复制后的 runtime，不能回指仓库源码。
