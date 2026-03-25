# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — AI Connoisseur API
#
# Uses the official AWS Lambda Python 3.11 base image which provides:
#   - GCC 11+ (satisfies NumPy build requirements)
#   - The exact runtime environment Lambda uses in production
# ─────────────────────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11

WORKDIR ${LAMBDA_TASK_ROOT}

# Install build dependencies
RUN yum update -y && \
    yum install -y gcc gcc-c++ libpq-devel && \
    yum clean all

# Copy dependency manifests first for better layer caching
COPY pyproject.toml README.md ./

# Copy application source
COPY app/ ./app/

# Install all dependencies directly into the Lambda task root
RUN pip install --upgrade pip && \
    pip install --no-cache-dir .

# Accept version build arg for labelling
ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=${APP_VERSION}

# Lambda handler — Mangum wraps FastAPI for Lambda
CMD ["app.main.handler"]
