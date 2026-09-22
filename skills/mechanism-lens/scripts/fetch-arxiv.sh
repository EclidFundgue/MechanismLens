#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# fetch-arxiv.sh — 下载并解压 arXiv LaTeX 源码（MechanismLens 素材源）
#
# Usage:
#   bash fetch-arxiv.sh <arxiv-url-or-id> <project-root>
#   bash fetch-arxiv.sh --help
#
# 支持的输入：
#   https://arxiv.org/abs/2301.12345v2
#   https://arxiv.org/pdf/2301.12345
#   https://arxiv.org/e-print/2301.12345
#   arxiv:2301.12345 / 2301.12345v1 / hep-th/9901001
#
# project-root 必须是已初始化的讲解项目；产出固定在 sources/arxiv/：
#   source.tar.gz   原始下载包
#   src/            解压后的源码（.tex / .bbl / figures/ ...）
#   MAIN_TEX        识别到的主 .tex 相对路径（若有）
#
# 依赖：curl 或 wget；tar / gzip（系统自带）。
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

usage() {
  sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 0
}

[[ $# -eq 0 || "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage

INPUT="$1"
if [[ $# -ne 2 ]]; then
  echo "✗ 必须指定已初始化的项目根目录；不再默认下载到 ./paper-src。" >&2
  exit 2
fi
ROOT="$(cd "$2" && pwd -P)"
if [[ ! -f "$ROOT/content/paper-ir.json" || ! -f "$ROOT/project/package.json" ]]; then
  echo "✗ 请先运行 scaffold-project.mjs，再将项目根目录作为第二个参数。" >&2
  exit 2
fi
# Reject redirected source directories before creating or downloading anything.
if [[ -L "$ROOT/sources" || -L "$ROOT/sources/arxiv" ]]; then
  echo "✗ sources/ 和 sources/arxiv/ 不能是符号链接。" >&2
  exit 2
fi
OUT="$ROOT/sources/arxiv"
if [[ -e "$OUT" ]]; then
  echo "✗ 素材目录已存在，保留已有下载：$OUT" >&2
  exit 2
fi

# ── 从 URL / ID 中提取 arXiv ID ──
ID="$(printf '%s' "$INPUT" | sed -E \
  -e 's#^https?://(www\.)?arxiv\.org/(abs|pdf|e-print)/##' \
  -e 's#^arxiv:##' \
  -e 's#\?.*$##' \
  -e 's#\.pdf$##' \
  -e 's#/$##')"

if [[ ! "$ID" =~ ^([0-9]{4}\.[0-9]{4,5}(v[0-9]+)?|[a-z.-]+/[0-9]{7}(v[0-9]+)?)$ ]]; then
  echo "✗ 无法识别的 arXiv ID：'$ID'（来自 '$INPUT'）" >&2
  echo "  支持 2301.12345 / 2301.12345v2 / hep-th/9901001 或对应 URL。" >&2
  exit 2
fi

URL="https://arxiv.org/e-print/$ID"
mkdir -p "$OUT"
ARCHIVE="$OUT/source.tar.gz"

echo "▸ arXiv ID：$ID"
echo "▸ 下载：$URL"

if command -v curl >/dev/null 2>&1; then
  curl -fL --retry 3 --connect-timeout 20 \
    -A "MechanismLens/1.0 (https://github.com/EclidFundgue/MechanismLens)" \
    -o "$ARCHIVE" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -q --tries=3 --timeout=20 -U "MechanismLens/1.0" -O "$ARCHIVE" "$URL"
else
  echo "✗ 需要 curl 或 wget（装一个再跑）" >&2
  exit 1
fi

# ── 解包：tar.gz / 单文件 gzip / 单文件 tex ──
mkdir -p "$OUT/src"

echo "▸ 解包"
if tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
  tar -xzf "$ARCHIVE" -C "$OUT/src"
  echo "  tar.gz → $OUT/src/"
elif gzip -t "$ARCHIVE" >/dev/null 2>&1; then
  gunzip -c "$ARCHIVE" > "$OUT/src/main.tex"
  echo "  单文件 gzip → $OUT/src/main.tex"
else
  cp "$ARCHIVE" "$OUT/src/main.tex"
  echo "  单文件 → $OUT/src/main.tex"
fi

# ── 找主 .tex（含 \documentclass）──
MAIN=""
for f in "$OUT/src"/*.tex; do
  [[ -f "$f" ]] || continue
  if grep -q '\\documentclass' "$f" 2>/dev/null; then
    MAIN="${f#"$OUT/src/"}"
    break
  fi
done
if [[ -z "$MAIN" ]]; then
  MAIN="$(cd "$OUT/src" && find . -name '*.tex' -print -quit | sed 's#^\./##')"
fi
[[ -n "$MAIN" ]] && printf '%s\n' "$MAIN" > "$OUT/MAIN_TEX"

N_TEX="$(find "$OUT/src" -name '*.tex' | wc -l | tr -d ' ')"
N_FIG="$(find "$OUT/src" \( -name '*.pdf' -o -name '*.png' -o -name '*.jpg' \
  -o -name '*.jpeg' -o -name '*.eps' -o -name '*.svg' \) | wc -l | tr -d ' ')"

echo
echo "✓ 源码就绪：$OUT/src"
echo "  主文件   ${MAIN:-未识别（自行搜索 \\documentclass）}"
echo "  .tex     $N_TEX 个"
echo "  图文件   $N_FIG 个"
echo
echo "下一步（见 references/PAPER-ASSETS.md §1）："
echo "  · 公式 / 图注 / 原文 → 直接从 .tex 取"
echo "  · 矢量图 → pdftocairo -svg <fig.pdf> assets/<fig>.svg"
if command -v pdftocairo >/dev/null 2>&1; then
  echo "  （pdftocairo 已就绪）"
else
  echo "  （缺 pdftocairo：apt install poppler-utils）"
fi
