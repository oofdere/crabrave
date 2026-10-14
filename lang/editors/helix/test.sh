#!/usr/bin/env bash
# Drives a real Helix in tmux: builds the grammar, checks `hx --health`, opens
# examples/colors.crab and asks the language server for a hover.
#
#   HX=/path/to/hx HELIX_RUNTIME=/path/to/helix/runtime [LOCAL_GRAMMAR=1] ./test.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
lang="$(cd "$here/../.." && pwd)"
work="$(mktemp -d)"
trap 'tmux kill-session -t crabrave-helix 2>/dev/null || true; [ -n "${KEEP_LOG:-}" ] && cp "$work/helix.log" "$KEEP_LOG"; rm -rf "$work"' EXIT

config="$work/config/helix"
mkdir -p "$config/runtime/queries" "$config/runtime/grammars"
cp -r "$here/runtime/queries/crabrave" "$config/runtime/queries/"
{
	echo 'use-grammars = { only = ["crabrave"] }'
	cat "$here/languages.toml"
} > "$config/languages.toml"
if [ -n "${LOCAL_GRAMMAR:-}" ]; then
	# Build the grammar from this checkout instead of the commit on GitHub.
	sed -i "s|^source = .*|source = { path = \"$lang/grammar\" }|" "$config/languages.toml"
fi
# This repository keeps its TypeScript 7.1 in lang/, below the repository root.
printf '[editor]\nworkspace-lsp-roots = ["lang"]\n' > "$config/config.toml"
export XDG_CONFIG_HOME="$work/config"

"$HX" --grammar fetch
"$HX" --grammar build
health="$(cd "$lang" && "$HX" --health crabrave 2>&1)"
echo "$health"
if grep -q "✘" <<<"$health"; then
	echo "FAIL: hx --health reports a problem" >&2
	exit 1
fi

log="$work/helix.log"
cd "$lang"
tmux new-session -d -s crabrave-helix -x 120 -y 40 \
	"env XDG_CONFIG_HOME=$XDG_CONFIG_HOME HELIX_RUNTIME=${HELIX_RUNTIME:-} $HX -v --log $log examples/colors.crab"

screen=""
for _ in $(seq 1 60); do
	sleep 1
	# Line 13 is `Red(x) => [x, 0, 0],`; put the cursor on the `x` and hover.
	for keys in Escape 13G gh llllll Space k; do
		tmux send-keys -t crabrave-helix "$keys"
		sleep 0.2
	done
	sleep 1
	screen="$(tmux capture-pane -t crabrave-helix -p)"
	if grep -q "const x: number" <<<"$screen"; then
		break
	fi
done

if grep -q "Failed to compile" "$log"; then
	grep "Failed to compile" "$log" >&2
	echo "FAIL: Helix could not compile the queries" >&2
	exit 1
fi
if ! grep -q "const x: number" <<<"$screen"; then
	echo "$screen"
	tail -20 "$log" >&2
	echo "FAIL: no hover from the language server" >&2
	exit 1
fi
echo "ok: hover shows \`const x: number\`"
