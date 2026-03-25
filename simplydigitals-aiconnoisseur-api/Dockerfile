# ─────────────────────────────────────────────────────────────────────────────
# Build on the SAME Amazon Linux 2 base as Lambda runtime
# This ensures GLIBC compatibility for compiled packages (scipy, numpy etc.)
# ─────────────────────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS builder

WORKDIR /build

# Install build tools needed for asyncpg and psycopg2
RUN yum update -y && \
    yum install -y gcc gcc-c++ libpq-devel python3-devel && \
    yum clean all

# Upgrade pip
RUN pip install --upgrade pip

# Copy dependency manifest
COPY pyproject.toml README.md ./
COPY app/ ./app/

# Step 1 — install everything with --prefer-binary for manylinux wheels
# This covers numpy, scipy, pandas, scikit-learn etc.
RUN pip install \
    --prefer-binary \
    --no-cache-dir \
    --target /packages \
    .

# Step 2 — force-reinstall asyncpg from source to ensure correct build
# asyncpg has no manylinux wheel so --prefer-binary skips it
RUN pip install \
    --no-cache-dir \
    --no-binary asyncpg \
    --target /packages \
    "asyncpg>=0.29.0"

# ─────────────────────────────────────────────────────────────────────────────
# Runtime — same Lambda base image
# ─────────────────────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy pre-built packages
COPY --from=builder /packages ${LAMBDA_TASK_ROOT}

# Copy application source
COPY app/ ./app/

ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=${APP_VERSION}

CMD ["app.main.handler"]
