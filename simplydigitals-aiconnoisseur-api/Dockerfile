# ─── Build stage ─────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS builder

WORKDIR /build

# Install minimal build tools
RUN yum install -y gcc gcc-c++

# Copy metadata first to leverage Docker cache
COPY pyproject.toml README.md ./
# Copy app source (required for 'pip install .')
COPY app/ app/

# Install the application and all dependencies into a target directory
# We install '.' which reads dependencies from pyproject.toml
RUN mkdir /install && \
    pip install --no-cache-dir --target /install .

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM public.ecr.aws/lambda/python:3.11 AS runtime

# The AWS Lambda Python image sets LAMBDA_TASK_ROOT to /var/task
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy everything from the builder's install directory
COPY --from=builder /install ${LAMBDA_TASK_ROOT}

# Ensure the app code is also in the root (pip install . puts it in site-packages,
# but having it in the task root is safer for Mangum/FastAPI discovery)
COPY app/ ${LAMBDA_TASK_ROOT}/app/

# Set the handler to Mangum
CMD ["app.main.handler"]
