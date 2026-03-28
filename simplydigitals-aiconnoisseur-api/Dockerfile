# ─────────────────────────────────────────────────────────────────────────────
# Build on the SAME Amazon Linux 2 base as Lambda runtime
# This ensures GLIBC compatibility for all compiled packages
# ─────────────────────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS builder

WORKDIR /build

# Install build tools for packages that compile C extensions
RUN yum update -y && \
    yum install -y gcc gcc-c++ libpq-devel python3-devel && \
    yum clean all

RUN pip install --upgrade pip

# Copy dependency manifest
COPY pyproject.toml README.md ./
COPY app/ ./app/

# Install all packages with --prefer-binary to get manylinux wheels
# where available (numpy, scipy, pandas, scikit-learn etc.)
RUN pip install \
    --prefer-binary \
    --no-cache-dir \
    --target /packages \
    .

# Explicitly reinstall packages that have no manylinux wheel
# and must be compiled from source on Amazon Linux 2
RUN pip install \
    --no-cache-dir \
    --no-binary asyncpg,psycopg2 \
    --target /packages \
    "asyncpg>=0.29.0" \
    "psycopg2-binary>=2.9.9"

# ─────────────────────────────────────────────────────────────────────────────
# Runtime — same Lambda base image (Amazon Linux 2, GLIBC 2.26)
# ─────────────────────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy all pre-built packages
COPY --from=builder /packages ${LAMBDA_TASK_ROOT}

# Copy application source and migrations
COPY app/ ./app/
COPY alembic.ini ./
COPY migrations/ ./migrations/

ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=${APP_VERSION}

CMD ["app.main.handler"]
