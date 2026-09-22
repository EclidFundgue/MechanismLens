# 自包含运行时与交付

## 两种运行模式

开发模式仅供生成和修改时使用：

```bash
cd <output>/project
npm run dev
```

用户模式使用已构建的 `site/`：

- Windows：`open.cmd`；
- macOS：`open.command`；
- Linux：`./open.sh`。

启动脚本不会调用 Vite dev server。它使用 `runtime/serve.mjs`，找不到 Node 时
回退 `runtime/serve.py`，自动选择空闲 localhost 端口并打开浏览器。

如果 `site/index.html` 不存在，启动脚本会在首次打开时执行安装和构建；正常
Skill 交付必须提前构建，所以用户通常看不到该过程。

## 构建

```bash
node "$SELF/scripts/build-project.mjs" <output-dir>
```

内部顺序：

```text
npm install（缺 node_modules 时）
→ source validation
→ compile-content.mjs
→ generated Scene IR validation
→ TypeScript
→ Vite build --base ./
→ site/
```

`base: "./"` 保证静态资源路径与端口、目录名无关。

## Runtime 键盘操作

| 键 | 动作 |
|---|---|
| `→` / `Space` | 下一 step |
| `←` | 上一 step |
| `Home` | 回到第一 scene 第一 step |
| `S` | 字幕开关 |
| `E` | Evidence Drawer 开关 |

左右方向键在页面主体、按钮和链接获得焦点时仍切换 step；Space 在按钮或链接上
保留原生激活行为。事件已被处理、输入法组合输入、长按重复、按下
`Ctrl` / `Meta` / `Alt`，或焦点位于输入框和可编辑区域时不接管。只有实际执行
播放器动作时才阻止默认行为；`Shift` 不统一禁用，因此大写 `S` / `E` 可用。

URL 参数：

- `?reset=1`：忽略上次游标，从第一步开始；
- `?auto=1&reset=1`：从头自动播放。

## 来源跳转

`EvidenceDrawer` 根据 Paper IR 自动产生链接：

```text
evidence.url
  ↓ 缺失
localPdfPath#page=N
  ↓ 缺失
pdfUrl#page=N
  ↓ 缺失
originalUrl#anchor
  ↓ 缺失
originalUrl
```

Chrome、Edge、Firefox 的内置 PDF viewer 支持 `#page=N`。部分网站可能忽略
fragment，Drawer 中必须同时显示 section、page 和 excerpt，保证仍可人工定位。

## 数据校验

```bash
cd <output>/project
npm run validate
```

校验器覆盖：

- Paper、Visual Intent 与 generated Scene IR 版本和 paperId 一致；
- 模板、world、object、relation、detail、scene 和 step 引用存在；
- parent 无环，模板 required kinds 满足；
- narration、claim、evidence 和技术对象绑定有效；
- 编译几何、relation path 和 camera bounds 有限且为正尺寸。

此外检查重复 ID/引用、focus 可见性、活动关系、比较基线、原图 region、detail
归属和 step state target。错误带稳定 `code`、JSON path，以及可选的 layer、
template、object、scene 和 step ID；过密比较等属于 warning，不阻断构建。
v1 输入返回版本错误，不做隐式兼容或自动改写。

JSON Schema 用于编辑器和自动化集成；`compile-content.mjs` 和
`validate-data.mjs` 是构建时硬门槛。

## 交付前检查

- `site/index.html` 存在；
- `npm run validate` 和 `npm run build` 成功；
- 三个平台启动脚本存在；
- 至少抽查一个网页 anchor 和两个 PDF 页码；
- 本地 PDF 存在时，构建后的 `site/paper/original.pdf` 存在；
- 当前 step 的 evidence 数量正确；
- 没有遗留生成阶段的 dev server。

仓库维护者可在仓库根目录运行：

```bash
npm test
npm run test:delivery
```

前者执行纯函数和回归测试；后者把模板复制到仓库外的临时目录（目录名含空格与
中文），使用生成目录自己的校验器，完成安装、构建，并通过生成目录的静态服务器
请求 `site/`。测试框架不进入交付模板的运行依赖。

## 发布到静态托管

`site/` 可直接上传到 GitHub Pages、Netlify 或任意静态服务器。若项目包含本地
PDF，发布前确认论文许可证与文件大小；不适合发布 PDF 时清空
`localPdfPath`，让来源跳转使用在线 `pdfUrl`。
