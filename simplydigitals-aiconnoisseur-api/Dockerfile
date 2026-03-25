# ─────────────────────────────────────────────────────────────────────────────
# Build stage — use standard Python image which has pre-built wheels for numpy
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY app/ ./app/

RUN pip install --upgrade pip && \
    pip install --no-cache-dir --target=/packages .

# ─────────────────────────────────────────────────────────────────────────────
# Runtime stage — Lambda base image
# ─────────────────────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy pre-built packages from builder
COPY --from=builder /packages ${LAMBDA_TASK_ROOT}

# Copy application source
COPY app/ ./app/

ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=${APP_VERSION}

CMD ["app.main.handler"]
