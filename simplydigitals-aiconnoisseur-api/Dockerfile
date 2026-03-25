# ─────────────────────────────────────────────────────────────────────────────
# Build on the SAME Amazon Linux 2 base as Lambda runtime
# This ensures GLIBC compatibility for compiled packages (scipy, numpy etc.)
# ─────────────────────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS builder

WORKDIR /build

# Install build tools
RUN yum update -y && \
    yum install -y gcc gcc-c++ libpq-devel && \
    yum clean all

# Upgrade pip
RUN pip install --upgrade pip

# Copy dependency manifest
COPY pyproject.toml README.md ./
COPY app/ ./app/

# Install into /packages using manylinux wheels where available
# --prefer-binary forces pre-built manylinux wheels over source builds
RUN pip install \
    --prefer-binary \
    --no-cache-dir \
    --target /packages \
    .

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
