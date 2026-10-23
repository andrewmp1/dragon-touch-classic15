#!/usr/bin/env sh
# Configure the verified frame and run both pages. Install host tools first.
set -eu
_script=$0
case $_script in /*) ;; *) _script=$(pwd)/$_script ;; esac
while [ -L "$_script" ]; do
  _link=$(readlink "$_script") || break
  case $_link in /*) _script=$_link ;; *) _script=$(dirname "$_script")/$_link ;; esac
done
. "$(CDPATH= cd -- "$(dirname "$_script")" && pwd)/lib.sh"
brew_shellenv || true
. "$script_dir/runtime.sh"
prepare_agenda
node "$script_dir/setup-calendar.mjs"
exec node "$script_dir/setup.mjs"
