#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# stop-processes.sh — paper-explainer 进程清理（交付零遗留）
#
# 停止本次工作流启动的后台进程：dev server / preview / 浏览器 / 录屏 /
# ffmpeg / 临时 HTTP。按进程树（含进程组）先 TERM 后 KILL。
#
# 安全原则：**只杀明确指定的 PID（含其子进程树）**。端口默认只做复查，
# 绝不按端口误杀别的进程；确需清掉本项目的孤儿监听进程时，用
# --kill-port 且必须提供 --match（命令行必须包含该串，如项目路径）。
#
# Usage:
#   bash stop-processes.sh --pid <pid> [--pid <pid> ...]
#   bash stop-processes.sh --pidfile .pe-run/dev.pid [--pidfile ...]
#   bash stop-processes.sh --port 5173                    # 只检查，不杀
#   bash stop-processes.sh --kill-port 5173 --match "$PWD/presentation"
#
# Options:
#   --pid <pid>          停止该进程及其子进程树
#   --pidfile <file>     从文件读 PID（一行一个；支持 # 注释）
#   --port <port>        复查端口是否已释放（不杀进程）
#   --kill-port <port>   杀掉监听该端口的进程；必须配合 --match，只杀
#                        命令行包含 --match 串的监听进程
#   --match <substring>  端口监听进程的匹配串（如项目目录绝对路径）
#   --grace <sec>        TERM 后等待秒数（默认 5），超时升级 KILL
#   --keep-pidfiles      不删除处理过的 pidfile
#   --quiet              安静模式
#
# Exit code:
#   0  目标全部停止 / 端口全部释放
#   1  仍有残留（已在输出里列出）
#   2  参数错误（如 --kill-port 缺 --match）
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

PIDS=()
PIDFILES=()
PORTS=()
KILL_PORTS=()
MATCH=""
GRACE=5
KEEP_PIDFILES=0
QUIET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pid)        PIDS+=("${2:-}");      shift 2 ;;
    --pid=*)      PIDS+=("${1#*=}");     shift ;;
    --pidfile)    PIDFILES+=("${2:-}");  shift 2 ;;
    --pidfile=*)  PIDFILES+=("${1#*=}"); shift ;;
    --port)       PORTS+=("${2:-}");     shift 2 ;;
    --port=*)     PORTS+=("${1#*=}");    shift ;;
    --kill-port)  KILL_PORTS+=("${2:-}"); shift 2 ;;
    --kill-port=*) KILL_PORTS+=("${1#*=}"); shift ;;
    --match)      MATCH="${2:-}";        shift 2 ;;
    --match=*)    MATCH="${1#*=}";       shift ;;
    --grace)      GRACE="${2:-5}";       shift 2 ;;
    --keep-pidfiles) KEEP_PIDFILES=1;    shift ;;
    --quiet)      QUIET=1;               shift ;;
    -h|--help)    sed -n '2,33p' "$0";   exit 0 ;;
    *) echo "✗ 未知参数: $1" >&2; exit 2 ;;
  esac
done

if ((${#KILL_PORTS[@]} > 0)) && [[ -z "$MATCH" ]]; then
  echo "✗ --kill-port 必须同时提供 --match <substring>（只杀命令行匹配的监听进程）。" >&2
  echo "  仅想复查端口是否释放：改用 --port。" >&2
  exit 2
fi

log() { (( QUIET )) || echo "$@"; }
have_cmd() { command -v "$1" >/dev/null 2>&1; }

is_alive() {
  local pid="$1" st
  kill -0 "$pid" 2>/dev/null || return 1
  st="$(ps -o stat= -p "$pid" 2>/dev/null | tr -d ' ')"
  [[ "$st" == Z* ]] && return 1   # 僵尸进程不算存活
  return 0
}

TREE=()
collect_tree() {
  local pid="$1" child
  TREE+=("$pid")
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    collect_tree "$child"
  done
}

kill_one() {
  local pid="$1" sig="$2" i pgid
  is_alive "$pid" || return 0
  # setsid 启动的进程组组长：直接杀整个组
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
  if [[ -n "$pgid" && "$pgid" == "$pid" ]]; then
    kill "-$sig" -- "-$pgid" 2>/dev/null || true
  fi
  TREE=()
  collect_tree "$pid"
  for ((i=${#TREE[@]}-1; i>=0; i--)); do
    kill "-$sig" "${TREE[$i]}" 2>/dev/null || true
  done
}

port_pids() {
  local port="$1"
  if have_cmd lsof; then
    lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null || true
  elif have_cmd fuser; then
    fuser -n tcp "$port" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true
  elif have_cmd ss; then
    ss -ltnp 2>/dev/null | grep -E "[:.]$port[[:space:]]" \
      | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true
  fi
}

cmd_of() { ps -o args= -p "$1" 2>/dev/null | cut -c1-100; }

# ── 收集目标：显式 PID ──
TARGETS=()
for f in ${PIDFILES[@]+"${PIDFILES[@]}"}; do
  if [[ ! -f "$f" ]]; then
    log "  [skip] pidfile 不存在：$f"
    continue
  fi
  while IFS= read -r line; do
    line="${line%%#*}"
    line="${line//[[:space:]]/}"
    [[ "$line" =~ ^[0-9]+$ ]] && TARGETS+=("$line")
  done < "$f"
done
for p in ${PIDS[@]+"${PIDS[@]}"}; do
  [[ "$p" =~ ^[0-9]+$ ]] && TARGETS+=("$p")
done

# ── 收集目标：--kill-port（必须匹配 --match） ──
for port in ${KILL_PORTS[@]+"${KILL_PORTS[@]}"}; do
  while IFS= read -r p; do
    [[ -n "$p" ]] || continue
    c="$(cmd_of "$p")"
    if [[ "$c" == *"$MATCH"* ]]; then
      TARGETS+=("$p")
    else
      log "  [skip] 端口 $port 的 PID $p 不匹配 --match，不杀：$c"
    fi
  done < <(port_pids "$port")
done

UNIQ=()
for p in ${TARGETS[@]+"${TARGETS[@]}"}; do
  [[ "$p" == "$$" || "$p" == "1" ]] && continue   # 不杀自己 / init
  seen=0
  for q in ${UNIQ[@]+"${UNIQ[@]}"}; do
    [[ "$q" == "$p" ]] && { seen=1; break; }
  done
  (( seen )) || UNIQ+=("$p")
done

log "paper-explainer · 进程清理"
log "───────────────────────────────────────────"

if ((${#UNIQ[@]} == 0)); then
  log "  没有需要停止的进程（pid / pidfile 为空或已退出）"
else
  for p in ${UNIQ[@]+"${UNIQ[@]}"}; do
    log "  → TERM  PID $p  ($(cmd_of "$p"))"
    kill_one "$p" TERM
  done
fi

# ── 等待优雅退出 ──
deadline=$(( $(date +%s) + GRACE ))
while (( $(date +%s) < deadline )); do
  any=0
  for p in ${UNIQ[@]+"${UNIQ[@]}"}; do
    is_alive "$p" && { any=1; break; }
  done
  (( any )) || break
  sleep 0.2
done

# ── 升级 KILL + 复查 ──
LEFT=()
for p in ${UNIQ[@]+"${UNIQ[@]}"}; do
  if is_alive "$p"; then
    log "  → KILL  PID $p（TERM 超时）"
    kill_one "$p" KILL
    sleep 0.2
  fi
  is_alive "$p" && LEFT+=("$p")
done

# ── 端口复查（--port 只检查，不杀） ──
PORT_LEFT=()
for port in ${PORTS[@]+"${PORTS[@]}"} ${KILL_PORTS[@]+"${KILL_PORTS[@]}"}; do
  if ! have_cmd lsof && ! have_cmd fuser && ! have_cmd ss; then
    log "  [warn] 无法复查端口 $port（缺 lsof / fuser / ss）"
    continue
  fi
  p="$(port_pids "$port" | head -n1)"
  if [[ -n "$p" ]]; then
    log "  ✗ 端口 $port 仍被 PID $p 占用：$(cmd_of "$p")"
    PORT_LEFT+=("$port")
  else
    log "  ✓ 端口 $port 已释放"
  fi
done

if (( ! KEEP_PIDFILES )); then
  for f in ${PIDFILES[@]+"${PIDFILES[@]}"}; do
    [[ -f "$f" ]] && rm -f "$f"
  done
fi

if ((${#LEFT[@]} == 0 && ${#PORT_LEFT[@]} == 0)); then
  log "  结果：全部停止，无残留"
  exit 0
fi

log "  结果：仍有残留（进程：${LEFT[*]:-无}；端口：${PORT_LEFT[*]:-无}）"
exit 1
