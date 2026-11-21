#!/usr/bin/env bash
#
# Is this branch whole?
#
# One command that runs what CI runs, so the answer is the same on a laptop as
# on a pull request. CI calls this file rather than listing the steps again;
# two lists of checks drift, and then nobody knows which one is the gate.
#
# Written by /meridian:start and refreshed by /meridian:sync-project. The stages
# below are this project's own — edit them freely. Do not copy a stage from
# another project without checking it runs here.
#
# Exit codes, and the third one is the point:
#
#   0  everything passed
#   1  something is broken. This is the only code that means unhealthy
#   2  nothing failed, but a check could not run — a tool is missing
#
# Without 2, "gitleaks is not installed" reports as a failure, and a team that
# sees false failures learns to ignore the whole run.
#
# That reading is this script's own. It is not a convention tools share: `run` is
# therefore strict about 2 and `run_or_skip` is the opt-in for a stage that does
# speak this contract. See the two helpers below.
#
# Deliberately no `set -e`: every stage runs and reports, so one run shows every
# problem rather than only the first.

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

status=0
skipped=0

# Runs one stage. Every non-zero exit is a failure, 2 included: plenty of tools
# use 2 for "your configuration is broken", and ESLint is one of them. Read as a
# skip, a crashed linter reports a run that checked nothing as a green build.
run() {
  _stage fail "$@"
}

# Same, but 2 passes through as a skip. Only for a stage that uses 2 the way this
# script does — a nested verify.sh whose own tool was missing, which would
# otherwise arrive here as a false red.
run_or_skip() {
  _stage skip "$@"
}

_stage() {
  local on_two="$1"
  local label="$2"
  shift 2
  printf '\n── %s\n' "$label"

  local code=0
  "$@" || code=$?

  if [[ "$code" -eq 2 && "$on_two" == "skip" ]]; then
    printf 'skip %s — the check reported it could not fully run here\n' "$label"
    skipped=$((skipped + 1))
    return
  fi

  case "$code" in
    0) printf 'ok   %s\n' "$label" ;;
    *) printf 'FAIL %s\n' "$label"
       status=1 ;;
  esac
}

# A tool that is absent is a skip, never a pass. A silent pass on a check that
# never ran is the failure this whole file exists to prevent.
skip() {
  printf '\nskip %s — %s\n' "$1" "$2"
  skipped=$((skipped + 1))
}

# ── Secrets ───────────────────────────────────────────────────────────────────
#
# `dir`, not `git` and not the deprecated `detect`: those two read committed
# history only, so a key sitting uncommitted in the working tree passes. A false
# pass on secrets is worse than no check at all.
#
# A model noticing a hardcoded key is luck. A scanner finding it is a fact.
if command -v gitleaks >/dev/null 2>&1; then
  run "secrets" gitleaks dir . --no-banner --redact
else
  skip "secrets" "gitleaks is not installed. Fix with: brew install gitleaks"
fi

# ── This project ──────────────────────────────────────────────────────────────
#
# Replace the line below with this project's real commands. An unedited file
# fails on purpose: a verify script that passes without checking anything is the
# most expensive thing in this repository.
#
# Installing dependencies is not a check and does not belong here. CI installs
# first, then calls this.
#
# Web / Node:      run "lint"      npm run lint
#                  run "typecheck" npx tsc --noEmit
#                  run "test"      npm run test
#                  run "build"     npm run build
#
# iOS / Swift:     run "build" xcodebuild -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 17' build
#                  run "test"  xcodebuild -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 17' test
#
# Android:         run "lint"  ./gradlew lint          # includes real accessibility checks
#                  run "test"  ./gradlew test
#                  run "build" ./gradlew assembleRelease
#
# Delete what does not apply. Do not leave a stage that silently does nothing,
# because a green run would then mean nothing.

run "typecheck" npm run typecheck
run "tokens"    npm run check:tokens
run "test"      npm run test
run "build"     npm run build

# ── Result ────────────────────────────────────────────────────────────────────
#
# A failure outranks a skip: a run with one broken stage and three missing tools
# is broken.
if [[ "$status" -ne 0 ]]; then
  printf '\nChecks failed.\n'
  exit 1
fi

if [[ "$skipped" -gt 0 ]]; then
  printf '\nAll checks passed, %d skipped — nothing failed, but a tool was missing.\n' "$skipped"
  exit 2
fi

printf '\nAll checks passed.\n'
exit 0
