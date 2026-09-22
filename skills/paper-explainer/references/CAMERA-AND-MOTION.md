# Camera 与 Motion

相机是可读性工具，不是默认叙事手段。Visual Intent 2.1 先声明固定 frame，编译器把它展开为完整 camera bounds；`emphasisIds` 只改变注意力，不参与 camera 求解。

## 决策顺序

当前 frame 无法读清必读内容时，依次尝试：

1. 精简非必要说明；
2. 调整布局与留白；
3. 折叠已经讲过的内部细节；
4. 拆成固定局部 world 或使用稳定 detail；
5. 上述方式仍不合适时，才请求带理由的新 frame。

不同 world 重新挂载舞台，不做误导性的空间飞行。普通 frame 变化直接插值到目标；`viaOverview` 仅在跨远处目标且恢复空间关系确有帮助时，分两段经过 world 总览。

## 运行时阶段

一次 step 的统一时序是：

```text
定位 frame → 相机稳定 → 显示 narration → 阅读停留
```

运行时规则：

- 当前 bounds 与目标 bounds 近似相等：直接短路，不创建动画，不增加等待；
- 转场中再次切步：取消旧动画，从当前插值帧接到新目标；
- 目录跳转、刷新恢复：目标状态完整可恢复；
- 上一步：从当前帧到前一目标，不倒放历史轨迹；
- reduced motion：直接到目标并立即进入阅读阶段；
- 自动播放：相机 settled 后才开始计算 `holdMs`；
- detail panel：一个 scene 内预留稳定区域，桌面在右侧、小屏在下方；
- resize：SVG 自适应 viewport，不改变 world geometry 或叙事 cursor。

转场期间只显示简短定位提示，不显示需要阅读的新公式、长字幕或解释。仍然只有一份 narration 和一套 step timing，不建立第二套字幕数据。

## 校验

编译后的 camera 和 frame bounds 必须有限且正尺寸。`requiredReadableIds` 必须存在、完整落在 frame 内，且其 owner 在使用该 frame 的 step 中可见。引用非默认 frame 时必须有 `required_content_unreadable`、`inspect_source_detail` 或 `restore_spatial_context` 理由。

校验器对引用、隐藏、裁切和无理由换 frame 报 error；对固定桌面/窄屏 profile 下的估算字号报 warning。字号阈值是可调工程参数，不声称适用于所有设备；浏览器验证仍需检查实际 DOM/SVG 屏幕尺寸、遮挡和布局密度。
