# 修改已有讲解

判断问题属于哪一层：

| 反馈 | 修改位置 |
|---|---|
| 论文事实、数字或来源错误 | 核对原文后改 `paper-ir.json` |
| 代码实体、关系或片段错误 | 重新读取源码后改 `code-ir.json` |
| 条件、机制步骤、状态变化或未知项错误 | 改 `mechanism-ir.json` |
| 字幕、顺序、模板、frame、emphasis、显隐、detail 或转场 | 改 `visual-intent.json` |
| 多类讲解都会遇到的布局、原语或编译问题 | 改 `engine/` 或 `project/src/stage/` |
| generated geometry 或 camera 错误 | 修 Intent 约束或编译器；不手改 `scene-ir.json` |

修改后运行项目的 `npm run build`，它会重新生成 Scene IR 与 source bundle。来源对象、mechanism、world、scene、step ID 非必要不改；插入新内容使用新的语义 ID。cursor 使用 `sceneId + stepId`，删除目标时运行时回退到有效开头。

浏览器至少从改动前一步播放到后一步，并直接跳到目标 step 比较最终状态。视觉改动检查固定 frame、必要局部、detail 预留区、字幕 settled 时序、窄屏与 reduced motion；事实改动检查 Evidence Drawer 跳转。

在 `revisions.md` 记录日期、用户反馈、来源/Mechanism/Intent/engine 改动、build 结果和来源核查。完成标准：引用无断链、关键来源覆盖保持 100%、生成文件已重编译、站点已构建、没有遗留 dev server。
