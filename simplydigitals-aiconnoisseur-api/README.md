# ML Analytics API Platform

A production-grade Python REST API platform for **Data Analytics**, **Machine Learning**, and **AI** workloads.

---

## 🏗️ Architecture Overview

```
mlapi/
├── app/
│   ├── api/v1/endpoints/     # REST API route handlers
│   ├── core/                 # Config, security, logging
│   ├── db/                   # ORM session, base, migrations
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic request/response schemas
│   ├── services/             # Business logic layer
│   └── ml/                   # ML pipeline, training, inference
├── tests/
│   ├── unit/                 # Pytest unit tests + coverage
│   └── bdd/                  # Behave BDD feature specs + steps
├── scripts/                  # Utility scripts
├── .github/workflows/        # CI/CD pipelines
├── alembic/                  # Database migrations
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── .pre-commit-config.yaml
```

---

## ✨ Feature Set

| Capability | Tool / Library |
|---|---|
| REST API | FastAPI |
| ORM | SQLAlchemy 2.0 + Alembic |
| ML / AI | scikit-learn, pandas, numpy |
| Auth | JWT (python-jose) + bcrypt |
| BDD Testing | Behave |
| Unit Testing | Pytest + pytest-cov |
| Code Quality | Ruff, Black, mypy, pre-commit |
| Security | Bandit, Safety, OWASP headers |
| CI/CD | GitHub Actions |
| Cloud Deploy | AWS Lambda + API Gateway (free tier) |
| Metrics | CI speed/stability, Codecov, SonarCloud |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Required version | Check |
|------|-----------------|-------|
| Python | **3.11** (not 3.10, not 3.12+) | `python3 --version` |
| pip | 23+ | `pip --version` |
| Docker | 24+ | `docker --version` (optional) |

> **macOS note**: macOS ships with Python 3.9/3.10 and Homebrew may also be on 3.10.
> You must install Python 3.11 explicitly — see the step below.

---

### Step 1 — Install Python 3.11 (macOS)

**Option A — Homebrew (recommended)**
```bash
brew install python@3.11

# Verify
python3.11 --version   # must print Python 3.11.x
```

**Option B — pyenv (best for managing multiple versions)**
```bash
# Install pyenv if you don't have it
brew install pyenv

# Install Python 3.11
pyenv install 3.11.9
pyenv local 3.11.9     # pins this project to 3.11.9 via .python-version

# Verify
python --version        # must print Python 3.11.9
```

**Option C — python.org installer**

Download the macOS installer from https://www.python.org/downloads/release/python-3119/

---

### Step 2 — Clone & set up

```bash
git clone https://github.com/simplydigitalsolutions/simplydigitals-aiconnoisseur.git
cd simplydigitals-aiconnoisseur/simplydigitals-aiconnoisseur-api
```

---

### Step 3 — Run the setup script (recommended)

The `setup.sh` script handles everything — it finds Python 3.11, deletes any
stale `.venv` on the wrong Python version, creates a fresh one, upgrades pip,
installs all dependencies, copies `.env`, and runs migrations.

```bash
chmod +x setup.sh
./setup.sh
```

Then start the server:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload
```

---

### Step 3 (manual) — Create the venv and install

> **Critical**: Always use `python3.11` explicitly when creating the venv.
> Using `python` or `python3` picks up whatever is on your `PATH`, which on
> macOS is often 3.9 or 3.10. If your `.venv` was already created with the
> wrong Python, delete it first: `rm -rf .venv`

```bash
# Delete any existing venv on the wrong Python version
rm -rf .venv

# Create venv explicitly with Python 3.11
python3.11 -m venv .venv

# Confirm it is 3.11 before proceeding
.venv/bin/python --version     # must print Python 3.11.x

# Activate
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

# Upgrade pip first (avoids legacy resolver errors on 3.11)
pip install --upgrade pip

# Install project with all extras
pip install -e ".[dev,test]"
```

---

### Step 4 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and set `SECRET_KEY` to at least 32 random characters:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### Step 5 — Run database migrations

```bash
alembic upgrade head
```

---

### Step 6 — Start the server

```bash
uvicorn app.main:app --reload
```

The API is live at `http://localhost:8000`
Swagger UI at `http://localhost:8000/docs`

---

### Docker Compose (alternative — no Python install needed)

```bash
cp .env.example .env   # set SECRET_KEY in .env
docker-compose up --build
```

API available at: `http://localhost:8000`
Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

---

## 🧪 Testing

### Unit Tests with Coverage

```bash
# Run all unit tests with coverage report
pytest tests/unit/ -v --cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=80

# View HTML coverage report
open htmlcov/index.html
```

### BDD Tests

```bash
# Run all BDD feature scenarios
behave tests/bdd/features/

# Run specific feature
behave tests/bdd/features/ml_training.feature

# Run with verbose output
behave --no-capture tests/bdd/features/
```

### Full Test Suite

```bash
# Run everything
pytest && behave tests/bdd/features/
```

---

## 🔐 Security

- JWT authentication with token rotation
- Password hashing with bcrypt (cost factor 12)
- SQL injection prevention via ORM parameterisation
- Rate limiting per endpoint
- OWASP security headers middleware
- Input validation via Pydantic
- Bandit SAST scanning in CI
- Safety dependency vulnerability scanning
- Secrets never committed (`.env` pattern + GitHub Secrets)

---

## 📊 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Obtain JWT token |
| POST | `/api/v1/auth/refresh` | Refresh access token |

### Datasets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/datasets/` | List datasets |
| POST | `/api/v1/datasets/` | Upload dataset |
| GET | `/api/v1/datasets/{id}` | Get dataset details |
| DELETE | `/api/v1/datasets/{id}` | Delete dataset |
| GET | `/api/v1/datasets/{id}/profile` | Statistical profiling |

### ML Models
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/models/` | List trained models |
| POST | `/api/v1/models/train` | Train a new model |
| GET | `/api/v1/models/{id}` | Get model details & metrics |
| POST | `/api/v1/models/{id}/predict` | Run inference |
| DELETE | `/api/v1/models/{id}` | Delete model |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/analytics/describe` | Descriptive statistics |
| POST | `/api/v1/analytics/correlation` | Correlation matrix |
| POST | `/api/v1/analytics/forecast` | Time-series forecast |

---

## 🔄 CI/CD Pipeline

```
Push / PR
   │
   ├── Lint & Format (Ruff, Black, mypy)
   ├── Security Scan (Bandit, Safety)
   ├── Unit Tests + Coverage (pytest-cov → Codecov)
   ├── BDD Tests (Behave)
   ├── Build Docker image
   │
   └── main branch only:
       ├── Push image to ECR
       ├── Deploy to AWS Lambda
       └── Post deployment smoke test
```

### CI/CD Metrics Tracked
- **Speed**: Job duration per stage, total pipeline time
- **Stability**: Pass rate over last 30 runs, flaky test detection
- **Maintainability**: SonarCloud code smells, duplication %, complexity

---

## 🌩️ AWS Deployment (Free Tier)

- **Compute**: AWS Lambda (1M requests/month free)
- **API**: API Gateway HTTP API
- **Database**: RDS PostgreSQL (db.t3.micro, 20GB free)
- **Storage**: S3 (5GB free) for model artefacts
- **Registry**: ECR for Docker images

See `scripts/deploy_aws.sh` for deployment automation.

---

## 📈 Monitoring

- Structured JSON logging via `structlog`
- Health check endpoint: `GET /health`
- Metrics endpoint: `GET /metrics` (Prometheus format)
- CloudWatch integration for Lambda

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests first (TDD/BDD)
4. Implement the feature
5. Ensure all checks pass (`pre-commit run --all-files && pytest`)
6. Open a Pull Request

The CI pipeline will automatically run all checks on your PR.
