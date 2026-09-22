# Camera 与 Motion

相机的目标来自编译后的 bounds，运行时通过 SVG viewBox 在世界坐标中移动。普通步骤直接插值到目标；`viaOverview` 分两段经过 world 总览后再到目标。不同 world 重新挂载舞台，不做误导性的空间飞行。

运行时规则：

- 转场中再次切步：取消旧动画，从当前插值帧接到新目标；
- 目录跳转、刷新恢复：目标状态完整可恢复；
- 上一步：从当前帧到前一目标，不倒放历史轨迹；
- reduced motion：直接到目标，保留显隐、强调、字幕和来源；
- detail panel：桌面在右侧、小屏在下方，主图仍高亮其所属对象；
- resize：SVG 自适应 viewport，不改变 world geometry 或叙事 cursor。

编译后的 camera bounds 必须有限且正尺寸。focus 不存在或所属对象隐藏是硬错误。overview 使用 world bounds；tight、fit、contextual 使用不同 padding。

当前播放器把转场时间加到 step hold 时间后再自动前进。维护 motion 时不要建立第二套字幕或 step 计时数据，瞬态插值帧也不能变成目标状态的真相源。
