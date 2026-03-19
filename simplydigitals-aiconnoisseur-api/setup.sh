#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup.sh — Bootstrap the API dev environment using Python 3.11
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
#
# What it does:
#   1. Finds Python 3.11 on your system (checks multiple locations)
#   2. Removes any existing .venv that may be on the wrong Python version
#   3. Creates a fresh .venv with Python 3.11
#   4. Upgrades pip inside the venv
#   5. Installs all project dependencies
#   6. Copies .env.example → .env if .env doesn't exist yet
#   7. Runs alembic migrations
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }
error()   { echo -e "${RED}[setup] ERROR:${NC} $*"; exit 1; }

# ── Step 1: Find Python 3.11 ──────────────────────────────────────────────────
info "Looking for Python 3.11..."

PYTHON311=""

# Priority order: explicit 3.11 binary → pyenv → homebrew paths
CANDIDATES=(
  "python3.11"
  "$HOME/.pyenv/versions/3.11.9/bin/python"
  "$HOME/.pyenv/versions/3.11.8/bin/python"
  "$HOME/.pyenv/versions/3.11.7/bin/python"
  "/opt/homebrew/bin/python3.11"
  "/opt/homebrew/opt/python@3.11/bin/python3.11"
  "/usr/local/bin/python3.11"
  "/usr/local/opt/python@3.11/bin/python3.11"
)

for candidate in "${CANDIDATES[@]}"; do
  if command -v "$candidate" &>/dev/null 2>&1 || [ -f "$candidate" ]; then
    VERSION=$("$candidate" --version 2>&1 | grep -oE "3\.11\.[0-9]+")
    if [ -n "$VERSION" ]; then
      PYTHON311="$candidate"
      success "Found Python $VERSION at: $PYTHON311"
      break
    fi
  fi
done

if [ -z "$PYTHON311" ]; then
  echo ""
  error "Python 3.11 not found on this system.

Please install it using one of the following methods:

  macOS (Homebrew):
    brew install python@3.11

  macOS (pyenv — recommended for managing multiple versions):
    brew install pyenv
    pyenv install 3.11.9
    pyenv local 3.11.9

  Direct download:
    https://www.python.org/downloads/release/python-3119/

After installing, run this script again."
fi

# ── Step 2: Remove stale .venv ────────────────────────────────────────────────
if [ -d ".venv" ]; then
  EXISTING=$(.venv/bin/python --version 2>&1 || echo "unknown")
  if echo "$EXISTING" | grep -q "3\.11"; then
    success "Existing .venv is already Python 3.11 — skipping recreate"
  else
    warn "Removing existing .venv ($EXISTING) — wrong Python version"
    rm -rf .venv
  fi
fi

# ── Step 3: Create fresh .venv with Python 3.11 ───────────────────────────────
if [ ! -d ".venv" ]; then
  info "Creating .venv with $PYTHON311..."
  "$PYTHON311" -m venv .venv
  success ".venv created"
fi

# ── Step 4: Upgrade pip ───────────────────────────────────────────────────────
info "Upgrading pip..."
.venv/bin/python -m pip install --upgrade pip --quiet
success "pip upgraded to $(.venv/bin/pip --version | cut -d' ' -f2)"

# ── Step 5: Install project dependencies ─────────────────────────────────────
info "Installing project dependencies (this may take a minute)..."
.venv/bin/pip install -e ".[dev,test]" --quiet
success "Dependencies installed"

# ── Step 6: Copy .env if missing ──────────────────────────────────────────────
if [ ! -f ".env" ]; then
  cp .env.example .env
  warn ".env created from .env.example — open it and set SECRET_KEY:"
  warn "  python -c \"import secrets; print(secrets.token_hex(32))\""
else
  info ".env already exists — skipping"
fi

# ── Step 7: Run migrations ────────────────────────────────────────────────────
info "Running database migrations..."
.venv/bin/alembic upgrade head
success "Migrations applied"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
success "Setup complete! To start the server:"
echo ""
echo "    source .venv/bin/activate"
echo "    uvicorn app.main:app --reload"
echo ""
echo "    API:     http://localhost:8000"
echo "    Swagger: http://localhost:8000/docs"
echo ""
