# Shared helpers for the scripts in this directory.
# Source this file. Do not run it directly.
# The caller must source it before changing the working directory.

if [ "${0##*/}" = "lib.sh" ]; then
  echo "Source this file from the other scripts in this directory." >&2
  exit 1
fi

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
script_dir=$(CDPATH= cd -- "$(dirname "$_script")" && pwd)
root=$(CDPATH= cd -- "$script_dir/.." && pwd)
unset _script _link

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
    return
  fi
  echo "A SHA-256 tool is required. Install shasum or sha256sum and run this script again." >&2
  exit 1
}

brew_shellenv() {
  if command -v brew >/dev/null 2>&1; then
    return 0
  fi
  for _brew in \
    /opt/homebrew/bin/brew \
    /usr/local/bin/brew \
    "$HOME/.linuxbrew/bin/brew" \
    /home/linuxbrew/.linuxbrew/bin/brew
  do
    if [ -x "$_brew" ]; then
      eval "$("$_brew" shellenv)"
      return 0
    fi
  done
  return 1
}
