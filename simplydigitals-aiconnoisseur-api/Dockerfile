# ─── Build stage ─────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS builder

WORKDIR /build

# Install build dependencies
RUN yum install -y gcc-c++ postgresql-devel

COPY pyproject.toml README.md ./
COPY app/ app/
COPY requirements.txt ./

# Install dependencies into /install
RUN pip install --no-cache-dir --target /install -r requirements.txt
RUN pip install --no-cache-dir --target /install .

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS runtime

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy installed packages from builder
COPY --from=builder /install ${LAMBDA_TASK_ROOT}

# Copy application source (if not already in /install)
COPY app/ ${LAMBDA_TASK_ROOT}/app/

# Artefact directory for saved models (Lambda /tmp is the only writable area)
# We set the env var in the workflow to /tmp/artefacts
RUN mkdir -p /tmp/artefacts

# Set the handler to Mangum
CMD ["app.main.handler"]
