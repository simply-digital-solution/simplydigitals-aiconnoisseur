#!/usr/bin/env bash
# Prints a formatted summary of API and UI test results after pre-commit hooks.
# Reads temp files written by the api-pytest-coverage and ui-vitest hooks.

API_TMP="/tmp/.pre-commit-api-pytest.txt"
UI_TMP="/tmp/.pre-commit-ui-vitest.txt"

echo ""
echo "┌──────────────────────────────────────────────────────┐"
echo "│                Pre-Commit Test Results               │"
echo "├──────────────────────────────────────────────────────┤"

# ── API — pytest ─────────────────────────────────────────────────────────────
if [ -f "$API_TMP" ]; then
  # e.g. "45 passed, 2 warnings in 12.34s"
  PYTEST_LINE=$(grep -E "^[0-9]+ passed" "$API_TMP" | tail -1)
  # e.g. "TOTAL   1234   234   81%"
  COV_LINE=$(grep -E "^TOTAL" "$API_TMP" | awk '{print $NF}' | head -1)

  if [ -n "$PYTEST_LINE" ]; then
    if [ -n "$COV_LINE" ]; then
      printf "│  %-12s %-28s coverage: %s\n" "API" "$PYTEST_LINE" "$COV_LINE"
    else
      printf "│  %-12s %s\n" "API" "$PYTEST_LINE"
    fi
  else
    FAIL_LINE=$(grep -E "failed|error" "$API_TMP" | tail -1)
    printf "│  %-12s %s\n" "API" "${FAIL_LINE:-no results found}"
  fi
else
  printf "│  %-12s %s\n" "API" "skipped (no Python files changed)"
fi

# ── UI — Vitest ───────────────────────────────────────────────────────────────
if [ -f "$UI_TMP" ]; then
  # e.g. "      Tests  55 passed (55)"
  TESTS_LINE=$(grep -E "Tests\s+[0-9]+" "$UI_TMP" | tail -1 | sed 's/^[[:space:]]*//')
  FILES_LINE=$(grep -E "Test Files\s+[0-9]+" "$UI_TMP" | tail -1 | sed 's/^[[:space:]]*//')

  if [ -n "$TESTS_LINE" ]; then
    printf "│  %-12s %-28s %s\n" "UI" "$TESTS_LINE" "$FILES_LINE"
  else
    FAIL_LINE=$(grep -iE "failed|error" "$UI_TMP" | tail -1 | sed 's/^[[:space:]]*//')
    printf "│  %-12s %s\n" "UI" "${FAIL_LINE:-no results found}"
  fi
else
  printf "│  %-12s %s\n" "UI" "skipped (no JS/TS files changed)"
fi

echo "└──────────────────────────────────────────────────────┘"
echo ""
