#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# init-config.sh — paper-explainer 用户配置
#
# 配置文件默认路径：~/.config/paper-explainer/config.json
# （可用环境变量 PAPER_EXPLAINER_CONFIG 覆盖）
#
# Usage:
#   bash init-config.sh                        # 无参数 = 写推荐默认值（首次运行自动调用）
#   bash init-config.sh --ensure               # 确保配置存在且完整：无则写默认；缺字段补默认；
#                                              #   旧默认（v1 auto + 空 id）自动迁移为 fixed:midnight-press
#   bash init-config.sh --show                 # 原样打印当前配置（不修改）
#   bash init-config.sh --path                 # 打印配置文件路径
#   bash init-config.sh --reset                # 删除配置（下次运行重新写默认值）
#   bash init-config.sh [options] [--force]    # 写入配置
#
# 写入选项（未指定的用默认值）：
#   --theme-mode=auto|fixed|ask     网页主题：固定一个（默认 fixed）/ 每次自动挑 /（ask 已废弃，按 auto）
#   --theme-id=<theme-id>           theme-mode=fixed 时使用的主题（默认 midnight-press）
#   --dev-mode=A|B|C                开发模式：逐章确认（A 已废弃，按 B）/ 顺序 / 并行
#   --cover=svg|generate|placeholder|ask   封面素材（ask 已废弃，按 svg）
#   --lang=auto|zh|en               讲解语言
#   --record=true|false             是否录屏（默认 false：不录屏，只交付可运行网页项目）
#   --auto-advance=true|false       录屏时自动推进（否则手动点击；仅 --record=true 时生效）
#
# 配置已存在时写入会失败（保护已有配置），要覆盖加 --force。
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

CONFIG="${PAPER_EXPLAINER_CONFIG:-$HOME/.config/paper-explainer/config.json}"

THEME_MODE="fixed"
THEME_ID="midnight-press"
THEME_ID_SET=0
DEV_MODE="B"
COVER="svg"
LANG="auto"
RECORD_ENABLED="false"
AUTO_ADVANCE="true"
FORCE=0
ACTION="write"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --show)          ACTION="show"; shift ;;
    --ensure)        ACTION="ensure"; shift ;;
    --path)          ACTION="path"; shift ;;
    --reset)         ACTION="reset"; shift ;;
    --theme-mode=*)  THEME_MODE="${1#*=}"; shift ;;
    --theme-id=*)    THEME_ID="${1#*=}"; THEME_ID_SET=1; shift ;;
    --dev-mode=*)    DEV_MODE="${1#*=}"; shift ;;
    --cover=*)       COVER="${1#*=}"; shift ;;
    --lang=*)        LANG="${1#*=}"; shift ;;
    --record=*)      RECORD_ENABLED="${1#*=}"; shift ;;
    --auto-advance=*) AUTO_ADVANCE="${1#*=}"; shift ;;
    --force)         FORCE=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

case "$ACTION" in
  path) echo "$CONFIG"; exit 0 ;;
  show)
    if [[ -f "$CONFIG" ]]; then cat "$CONFIG"; else echo "(未初始化：$CONFIG)"; fi
    exit 0
    ;;
  reset)
    rm -f "$CONFIG"
    echo "已删除配置：$CONFIG"
    exit 0
    ;;
esac

# ── --ensure：已存在的配置就地校验 / 补默认 / 迁移，然后打印 ──
if [[ "$ACTION" == "ensure" && -f "$CONFIG" ]]; then
  if ! command -v node >/dev/null 2>&1; then
    echo "  [warn] 缺 node，无法校验 / 迁移配置，按原样使用" >&2
    cat "$CONFIG"
    exit 0
  fi
  node - "$CONFIG" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error("✗ 配置解析失败（" + e.message + "）：" + file);
  process.exit(3);
}

const notes = [];
let changed = false;
const touch = (msg) => { changed = true; notes.push(msg); };
const oldVersion = typeof cfg.version === "number" ? cfg.version : 1;

if (oldVersion < 2) { cfg.version = 2; touch("配置升级到 v2"); }

if (!cfg.theme || typeof cfg.theme !== "object") { cfg.theme = {}; touch("补 theme"); }
// v1 默认值（auto + 空 id）→ 固定主题，保证跨任务深浅一致
if (oldVersion < 2 && cfg.theme.mode === "auto" && !cfg.theme.id) {
  cfg.theme.mode = "fixed";
  cfg.theme.id = "midnight-press";
  touch("主题 auto → fixed:midnight-press（跨任务统一深浅）");
}
if (!["auto", "fixed", "ask"].includes(cfg.theme.mode)) { cfg.theme.mode = "fixed"; touch("修正 theme.mode → fixed"); }
if (typeof cfg.theme.id !== "string") { cfg.theme.id = ""; touch("补 theme.id"); }
if (cfg.theme.mode === "fixed" && !cfg.theme.id) { cfg.theme.id = "midnight-press"; touch("补 theme.id=midnight-press"); }

if (!cfg.devMode) { cfg.devMode = "B"; touch("补 devMode=B"); }
if (!cfg.materials || typeof cfg.materials !== "object") { cfg.materials = {}; touch("补 materials"); }
if (!cfg.materials.cover) { cfg.materials.cover = "svg"; touch("补 materials.cover=svg"); }
if (!cfg.narration || typeof cfg.narration !== "object") { cfg.narration = {}; touch("补 narration"); }
if (!cfg.narration.language) { cfg.narration.language = "auto"; touch("补 narration.language=auto"); }
if (!cfg.recording || typeof cfg.recording !== "object") { cfg.recording = {}; touch("补 recording"); }
if (typeof cfg.recording.enabled !== "boolean") { cfg.recording.enabled = false; touch("补 recording.enabled=false"); }
if (typeof cfg.recording.autoAdvance !== "boolean") { cfg.recording.autoAdvance = true; touch("补 recording.autoAdvance=true"); }
if (!cfg.dependencies || typeof cfg.dependencies !== "object") { cfg.dependencies = {}; touch("补 dependencies"); }
if (!cfg.dependencies.wvpSource) {
  cfg.dependencies.wvpSource = "https://github.com/ConardLi/garden-skills#skills/web-video-presentation";
  touch("补 dependencies.wvpSource");
}
if (!cfg.dependencies.dtfSource) {
  cfg.dependencies.dtfSource = "https://github.com/Leonxlnx/taste-skill#skills/taste-skill";
  touch("补 dependencies.dtfSource");
}

if (changed) {
  cfg.updatedAt = new Date().toISOString();
  if (!cfg.createdAt) cfg.createdAt = cfg.updatedAt;
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
  console.error("已更新配置：" + notes.join("；"));
}
console.log(JSON.stringify(cfg, null, 2));
NODE
  exit 0
fi

# ── ensure 且无配置 → 与无参数写入同一路径（写默认值） ──
if [[ -f "$CONFIG" && "$FORCE" != "1" ]]; then
  echo "配置已存在：$CONFIG" >&2
  echo "直接编辑该文件即可；要按参数重写加 --force。" >&2
  exit 1
fi

case "$THEME_MODE" in auto|fixed|ask) ;; *) echo "bad --theme-mode: $THEME_MODE" >&2; exit 2 ;; esac
case "$DEV_MODE" in A|B|C) ;; *) echo "bad --dev-mode: $DEV_MODE" >&2; exit 2 ;; esac
case "$COVER" in svg|generate|placeholder|ask) ;; *) echo "bad --cover: $COVER" >&2; exit 2 ;; esac
case "$LANG" in auto|zh|en) ;; *) echo "bad --lang: $LANG" >&2; exit 2 ;; esac
case "$RECORD_ENABLED" in true|false) ;; *) echo "bad --record: $RECORD_ENABLED" >&2; exit 2 ;; esac
case "$AUTO_ADVANCE" in true|false) ;; *) echo "bad --auto-advance: $AUTO_ADVANCE" >&2; exit 2 ;; esac

if [[ "$THEME_MODE" == "fixed" ]]; then
  if [[ -z "$THEME_ID" ]]; then
    echo "--theme-mode=fixed 需要 --theme-id=<theme-id>（见 WVP themes/ 目录）" >&2
    exit 2
  fi
  if [[ ! "$THEME_ID" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "bad --theme-id: $THEME_ID" >&2
    exit 2
  fi
elif [[ "$THEME_ID_SET" != "1" ]]; then
  THEME_ID=""   # auto / ask 模式下未显式指定则不带 id
fi

NOW="$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)"
mkdir -p "$(dirname "$CONFIG")"

cat > "$CONFIG" <<EOF
{
  "version": 2,
  "theme": { "mode": "$THEME_MODE", "id": "$THEME_ID" },
  "devMode": "$DEV_MODE",
  "materials": { "cover": "$COVER" },
  "narration": { "language": "$LANG" },
  "recording": { "enabled": $RECORD_ENABLED, "autoAdvance": $AUTO_ADVANCE },
  "dependencies": {
    "wvpSource": "https://github.com/ConardLi/garden-skills#skills/web-video-presentation",
    "dtfSource": "https://github.com/Leonxlnx/taste-skill#skills/taste-skill"
  },
  "createdAt": "$NOW",
  "updatedAt": "$NOW"
}
EOF

echo "已写入配置：$CONFIG"
cat "$CONFIG"
