#!/usr/bin/env sh
# Identify a Dragon Touch Classic15 Pro over Wi-Fi ADB.
# The project folder can sit anywhere. Run this file by its path, from any directory:
#   sh /path/to/dragon-touch-classic15/scripts/connect.sh FRAME_IP
# See README.md for the full setup sequence.
# Expected build for this frame (different from issue #146):
#   ro.product.model       Classic15 Pro
#   ro.build.display.id    Classic15-Pro_A33.080124_V02
#   ro.hardware            sun8i

set -eu

_script=$0
case $_script in
  /*) ;;
  *) _script=$(pwd)/$_script ;;
esac
while [ -L "$_script" ]; do
  _link=$(readlink "$_script") || break
  case $_link in
    /*) _script=$_link ;;
    *) _script=$(dirname "$_script")/$_link ;;
  esac
done
# shellcheck source=lib.sh
. "$(CDPATH= cd -- "$(dirname "$_script")" && pwd)/lib.sh"
unset _script _link

if [ "$#" -ne 1 ]; then
  echo "usage: sh \"$script_dir/connect.sh\" FRAME_IP" >&2
  exit 2
fi

frame_ip=$1
serial="${frame_ip}:5555"

if ! command -v adb >/dev/null 2>&1; then
  brew_shellenv || true
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not on PATH. Run: sh \"$script_dir/install-host.sh\"" >&2
  exit 1
fi

adb connect "$serial"
adb -s "$serial" shell id
adb -s "$serial" shell getprop ro.product.model
adb -s "$serial" shell getprop ro.build.display.id
adb -s "$serial" shell getprop ro.hardware
