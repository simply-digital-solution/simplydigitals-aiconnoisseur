# ─── Build stage ─────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS builder

WORKDIR /build

# Install build dependencies (Amazon Linux uses yum)
# postgresql-devel provides pg_config and headers for psycopg2
RUN yum install -y gcc gcc-c++ postgresql-devel

COPY pyproject.toml README.md requirements.txt ./
COPY app/ app/

# Install dependencies into /install
# We use --upgrade to ensure we get the latest compatible versions
RUN mkdir /install && \
    pip install --no-cache-dir --target /install -r requirements.txt && \
    pip install --no-cache-dir --target /install .

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS runtime

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy installed packages from builder
COPY --from=builder /install ${LAMBDA_TASK_ROOT}

# Copy application source
COPY app/ ${LAMBDA_TASK_ROOT}/app/

# Set the handler to Mangum
CMD ["app.main.handler"]
