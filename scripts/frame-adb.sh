#!/usr/bin/env sh
# Drive this SDK 19 frame without storing its address or serial in the project.
# This helper needs ordinary host ADB permissions; it does not bypass a sandbox.
set -eu

_script=$0
case $_script in /*) ;; *) _script=$(pwd)/$_script ;; esac
while [ -L "$_script" ]; do
  _link=$(readlink "$_script") || break
  case $_link in /*) _script=$_link ;; *) _script=$(dirname "$_script")/$_link ;; esac
done
. "$(CDPATH= cd -- "$(dirname "$_script")" && pwd)/lib.sh"

usage() {
  cat <<'EOF'
Usage: sh scripts/frame-adb.sh COMMAND [ARGS]
  status                      Read build, Android version, and foreground app
  open URL                    Wake and open an http(s) URL in the stock browser
  tap X Y                     Tap screen coordinates
  swipe X1 Y1 X2 Y2 [MS]      Draw/swipe (default 500 ms)
  key CODE                    Send a numeric Android key code (224 wakes)
  screenshot /tmp/NAME.png     Save outside the project in the OS temporary directory

Uses the single connected device, or AGENDA_FRAME_IP to connect over Wi-Fi.
AGENDA_FRAME_SERIAL optionally verifies ro.serialno as well as the build.
Every command checks build Classic15-Pro_A33.080124_V02 before acting.
EOF
}
fail() { echo "$*" >&2; exit 1; }
number() {
  case "$1" in ''|*[!0-9]*) fail 'Coordinates, duration, and key codes must be nonnegative integers.' ;; esac
}
[ "$#" -gt 0 ] || { usage; exit 2; }
action=$1
shift
# Validate all inputs before contacting the device.
case "$action" in
  help|--help|-h) usage; exit 0 ;;
  status) [ "$#" -eq 0 ] || { usage; exit 2; } ;;
  open)
    [ "$#" -eq 1 ] || { usage; exit 2; }
    case "$1" in http://?*|https://?*) ;; *) fail 'Use an http(s) URL.' ;; esac
    case "$1" in *[!a-zA-Z0-9:/?\&=._%+~#@-]*) fail 'URL contains unsupported characters; percent-encode them first.' ;; esac
    ;;
  tap) [ "$#" -eq 2 ] || { usage; exit 2; }; for arg do number "$arg"; done ;;
  swipe) [ "$#" -eq 4 ] || [ "$#" -eq 5 ] || { usage; exit 2; }; for arg do number "$arg"; done ;;
  key) [ "$#" -eq 1 ] || { usage; exit 2; }; number "$1" ;;
  screenshot)
    [ "$#" -eq 1 ] || { usage; exit 2; }
    destination=$1
    parent=$(CDPATH= cd -- "$(dirname -- "$destination")" && pwd -P) || exit 1
    case "$parent" in "$root"|"$root"/*) fail 'Keep screenshots outside the project.' ;; esac
    temporary=$(CDPATH= cd -- "${TMPDIR:-/tmp}" && pwd -P) || exit 1
    fallback_tmp=$(CDPATH= cd -- /tmp && pwd -P) || exit 1
    case "$parent" in "$temporary"|"$temporary"/*|"$fallback_tmp"|"$fallback_tmp"/*) ;;
      *) fail 'Save screenshots in the OS temporary directory, outside the project.' ;; esac
    case "$destination" in /*.png) ;; *) fail 'Use an absolute .png path in the OS temporary directory.' ;; esac
    [ ! -L "$destination" ] || fail 'Screenshot destination must not be a symlink.'
    ;;
  *) usage; exit 2 ;;
esac

adb_bin=${ADB_BIN:-adb}
command -v "$adb_bin" >/dev/null 2>&1 || fail 'adb is unavailable. Run scripts/install-host.sh first.'
if [ -n "${AGENDA_FRAME_IP:-}" ]; then
  case "$AGENDA_FRAME_IP" in *[!0-9.]*|'') fail 'AGENDA_FRAME_IP must be an IPv4 address.' ;; esac
  target="$AGENDA_FRAME_IP:5555"
  "$adb_bin" connect "$target" >/dev/null
else
  devices=$("$adb_bin" devices) || fail 'Cannot reach ADB. Check host permissions and the ADB server.'
  count=$(printf '%s\n' "$devices" | awk '$2 == "device" {n++} END {print n+0}')
  [ "$count" -eq 1 ] || fail 'Connect exactly one device, or set AGENDA_FRAME_IP to select the frame.'
  target=$(printf '%s\n' "$devices" | awk '$2 == "device" {print $1}')
fi

build=$("$adb_bin" -s "$target" shell getprop ro.build.display.id | tr -d '\r')
[ "$build" = Classic15-Pro_A33.080124_V02 ] || fail 'Frame build did not match; no action taken.'
if [ -n "${AGENDA_FRAME_SERIAL:-}" ]; then
  identity=$("$adb_bin" -s "$target" shell getprop ro.serialno | tr -d '\r')
  [ "$identity" = "$AGENDA_FRAME_SERIAL" ] || fail 'Frame serial did not match; no action taken.'
fi

case "$action" in
  status)
    printf 'Verified build: %s\n' "$build"
    "$adb_bin" -s "$target" shell getprop ro.build.version.release
    "$adb_bin" -s "$target" shell dumpsys window | awk '/mCurrentFocus/ {print}'
    ;;
  open)
    "$adb_bin" -s "$target" shell input keyevent 224
    "$adb_bin" -s "$target" shell am start -a android.intent.action.VIEW \
      -n com.android.browser/.BrowserActivity -d "'$1'" >/dev/null
    ;;
  tap|key|swipe)
    case "$action" in
      key) set -- keyevent "$@" ;;
      swipe) [ "$#" -eq 5 ] || set -- "$@" 500; set -- swipe "$@" ;;
      tap) set -- tap "$@" ;;
    esac
    "$adb_bin" -s "$target" shell input "$@"
    ;;
  screenshot)
    remote=/data/local/tmp/classic15-capture.png
    "$adb_bin" -s "$target" shell screencap -p "$remote"
    "$adb_bin" -s "$target" pull "$remote" "$destination" >/dev/null 2>&1
    "$adb_bin" -s "$target" shell rm "$remote"
    echo 'Screenshot captured.'
    ;;
esac
