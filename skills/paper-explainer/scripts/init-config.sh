#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# init-config.sh — paper-explainer 用户配置
#
# 配置文件默认路径：~/.config/paper-explainer/config.json
# （可用环境变量 PAPER_EXPLAINER_CONFIG 覆盖）
#
# Usage:
#   bash init-config.sh                        # 无参数 = 写推荐默认值（首次运行自动调用）
#   bash init-config.sh --show                 # 打印当前配置
#   bash init-config.sh --path                 # 打印配置文件路径
#   bash init-config.sh --reset                # 删除配置（下次运行重新写默认值）
#   bash init-config.sh [options] [--force]    # 写入配置
#
# 写入选项（未指定的用默认值）：
#   --theme-mode=auto|fixed|ask     网页主题：自动挑 / 固定一个 /（ask 已废弃，按 auto）
#   --theme-id=<theme-id>           theme-mode=fixed 时必填
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

THEME_MODE="auto"
THEME_ID=""
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
    --path)          ACTION="path"; shift ;;
    --reset)         ACTION="reset"; shift ;;
    --theme-mode=*)  THEME_MODE="${1#*=}"; shift ;;
    --theme-id=*)    THEME_ID="${1#*=}"; shift ;;
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
fi

NOW="$(date -Iseconds 2>/dev/null || date +%Y-%m-%dT%H:%M:%S%z)"
mkdir -p "$(dirname "$CONFIG")"

cat > "$CONFIG" <<EOF
{
  "version": 1,
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
