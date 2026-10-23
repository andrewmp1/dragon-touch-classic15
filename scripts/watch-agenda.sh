#!/usr/bin/env sh
# Keep the agenda visible on the frame. Checks the front app over Wi-Fi ADB and
# reopens the agenda page in com.android.browser when something else is in front.
# Run from any directory:
#   AGENDA_FRAME_IP=<last-known-ip> sh /path/to/dragon-touch-classic15/scripts/watch-agenda.sh
# Optional AGENDA_FRAME_SERIAL=<serial> pins the frame even across reboots and
# USB-ADB contention. The address is re-resolved with scripts/find-frame.js when
# the last-known one stops answering, and the build id is verified before acting.

set -u

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

_frame=${AGENDA_FRAME_IP:?Set AGENDA_FRAME_IP to the last-known frame address}
_serial=${AGENDA_FRAME_SERIAL:-}
_interval=${AGENDA_WATCH_SECONDS:-60}
_build=Classic15-Pro_A33.080124_V02

_dev="$_frame:5555"
_own=$(node -e '
  const os = require("node:os");
  for (const [name, list] of Object.entries(os.networkInterfaces()))
    for (const net of list || [])
      if ((net.family === "IPv4" || net.family === 4) && !net.internal && !/^(bridge|docker|vbox|vmnet)/.test(name))
        console.log(net.address);
' | head -1)

if [ -z "${AGENDA_URL:-}" ]; then
  AGENDA_URL=$(node -e '
    const os = require("node:os");
    for (const [name, list] of Object.entries(os.networkInterfaces()))
      for (const net of list || [])
        if ((net.family === "IPv4" || net.family === 4) && !net.internal && !/^(bridge|docker|vbox|vmnet)/.test(name))
          console.log("http://" + net.address + ":8787/");
  ' | head -1)
  [ -n "$AGENDA_URL" ] || { echo "Could not find this computer's LAN address. Set AGENDA_URL." >&2; exit 1; }
  echo "Watcher will reopen: $AGENDA_URL"
fi
_url=$AGENDA_URL

identity_ok() { # already connected as device, one adb check per call
  build=$(adb -s "$1" shell getprop ro.build.display.id | tr -d '\r')
  [ "$build" = "$_build" ] || return 1
  if [ -n "$_serial" ]; then
    sn=$(adb -s "$1" shell getprop ro.serialno | tr -d '\r')
    [ "$sn" = "$_serial" ] || return 1
  fi
  return 0
}

# Try to reconnect: connect each open-5555 candidate on the subnet until the
# identity matches the frame. Prints nothing; updates _dev or leaves it broken.
reconnect() {
  subnet=${_frame%.*}
  candidates=$(node "$root/scripts/find-frame.js" "$subnet" "$_own" 2>/dev/null)
  for ip in $candidates; do
    adb connect "$ip:5555" >/dev/null 2>&1
    if identity_ok "$ip:5555"; then
      echo "Frame re-found at $ip (was $_frame)."
      _frame=$ip
      _dev="$ip:5555"
      return 0
    fi
    adb disconnect "$ip:5555" >/dev/null 2>&1
  done
  return 1
}

while :; do
  sleep "$_interval"
  state=$(adb -s "$_dev" get-state 2>/dev/null | tr -d '\r')
  [ "$state" = "device" ] || { reconnect || { echo "Frame not reachable. Looking again in $_interval s."; continue; }; }
  if ! identity_ok "$_dev"; then { echo "Frame not reachable. Looking again in $_interval s."; reconnect || continue; }; fi

  focus=$(adb -s "$_dev" shell dumpsys window 2>/dev/null | tr -d '\r' | grep -o ' mCurrentFocus=.*' | head -1)
  case "$focus" in
    *com.android.browser*) ;;
    *)
      echo "Front is: ${focus#*= }; sending the browser back to the agenda."
      adb -s "$_dev" shell input keyevent 224
      adb -s "$_dev" shell am start -a android.intent.action.VIEW \
        -n com.android.browser/.BrowserActivity -d "$_url"
      ;;
  esac
done
