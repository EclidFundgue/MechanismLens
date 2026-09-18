# SUBTITLE-AND-RECORDING.md — 字幕层安装 + 静音录屏

本工作流产出**无声视频 + 字幕**。`web-video-presentation` 原生的音频
链路（Phase 3 / Checkpoint Audio）全部跳过；字幕直接复用
`narrations.ts` 这个「每 step 口播文本的唯一真相源」。

---

## 1. 字幕层是什么

四个新文件（含一个**打过补丁的 hook**）+ 一处 `App.tsx` 接线：

| 文件 | 位置 | 作用 |
|---|---|---|
| `Subtitle.tsx` / `.css` | `src/components/` | 舞台底部字幕条（在 1920×1080 内，随舞台缩放） |
| `SubtitleToggle.tsx` / `.css` | `src/components/` | 左下角悬浮开关（默认隐藏，hover 才现形，不进录制画面） |
| `useSubtitle.ts` | `src/hooks/` | 显隐状态：`localStorage` 持久化 + `S` 键 + `?subs=0/1` |
| `useAudioPlayer.ts` | `src/hooks/` | **覆盖模板版**：加 `stepKey` 依赖（见 §2.4，静音模式必须） |

**关键点**

- 字幕条渲染在 `Stage` 内部（`.stage-frame` 里），因此和舞台一起被
  `transform: scale()`，录屏比例永远正确。
- 文本来自 `ch.narrations[stepper.cursor.step]`——和自动播放、章节
  step 数同源，不会漂。
- 配色用「反色」策略：条底 `var(--text)`、字 `var(--surface)`。亮色主题
  得深底浅字，暗色主题得浅底深字，永远压得住任意章节画面，且自动跟随
  主题。
- `pointer-events: none`，字幕条不会吞掉「点击推进」。

---

## 2. 安装

### 2.1 复制文件

```bash
bash <paper-explainer>/scripts/install-subtitle.sh ./presentation
```

（`<paper-explainer>` = `~/.config/opencode/skills/paper-explainer`）

### 2.2 App.tsx 接线

在 scaffold 出来的 `presentation/src/App.tsx` 上做 4 处最小改动：

**① 新增 import**（放在其它 `./components/*` import 附近）

```tsx
import { Subtitle } from "./components/Subtitle";
import { SubtitleToggle } from "./components/SubtitleToggle";
import { useSubtitle } from "./hooks/useSubtitle";
```

**② 取状态**（在 `const stepper = useStepper(CHAPTERS);` 之后）

```tsx
const subtitle = useSubtitle();
```

**③ 把 `<Subtitle>` 放进 `<Stage>` 内**（`<div className="scene">` 之后、
`</Stage>` 之前）

```tsx
<Stage onAdvance={stepper.next}>
  <div key={ch.id} className="scene">
    <Cmp step={stepper.cursor.step} />
  </div>
  <Subtitle text={stepText} visible={subtitle.visible} />
</Stage>
```

> `stepText` 在模板里已经定义好了（`ch.narrations[stepper.cursor.step]`），
> 直接复用，不要另起变量。

**④ 挂上开关**（和 `<AutoToggle />` 并排）

```tsx
<AutoToggle mode={mode} onCycle={cycleMode} />
<SubtitleToggle visible={subtitle.visible} onToggle={subtitle.toggle} />
```

**⑤ 静音模式：不要探测不存在的音频文件**（在 `estimateMs` 上方加常量）

```tsx
const SILENT_VIDEO = true; // 无声工作流：永不请求 /audio/*.mp3
```

并把 `audioSrc` 改成：

```tsx
const audioSrc =
  SILENT_VIDEO || mode === "manual" || stepText === ""
    ? null
    : `${import.meta.env.BASE_URL}audio/${ch.id}/${stepper.cursor.step + 1}.mp3`;
```

**⑥ 给自动推进加 per-step key**（改 `useAudioPlayer` 调用）

```tsx
useAudioPlayer({
  src: audioSrc,
  mode,
  trailMs: 200,
  estimateFallbackMs: estimateMs(stepText),
  stepKey: `${ch.id}:${stepper.cursor.step}`, // ← 必须有
  onAutoAdvance,
  autoStarted,
});
```

**⑦ 自动播放从头开始 + `?reset=1`**

解决「刷新后总是从上次那页开始」和「Space 启动会跳过第 1 页」：

1. `src/App.tsx` 加一个 effect（记得 `import { useCallback, useEffect } from "react"`）：

```tsx
// 启动 Auto 时回到第 0 步：录屏必须从开头；且启动用的 Space 也被
// useStepper 当成 next，不重置就会跳过第 1 页。
useEffect(() => {
  if (autoStarted) stepper.jumpToChapter(0, 0);
}, [autoStarted, stepper.jumpToChapter]);
```

2. `src/hooks/useStepper.ts` 的 `useState` 初始化里，支持 `?reset=1`
   忽略并清除持久化游标：

```tsx
try {
  const q = new URLSearchParams(window.location.search);
  if (q.get("reset") === "1") {
    window.localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
} catch {
  /* ignore */
}
```

> 游标默认持久化在 `localStorage[STORAGE_KEY]`，所以刷新会「接着上次」。
> 想强制从头：URL 加 `&reset=1`，或按 `Home` 键回第 1 页。

### 2.4 为什么静音模式必须改这两处（否则会「卡住」）

这是实测踩到的坑，务必理解：

- 模板的 `useAudioPlayer` 用 `useEffect` 的依赖数组决定「何时为当前
  step 重新装一个推进计时器」。依赖是
  `[src, mode, trailMs, estimateFallbackMs, autoStarted]`。
- **有声时** `src` 每步都变（`.../1.mp3` → `.../2.mp3`），effect 必然
  重跑，所以没问题。
- **静音时** 若让 `src` 指向不存在的 mp3，dev server 的 SPA 回退会返回
  `200 text/html`，浏览器要等「解码失败」事件才回退到估时——每步多几秒
  抖动（§2.2 ⑤ 就是为了去掉它）。
- 但把 `audioSrc` 设为 `null` 后，**唯一的 per-step 依赖只剩
  `estimateFallbackMs`**。而它 = `字数 × 系数`，**当连续两步字数相同时
  数值不变**，effect 不重跑 → 计时器不再装 → **自动播放永久卡在该步**。
- 解法就是 §2.2 ⑥ 的 `stepKey`：`useAudioPlayer` 已加该可选参数并纳入
  依赖，`${ch.id}:${step}` 每步必变，重跑无条件发生。

> 手动模式不受影响（没有计时器）。只有 `?auto=1` 静音自动播放会卡。

### 2.5 验证

```bash
cd presentation && npm run dev
```

- 字幕条应出现在底部，随 step 切换文本；
- 按 `S` 或 hover 左下角应能开关；
- 点字幕条区域应仍然推进 step（不被拦截）；
- `?subs=0` 应默认关闭。

---

## 3. 主题微调（可选）

字幕条默认值写在 `Subtitle.css`，主题可在自己的 `tokens.css` 覆盖：

```css
--subtitle-size: 40px;      /* 字号，默认 38px */
--subtitle-bottom: 84px;    /* 离底距离，默认 72px */
--subtitle-pad-x: 240px;    /* 两侧留白，默认 200px */
--subtitle-radius: 0;       /* 直角主题可设 0 */
```

> 学术长句多，若单屏字幕常超过 2 行，优先**拆 step**（一 step 一句），
> 而不是缩小字号。

---

## 4. 静音录屏

### 4.1 自动推进（推荐，一镜到底）

模板的 `auto` 模式在**没有音频文件**时，会用 `App.tsx` 里的
`estimateMs(text)`（静音阅读 ≈ 5 字/秒）自动推进——这正好是「无声字幕
自动播放」：

```bash
# dev server 已在 localhost:5173
# 打开（reset=1 强制从第 1 页开始，不受上次游标影响）：
http://localhost:5173/?auto=1&reset=1
```

1. 页面出现 `AUTO PLAYBACK` 遮罩 → 按 `SPACE` 启动；
2. 每 step 停留时间 = `max(1500ms, 字数 × 200ms)`；
3. 字幕随 step 更新，全程无需手动点击；
4. 录屏 → 停止 → 裁掉头尾。

节奏调法（`presentation/src/App.tsx`）：

```tsx
function estimateMs(text: string): number {
  if (!text) return 1500;
  // 静音阅读节奏 ≈ 5 字/秒（比朗读的 4 字/秒略快，因为看比念快）。
  // 动画被切短就调大系数；觉得太慢就调小。
  return Math.max(1500, text.length * 200);
}
```

> 若某步动画比字幕停留时间长，**不要**加 hold 旋钮——按模板原则：
> 拆 step、加长文案、或加快动画。

### 4.2 手动推进

不想自动播放时：默认 `manual` 模式，点击 / `→` / `空格` 推进，字幕照常
显示。适合后期想自己控制节奏再剪。

### 4.3 录屏 + 裁切

```bash
# 例：用 ffmpeg 裁掉头尾（时间按实际录屏调整）
ffmpeg -ss 00:00:03 -to 00:12:40 -i raw.mkv -c copy out.mp4
```

需要浏览器窗口正好是 16:9；舞台本身会 letterbox 居中，但录制范围越接近
16:9，成品黑边越少。建议录制时把浏览器窗口调成 16:9 再全屏。

---

## 5. 可选：导出 SRT 字幕

若还要外挂字幕文件（平台上传 / 无障碍），可从 `narrations.ts` 生成 SRT。
`extract-narrations.ts` 已能扫出全部 step 文本；用它产出的
`audio-segments.json`，配合各 step 的停留时长即可拼 SRT（时间轴用
`estimateMs` 同款估算，或录制时记录真实切换时刻）。**默认不需要**——
字幕已烧进画面。

---

## 6. 自检

- [ ] `npm run build`（或 `npx tsc --noEmit`）无类型错误？
- [ ] 字幕条在**每个主题**下都压得住画面（亮/暗各验一次）？
- [ ] `S` 键、左下角开关、`?subs=0` 三种方式都生效？
- [ ] 字幕文本与 `narrations.ts` 完全一致（没有另写一份）？
- [ ] 自动模式下录屏全程无手动点击、无控制条入镜？
- [ ] **自动模式连续两步字数相同也不卡**？（跑 `?auto=1`，确认整片推进到底；
      若卡在等长两步之间，就是漏了 §2.2 ⑥ 的 `stepKey`）
- [ ] **`?auto=1&reset=1` 从第 1 页开始，且按 Space 不跳过第 1 页**？
      （漏了 §2.2 ⑦ 就会从上次那页开始 / 跳过首页）
- [ ] 空 narration 的 step 不显示空条？
