#!/usr/bin/env sh
# Start both pages. Ctrl+C stops both processes launched by this command.
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
exec node "$script_dir/start.mjs"
