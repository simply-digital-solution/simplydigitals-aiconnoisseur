#!/usr/bin/env bash
# Prints a formatted summary of API and UI test results after pre-commit hooks.
# Reads temp files written by the api-pytest-coverage and ui-vitest hooks.

API_TMP="/tmp/.pre-commit-api-pytest.txt"
UI_TMP="/tmp/.pre-commit-ui-vitest.txt"

# Strip ANSI colour codes from a string
strip_ansi() { sed 's/\x1b\[[0-9;]*m//g'; }

# ── Parse API results ─────────────────────────────────────────────────────────
API_TESTS="skipped"
API_COV="—"
if [ -f "$API_TMP" ]; then
  RAW=$(cat "$API_TMP" | strip_ansi)
  # "==== 106 passed, 11 warnings in 27.29s ===="
  PYTEST_LINE=$(echo "$RAW" | grep -E "[0-9]+ passed" | tail -1)
  PASSED=$(echo "$PYTEST_LINE" | grep -oE "[0-9]+ passed")
  FAILED=$(echo "$PYTEST_LINE" | grep -oE "[0-9]+ failed" || true)
  DURATION=$(echo "$PYTEST_LINE" | grep -oE "[0-9]+\.[0-9]+s")
  [ -n "$PASSED" ] && API_TESTS="${PASSED}${FAILED:+, $FAILED} (${DURATION})" || API_TESTS="❌ failed"
  # "TOTAL  807  126  68  4  81.71%"
  COV=$(echo "$RAW" | grep -E "^TOTAL" | awk '{print $NF}' | head -1)
  [ -n "$COV" ] && API_COV="$COV"
fi

# ── Parse UI results ──────────────────────────────────────────────────────────
UI_TESTS="skipped"
UI_STMTS="—"
UI_BRANCH="—"
UI_FUNCS="—"
UI_LINES="—"
if [ -f "$UI_TMP" ]; then
  RAW=$(cat "$UI_TMP" | strip_ansi)
  # "      Tests  55 passed (55)"
  TESTS_LINE=$(echo "$RAW" | grep -E "^\s*Tests\s+[0-9]+" | tail -1 | sed 's/^[[:space:]]*//')
  [ -n "$TESTS_LINE" ] && UI_TESTS="$TESTS_LINE" || UI_TESTS="❌ failed"
  # "All files  | 89.53 | 77.35 | 91.89 | 92 |"
  COV_LINE=$(echo "$RAW" | grep -E "^All files" | head -1)
  if [ -n "$COV_LINE" ]; then
    UI_STMTS=$(echo "$COV_LINE" | awk -F'|' '{gsub(/ /,"",$2); printf "%s%%",$2}')
    UI_BRANCH=$(echo "$COV_LINE" | awk -F'|' '{gsub(/ /,"",$3); printf "%s%%",$3}')
    UI_FUNCS=$(echo "$COV_LINE"  | awk -F'|' '{gsub(/ /,"",$4); printf "%s%%",$4}')
    UI_LINES=$(echo "$COV_LINE"  | awk -F'|' '{gsub(/ /,"",$5); printf "%s%%",$5}')
  fi
fi

# ── Print table ───────────────────────────────────────────────────────────────
echo ""
echo "┌───────────┬────────────────────────────────────┬─────────────────────────────────┐"
echo "│ Component │ Tests                              │ Coverage                        │"
echo "├───────────┼────────────────────────────────────┼─────────────────────────────────┤"
printf "│ %-9s │ %-34s │ %-31s │\n" "API" "$API_TESTS" "Statements: $API_COV"
echo "├───────────┼────────────────────────────────────┼─────────────────────────────────┤"
printf "│ %-9s │ %-34s │ Stmts: %-5s  Branch: %-5s    │\n" "UI" "$UI_TESTS" "$UI_STMTS" "$UI_BRANCH"
printf "│ %-9s │ %-34s │ Funcs: %-5s  Lines:  %-5s    │\n" "" "" "$UI_FUNCS" "$UI_LINES"
echo "└───────────┴────────────────────────────────────┴─────────────────────────────────┘"
echo ""
