#!/usr/bin/env bash
#
# Full-fleet layer-2 sweep, for a machine with the disk and time to build 98 Vite apps.
#
#   ./fleet/sweep-all.sh                  # install what is missing, build, serve, audit
#   ./fleet/sweep-all.sh --keep-modules   # leave node_modules in place afterwards
#
# Layer 2 has covered 13 of 98 sites, not because the checks are app-specific — the runtime audit
# needs nothing but a URL — but because nobody had installed and built the other 85. On a laptop
# that is hours and many gigabytes. On a build host it is a coffee break.
#
# Requirements
#   Node 20.19+   — eleven sites pin Vite 7/8, which fail outright on Node 18
#   Chrome or Chromium — set CHROME_PATH, or install google-chrome-stable / chromium
#   ~40 GB free   — roughly 400 MB of node_modules per site, reclaimed unless --keep-modules
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
KEEP_MODULES=false
[[ "${1:-}" == "--keep-modules" ]] && KEEP_MODULES=true

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if (( NODE_MAJOR < 20 )); then
  echo "Node $NODE_MAJOR detected. Eleven sites pin Vite 7 or 8 and need Node 20.19+;"
  echo "they will be recorded as toolchain failures rather than audited."
  echo "Continuing in 5s — Ctrl-C to stop and upgrade first."
  sleep 5
fi

if [[ -z "${CHROME_PATH:-}" ]]; then
  for c in /usr/bin/google-chrome-stable /usr/bin/google-chrome /usr/bin/chromium-browser /usr/bin/chromium /snap/bin/chromium; do
    [[ -x "$c" ]] && export CHROME_PATH="$c" && break
  done
fi
if [[ -z "${CHROME_PATH:-}" ]]; then
  echo "No Chrome or Chromium found. Install one, or set CHROME_PATH." >&2
  exit 2
fi
echo "Using browser: $CHROME_PATH"

# puppeteer-core is resolved from whichever site has it; make sure at least one does.
if ! ls websites/*/node_modules/puppeteer-core/package.json >/dev/null 2>&1; then
  echo "Installing puppeteer-core into aws_console_mock so the audit has a driver..."
  (cd websites/aws_console_mock && npm install --silent)
fi

echo
echo "=== Layer 1: source screen (all 98, seconds) ==="
node fleet/audit-static.mjs --json fleet/baseline.json
node fleet/report-baseline.mjs "$(git rev-parse --short HEAD 2>/dev/null || echo local)"

echo
echo "=== Build health and preview reachability ==="
node fleet/audit-build.mjs

echo
echo "=== Layer 2: install, build, serve and audit every site ==="
node fleet/sweep-runtime.mjs --install
node fleet/report-runtime.mjs

if [[ "$KEEP_MODULES" == false ]]; then
  echo
  echo "Reclaiming node_modules (pass --keep-modules to skip)..."
  # aws_console_mock keeps its dependencies: it holds the per-app harness and the puppeteer driver.
  for d in websites/*/; do
    [[ "$d" == *aws_console_mock* ]] && continue
    rm -rf "${d}node_modules"
  done
  echo "Done. Reclaimed all but aws_console_mock."
fi

echo
echo "Reports: fleet/BASELINE.md, fleet/RUNTIME.md"
echo "Raw:     fleet/baseline.json, fleet/runtime-baseline.json"
