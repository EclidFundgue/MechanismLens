#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# install-deps.sh — 安装 paper-explainer 依赖的 skill
#
# 由 paper-explainer 在依赖缺失时自动调用（一步到位流程，无需用户确认）。
# 默认安装缺失的：
#   web-video-presentation  ← ConardLi/garden-skills
#   design-taste-frontend   ← Leonxlnx/taste-skill
#
# Usage:
#   bash install-deps.sh [--skills=wvp,dtf] [--skills-dir <dir>]
#                        [--wvp-src <url|path>] [--dtf-src <url|path>]
#                        [--force]
#
# SRC 支持：
#   https://github.com/<owner>/<repo>[#<subpath>]   git 仓库（可带子目录）
#   /abs/or/relative/path[#<subpath>]               本地目录
#
# 默认安装到 ~/.config/opencode/skills（可用 --skills-dir 覆盖）。
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

SKILLS_DIR="$HOME/.config/opencode/skills"
WVP_SRC="https://github.com/ConardLi/garden-skills#skills/web-video-presentation"
DTF_SRC="https://github.com/Leonxlnx/taste-skill#skills/taste-skill"
WANT="wvp,dtf"
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skills=*)     WANT="${1#*=}"; shift ;;
    --skills)       WANT="${2:-}"; shift 2 ;;
    --skills-dir=*) SKILLS_DIR="${1#*=}"; shift ;;
    --skills-dir)   SKILLS_DIR="${2:-}"; shift 2 ;;
    --wvp-src=*)    WVP_SRC="${1#*=}"; shift ;;
    --wvp-src)      WVP_SRC="${2:-}"; shift 2 ;;
    --dtf-src=*)    DTF_SRC="${1#*=}"; shift ;;
    --dtf-src)      DTF_SRC="${2:-}"; shift 2 ;;
    --force)        FORCE=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

log() { printf '%s\n' "$*"; }

# 只拉取需要的子目录（大仓库全量 clone 很慢）；失败则退回普通浅克隆。
clone_subdir() {
  local url="$1" sub="$2" dest="$3"
  if [[ -n "$sub" ]] && git clone --depth 1 --filter=blob:none --sparse "$url" "$dest" >/dev/null 2>&1; then
    if git -C "$dest" sparse-checkout set "$sub" >/dev/null 2>&1; then
      return 0
    fi
    rm -rf "$dest"
  fi
  git clone --depth 1 "$url" "$dest" >/dev/null 2>&1
}

install_one() {
  local key="$1" name="$2" src="$3" subpath="$4"
  local target="$SKILLS_DIR/$name"

  if [[ -f "$target/SKILL.md" && "$FORCE" != "1" ]]; then
    log "  [SKIP] $name 已存在（--force 可重装）：$target"
    return 0
  fi

  local url="$src" sub="$subpath" src_dir
  if [[ "$src" == *"#"* ]]; then
    url="${src%%#*}"; sub="${src#*#}"
  fi

  if [[ -d "$url" ]]; then
    src_dir="$(cd "$url" && pwd)"
    if [[ ! -f "$src_dir/SKILL.md" && -n "$sub" && -f "$src_dir/$sub/SKILL.md" ]]; then
      src_dir="$src_dir/$sub"
    fi
  else
    log "  [GIT]  clone $url ..."
    if ! clone_subdir "$url" "$sub" "$TMP/$key"; then
      log "  [FAIL] clone 失败：$url"
      return 1
    fi
    src_dir="$TMP/$key/$sub"
  fi

  if [[ ! -f "$src_dir/SKILL.md" ]]; then
    log "  [FAIL] 找不到 $src_dir/SKILL.md（检查 src 与子路径）"
    return 1
  fi

  [[ "$FORCE" == "1" ]] && rm -rf "$target"
  mkdir -p "$SKILLS_DIR"
  cp -R "$src_dir" "$target"

  local fname
  fname="$(awk -F': *' '/^name:/{print $2; exit}' "$target/SKILL.md" | tr -d '\r')"
  if [[ "$fname" != "$name" ]]; then
    log "  [WARN] $target 的 frontmatter name=$fname（目录名 $name），确认可用性"
  fi
  log "  [OK]   $name → $target"
}

STATUS=0
log "安装依赖 skill 到：$SKILLS_DIR"

if [[ ",$WANT," == *",wvp,"* || ",$WANT," == *",web-video-presentation,"* ]]; then
  install_one wvp "web-video-presentation" "$WVP_SRC" "skills/web-video-presentation" || STATUS=1
fi
if [[ ",$WANT," == *",dtf,"* || ",$WANT," == *",design-taste-frontend,"* ]]; then
  install_one dtf "design-taste-frontend" "$DTF_SRC" "skills/taste-skill" || STATUS=1
fi

if [[ "$STATUS" == "0" ]]; then
  log
  log "完成。重启 opencode 后新 skill 才会被加载（配置在启动时读取）。"
else
  log
  log "有安装失败项，请检查网络或改用 --wvp-src / --dtf-src 指定其它来源。"
fi
exit "$STATUS"
