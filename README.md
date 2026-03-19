# simplydigitals-aiconnoisseur — Monorepo

**Simply Digital Solutions** · ML Analytics Platform

---

## Structure

```
simplydigitals-aiconnoisseur/
├── simplydigitals-aiconnoisseur.code-workspace   ← Open this in VS Code
├── .editorconfig
├── simplydigitals-aiconnoisseur-api/             ← Python FastAPI backend
│   ├── app/
│   ├── tests/
│   ├── alembic/
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── docker-compose.yml
└── simplydigitals-aiconnoisseur-ui/              ← React frontend
    ├── src/
    ├── package.json
    └── vite.config.js
```

---

## Opening in VS Code

```bash
# Option 1 — open the workspace file directly
code simplydigitals-aiconnoisseur.code-workspace

# Option 2 — open from inside the folder
cd simplydigitals-aiconnoisseur
code .
```

VS Code will show three folders in the Explorer panel:
- `simplydigitals-aiconnoisseur (root)` — workspace-level files
- `simplydigitals-aiconnoisseur-api (Python)` — FastAPI backend
- `simplydigitals-aiconnoisseur-ui (React)` — React frontend

---

## Quick Start

> **macOS prerequisite**: The API requires **Python 3.11** exactly.
> If `python3 --version` shows 3.10 or lower, install 3.11 first:
> ```bash
> brew install python@3.11
> # or: pyenv install 3.11.9 && pyenv local 3.11.9
> ```
> See `simplydigitals-aiconnoisseur-api/README.md` for full setup instructions.

### Option A — run each project individually

```bash
# Terminal 1: API  (setup.sh handles Python 3.11 venv + deps + migrations)
cd simplydigitals-aiconnoisseur-api
chmod +x setup.sh && ./setup.sh
source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: UI
cd simplydigitals-aiconnoisseur-ui
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| React UI | http://localhost:3000 |

### Option B — Docker Compose (API + PostgreSQL)

```bash
cd simplydigitals-aiconnoisseur-api
cp .env.example .env          # set SECRET_KEY
docker-compose up --build
# Then in another terminal:
cd ../simplydigitals-aiconnoisseur-ui && npm run dev
```

### Option C — VS Code Tasks

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Tasks: Run Task**:

| Task | Description |
|------|-------------|
| `Full Stack: start both` | Starts API and UI in parallel |
| `API: run unit tests` | pytest with coverage |
| `API: run BDD tests` | Behave feature scenarios |
| `API: lint (ruff + black)` | Code quality checks |
| `UI: build` | Production build |
| `Docker: compose up` | Full Docker stack |

### Option D — VS Code Debugger

Open **Run & Debug** (`Ctrl+Shift+D`):
- `API: uvicorn (dev)` — starts the API with hot reload + debugger attached
- `API: pytest (all unit tests)` — runs full test suite in debug mode
- `API: pytest (current file)` — debug the test file currently open

---

## Recommended VS Code Extensions

The workspace will prompt you to install these automatically:

| Extension | Purpose |
|-----------|---------|
| ms-python.python | Python language support |
| ms-python.black-formatter | Black auto-formatter |
| charliermarsh.ruff | Ruff linter |
| ms-python.mypy-type-checker | Type checking |
| esbenp.prettier-vscode | JS/JSX formatter |
| bradlc.vscode-tailwindcss | Tailwind CSS intellisense |
| eamodio.gitlens | Git history & blame |
| usernamehw.errorlens | Inline error highlighting |
| ms-azuretools.vscode-docker | Docker integration |
| humao.rest-client | Test API endpoints from `.http` files |
