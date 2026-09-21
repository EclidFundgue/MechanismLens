# 修改已有讲解

修改遵循一个简单链路：

```text
paper.md / 原论文
  → paper-ir.json
  → scene-ir.json
  → npm run build
  → site/
```

## 稳定 ID

已经交付的 Paper IR 对象、scene 和 step ID 非必要不改。插入新 step 时创建
新的语义 ID；不要根据当前位置重排成 `step1`、`step2`，否则游标、审计和用户
反馈定位都会失效。

## 修改类型

| 需求 | 最小改动 |
|---|---|
| 改字幕措辞 | Scene IR 对应 step narration + `script.md` |
| 展开一节 | Paper IR 补对象/evidence → Scene IR 插 step 或 scene → Markdown 副本 |
| 事实或数字纠错 | 回原论文核对 → Paper IR → Scene IR payload/narration |
| 调整图中聚焦 | Scene IR `focusIds` / callout，不复制 renderer |
| 换论文图 | `project/public/assets/` + figure item + Scene IR src |
| 调整来源跳转 | Paper IR evidence/page/url/anchor |
| 新增场景能力 | 扩展 schema、types、renderer、示例和文档，然后重新构建 |

## 展开某一节

1. 从用户说法定位 scene ID 和 step ID；
2. 回 Paper IR 找可用 claim、module、equation、experiment；
3. 内容不足时回原文补 evidence；
4. 在 Scene IR 同一 scene 插 step，或在语义改变时插新 scene；
5. 更新 script/outline 的人类可读副本；
6. 运行 `npm run validate` 和 `npm run build`；
7. 从插入点前一个 step 连续播放到后一个 step；
8. 在 `revisions.md` 追加记录。

## 重建与缓存

运行时游标按 `paper.id` 存储。只增删 step 不必手动修改缓存版本；被删除的
游标越界时 App 会自动收敛到有效范围。想强制从头验证，使用：

```text
?reset=1
```

## 修改记录

```markdown
## 2026-09-21 · 展开算法循环
- 反馈：算法部分太快
- Paper IR：新增 evidence.algorithm-loop / claim.iterative-update
- Scene IR：scene.algorithm 插入 step.update-state
- 构建：validate ✓ / build ✓ / source link ✓
```

## 完成标准

- IR 引用无断链；
- 上屏数字来源覆盖率仍为 100%；
- 新 step 有 narration 和正确 focus；
- 来源按钮打开正确原文位置；
- `site/` 已重新构建；
- `revisions.md` 已追加。
