#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# check-deps.sh — paper-explainer 依赖自检
#
# 检查依赖 skill（web-video-presentation / design-taste-frontend，
# 可选 gpt-image-2 / paper-assist）与运行时工具
# （node / npm / git / pdftotext / python3）。
#
# ffmpeg / 浏览器属于「仅录屏需要」的可选项：默认只报告，不阻塞、
# 不建议安装；用户明确要求录屏时才安装。
#
# Usage:
#   bash check-deps.sh [--skills-dir <dir>]
#
# Exit code:
#   0  必需依赖齐全（推荐/可选缺失只在报告里列出）
#   1  有必需依赖缺失
#
# 环境变量:
#   PAPER_EXPLAINER_SKILLS_DIR  额外优先搜索的 skill 目录
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

SKILLS_DIR_OVERRIDE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skills-dir) SKILLS_DIR_OVERRIDE="${2:-}"; shift 2 ;;
    --skills-dir=*) SKILLS_DIR_OVERRIDE="${1#*=}"; shift ;;
    *) shift ;;
  esac
done

SKILL_DIRS=()
[[ -n "$SKILLS_DIR_OVERRIDE" ]] && SKILL_DIRS+=("$SKILLS_DIR_OVERRIDE")
[[ -n "${PAPER_EXPLAINER_SKILLS_DIR:-}" ]] && SKILL_DIRS+=("$PAPER_EXPLAINER_SKILLS_DIR")
SKILL_DIRS+=("$HOME/.config/opencode/skills" "$HOME/.claude/skills" "$HOME/.agents/skills" ".opencode/skills")

find_skill() {
  local name="$1" d
  for d in "${SKILL_DIRS[@]}"; do
    [[ -n "$d" && -f "$d/$name/SKILL.md" ]] && { echo "$d/$name"; return 0; }
  done
  return 1
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

find_cmd() {
  local c
  for c in "$@"; do have_cmd "$c" && { echo "$c"; return 0; }; done
  return 1
}

MISSING_REQUIRED=()
MISSING_RECOMMENDED=()
HINTS=()

echo "paper-explainer · 依赖自检"
echo "───────────────────────────────────────────"

check_skill() {
  local name="$1" level="$2" path
  if path="$(find_skill "$name")"; then
    printf '  [OK]       skill  %-26s %s\n' "$name" "$path"
  elif [[ "$level" == "required" ]]; then
    printf '  [MISS]     skill  %-26s\n' "$name"
    MISSING_REQUIRED+=("skill:$name")
    HINTS+=("skill:$name → bash scripts/install-deps.sh --skills=$name（自动安装，无需确认）")
  else
    printf '  [OPT-MISS] skill  %-26s (可选，缺失不阻塞)\n' "$name"
  fi
}

check_skill web-video-presentation required
check_skill design-taste-frontend required
check_skill gpt-image-2 optional
check_skill paper-assist optional

echo "───────────────────────────────────────────"

if have_cmd node; then
  NODE_V="$(node -v 2>/dev/null || echo '?')"
  NODE_MAJOR="${NODE_V#v}"; NODE_MAJOR="${NODE_MAJOR%%.*}"
  if [[ "$NODE_MAJOR" =~ ^[0-9]+$ ]] && (( NODE_MAJOR < 18 )); then
    printf '  [WARN]     node   %-26s 需要 >= 18（Vite 要求）\n' "$NODE_V"
    MISSING_REQUIRED+=("node")
    HINTS+=("node → 安装 Node LTS（nvm / nodesource / https://nodejs.org）")
  else
    printf '  [OK]       node   %s\n' "$NODE_V"
  fi
else
  printf '  [MISS]     node   %-26s\n' ""
  MISSING_REQUIRED+=("node")
  HINTS+=("node → 安装 Node LTS（nvm / nodesource / https://nodejs.org）")
fi

if have_cmd npm; then
  printf '  [OK]       npm    %s\n' "$(npm -v 2>/dev/null || echo '?')"
else
  printf '  [MISS]     npm    %-26s\n' ""
  MISSING_REQUIRED+=("npm")
  HINTS+=("npm → 随 Node LTS 一起安装")
fi

if have_cmd git; then
  printf '  [OK]       git    %s\n' "$(git --version 2>/dev/null | awk '{print $3}')"
else
  printf '  [MISS]     git    %-26s (自动安装依赖 skill 需要)\n' ""
  MISSING_REQUIRED+=("git")
  HINTS+=("git → apt install git / brew install git")
fi

if DOWNLOADER="$(find_cmd curl wget)"; then
  printf '  [OK]       fetch  %s\n' "$DOWNLOADER"
else
  printf '  [MISS]     fetch  %-26s (拉取 arXiv LaTeX 源码需要 curl 或 wget)\n' ""
  MISSING_RECOMMENDED+=("curl-or-wget")
  HINTS+=("curl → apt install curl / brew install curl")
fi

if have_cmd ffmpeg; then
  printf '  [OK]       ffmpeg %s\n' "$(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
else
  printf '  [OPT-MISS] ffmpeg %-26s (可选：仅录屏时需要，默认不录屏)\n' ""
fi

if BROWSER="$(find_cmd chromium chromium-browser google-chrome google-chrome-stable chrome)"; then
  printf '  [OK]       browser %s\n' "$BROWSER"
else
  printf '  [OPT-MISS] browser %-26s (可选：仅录屏时需要，默认不录屏)\n' ""
fi

if have_cmd pdftotext; then
  printf '  [OK]       PDF    pdftotext\n'
elif have_cmd python3 && { python3 -c "import fitz" >/dev/null 2>&1 || python3 -c "import pymupdf" >/dev/null 2>&1; }; then
  printf '  [OK]       PDF    python3 + pymupdf\n'
else
  printf '  [MISS]     PDF    %-26s (解析 PDF 论文需要 pdftotext 或 pymupdf)\n' ""
  MISSING_RECOMMENDED+=("pdf-extract")
  HINTS+=("PDF 抽取 → apt install poppler-utils（pdftotext）/ python3 -m pip install pymupdf")
fi

if have_cmd python3; then
  printf '  [OK]       python3 %s\n' "$(python3 --version 2>/dev/null | awk '{print $2}')"
fi

echo "───────────────────────────────────────────"

if ((${#MISSING_REQUIRED[@]} > 0)); then
  echo "缺失（必需）：${MISSING_REQUIRED[*]}"
fi
if ((${#MISSING_RECOMMENDED[@]} > 0)); then
  echo "缺失（推荐，可降级继续）：${MISSING_RECOMMENDED[*]}"
fi

if ((${#MISSING_REQUIRED[@]} == 0 && ${#MISSING_RECOMMENDED[@]} == 0)); then
  echo "结论：依赖齐全，可以开工。"
else
  echo
  echo "修复建议："
  for h in "${HINTS[@]}"; do echo "  - $h"; done
  echo
  echo "注意：paper-explainer 为一步到位流程——缺失的依赖 skill / 系统工具由 agent 自动安装，装不上才降级并汇报。"
fi

if ((${#MISSING_REQUIRED[@]} > 0)); then
  exit 1
fi
exit 0
