# Source after lib.sh. Shared requirements for the two web servers.
node_ready() {
  command -v node >/dev/null 2>&1 &&
    node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' >/dev/null 2>&1
}

require_node() {
  if ! node_ready || ! command -v npm >/dev/null 2>&1; then
    echo "Node 20+ and npm must be on PATH. Run: sh \"$script_dir/install-host.sh\"" >&2
    exit 1
  fi
}

prepare_agenda() {
  require_node
  if [ ! -e "$root/agenda/node_modules/ical.js" ]; then
    (cd "$root/agenda" && npm ci --ignore-scripts)
  fi
}
