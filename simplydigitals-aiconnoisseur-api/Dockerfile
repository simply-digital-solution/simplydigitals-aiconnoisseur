# Use the official AWS Lambda Python image for both build and runtime
# This ensures perfect binary compatibility and eliminates "No such file" errors
FROM public.ecr.aws/lambda/python:3.11

# The AWS Lambda Python image sets LAMBDA_TASK_ROOT to /var/task
WORKDIR ${LAMBDA_TASK_ROOT}

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
