# ─── Build stage ─────────────────────────────────────────────────────────────
# Use AWS Lambda Python 3.11 base image for Lambda compatibility
# This image has GCC 11+ which satisfies NumPy 2.x build requirements
FROM public.ecr.aws/lambda/python:3.11 AS builder
# Use the official AWS Lambda Python image for both build and runtime
# This ensures perfect binary compatibility and eliminates "No such file" errors
FROM public.ecr.aws/lambda/python:3.11

# The AWS Lambda Python image sets LAMBDA_TASK_ROOT to /var/task
WORKDIR ${LAMBDA_TASK_ROOT}

# Install build dependencies
RUN yum update -y && yum install -y gcc gcc-c++ libpq-devel && yum clean all

COPY pyproject.toml README.md ./
COPY app/ app/

# Install dependencies into /install prefix
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install .

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS runtime

WORKDIR /var/task

# Copy installed packages from builder
COPY --from=builder /install/lib/python3.11/site-packages \
     /var/task/

# Copy application source
COPY app/ ./app/

# Artefact directory (Lambda can write to /tmp only)
RUN mkdir -p /tmp/artefacts

# Lambda handler — Mangum wraps FastAPI for Lambda
# Install minimal build tools needed for native extensions (like pandas/numpy)
RUN yum install -y gcc gcc-c++

# Copy application metadata and source
COPY pyproject.toml README.md ./
COPY app/ app/

# Install the application and all dependencies directly into the image
# We upgrade pip first to ensure the best compatibility with modern wheels
RUN pip install --upgrade pip && \
    pip install --no-cache-dir .

# The handler is mangum-wrapped FastAPI in app/main.py
CMD ["app.main.handler"]
