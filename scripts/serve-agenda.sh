#!/usr/bin/env sh
# Serve the plain agenda page for the Android 4.4 frame.
# The project folder can sit anywhere. Run this file by its path, from any directory:
#   sh /path/to/dragon-touch-classic15/scripts/serve-agenda.sh

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

brew_shellenv || true
. "$script_dir/runtime.sh"
prepare_agenda

exec node "$root/agenda/serve.js"
