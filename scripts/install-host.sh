#!/usr/bin/env sh
# Install the host runtime: adb, Node 20+, npm, and the agenda dependency.
# The tools install through Homebrew onto this computer. The project folder can sit anywhere.
# Usage, from any directory:
#   sh /path/to/dragon-touch-classic15/scripts/install-host.sh
# Safe to re-run. Packages that are already installed are left in place.

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

# Existing tools from Homebrew or a version manager are accepted.
brew_shellenv || true
. "$script_dir/runtime.sh"

if ! node_ready || ! command -v npm >/dev/null 2>&1; then
  brew_shellenv || { echo "Install Homebrew (https://brew.sh/) or Node 20+ with npm, then rerun." >&2; exit 1; }
  if brew list --formula node >/dev/null 2>&1; then
    brew upgrade node
  else
    brew install node
  fi
  # An older version-manager Node may still precede Homebrew on PATH.
  PATH="$(brew --prefix)/bin:$PATH"
  export PATH
  hash -r
fi

if ! command -v adb >/dev/null 2>&1; then
  brew_shellenv || { echo "Install Homebrew (https://brew.sh/) or Android platform-tools, then rerun." >&2; exit 1; }
  brew install android-platform-tools
  PATH="$(brew --prefix)/bin:$PATH"
  export PATH
  hash -r
fi

require_node
command -v adb >/dev/null 2>&1 || { echo "adb is still missing from PATH." >&2; exit 1; }
(cd "$root/agenda" && npm ci --ignore-scripts)

echo "Host runtime is ready."
node --version
npm --version
adb version
node "$script_dir/setup-calendar.mjs"
printf 'Start both pages: sh "%s/start.sh"\n' "$script_dir"
