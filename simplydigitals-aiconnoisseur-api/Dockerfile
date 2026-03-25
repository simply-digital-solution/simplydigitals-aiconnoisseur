# ─── Build stage ─────────────────────────────────────────────────────────────
# Use standard python image for building — it has all tools (gcc, etc.)
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy metadata and source
COPY pyproject.toml README.md ./
COPY app/ app/

# Install the application and all dependencies into /install
# Use --verbose to see exactly where it fails if it does
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --target /install --verbose .

# ─── Runtime stage ────────────────────────────────────────────────────────────
# Use the official AWS Lambda Python image for the final runtime
FROM public.ecr.aws/lambda/python:3.11 AS runtime

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy installed packages from builder
COPY --from=builder /install ${LAMBDA_TASK_ROOT}

# Copy application source explicitly to ensure it is in the task root
COPY app/ ${LAMBDA_TASK_ROOT}/app/

# Set the handler to Mangum
CMD ["app.main.handler"]
