#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy_aws.sh — Bootstrap and deploy ML Analytics API to AWS free tier
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Docker installed and running
#   - jq installed
#
# Free-tier services used:
#   - ECR          (repository for Docker images)
#   - Lambda       (1M requests/month free)
#   - API Gateway  (1M calls/month free)
#   - RDS          (db.t3.micro, 20GB, 750 hrs/month free)
#   - S3           (5GB free for model artefacts)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="mlapi"
LAMBDA_NAME="mlapi-prod"
API_GW_NAME="mlapi-api"
S3_BUCKET="mlapi-artefacts-${ACCOUNT_ID}"
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:latest"

echo "🚀  Deploying ML Analytics API to AWS"
echo "    Account : $ACCOUNT_ID"
echo "    Region  : $AWS_REGION"
echo ""

# ── 1. Create ECR repository (idempotent) ─────────────────────────────────
echo "📦  Setting up ECR repository..."
aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" \
  > /dev/null 2>&1 || \
  aws ecr create-repository \
    --repository-name "$ECR_REPO" \
    --image-scanning-configuration scanOnPush=true \
    --region "$AWS_REGION"

# ── 2. Build & push Docker image ──────────────────────────────────────────
echo "🐳  Building and pushing Docker image..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
    "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build -t "$ECR_REPO" .
docker tag "${ECR_REPO}:latest" "$IMAGE_URI"
docker push "$IMAGE_URI"

# ── 3. Create S3 bucket for model artefacts ───────────────────────────────
echo "🗄️   Setting up S3 bucket for artefacts..."
aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null || \
  aws s3api create-bucket \
    --bucket "$S3_BUCKET" \
    --region "$AWS_REGION" \
    --create-bucket-configuration LocationConstraint="$AWS_REGION"

aws s3api put-bucket-encryption \
  --bucket "$S3_BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# ── 4. Create Lambda execution role ───────────────────────────────────────
ROLE_NAME="mlapi-lambda-role"
echo "🔐  Creating Lambda execution role..."
aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1 || {
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{
        "Effect":"Allow",
        "Principal":{"Service":"lambda.amazonaws.com"},
        "Action":"sts:AssumeRole"
      }]
    }'
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
  sleep 10  # propagation delay
}
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)

# ── 5. Create or update Lambda function ───────────────────────────────────
echo "⚡  Deploying Lambda function..."
LAMBDA_EXISTS=$(aws lambda get-function --function-name "$LAMBDA_NAME" \
  --region "$AWS_REGION" 2>/dev/null && echo "yes" || echo "no")

LAMBDA_ENV="Variables={
  ENVIRONMENT=production,
  DATABASE_URL=${DATABASE_URL:-sqlite+aiosqlite:///./prod.db},
  S3_BUCKET_NAME=${S3_BUCKET},
  AWS_REGION_NAME=${AWS_REGION}
}"

if [ "$LAMBDA_EXISTS" = "yes" ]; then
  aws lambda update-function-code \
    --function-name "$LAMBDA_NAME" \
    --image-uri "$IMAGE_URI" \
    --region "$AWS_REGION"
else
  aws lambda create-function \
    --function-name "$LAMBDA_NAME" \
    --package-type Image \
    --code ImageUri="$IMAGE_URI" \
    --role "$ROLE_ARN" \
    --timeout 300 \
    --memory-size 1024 \
    --environment "$LAMBDA_ENV" \
    --region "$AWS_REGION"
fi

# Wait for update to complete
aws lambda wait function-updated \
  --function-name "$LAMBDA_NAME" \
  --region "$AWS_REGION"

# ── 6. Create Lambda Function URL (free, no API GW needed for dev) ─────────
echo "🌐  Setting up Lambda Function URL..."
aws lambda add-permission \
  --function-name "$LAMBDA_NAME" \
  --statement-id FunctionURLAllowPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE \
  --region "$AWS_REGION" 2>/dev/null || true

FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name "$LAMBDA_NAME" \
  --region "$AWS_REGION" \
  --query FunctionUrl --output text 2>/dev/null) || \
FUNCTION_URL=$(aws lambda create-function-url-config \
  --function-name "$LAMBDA_NAME" \
  --auth-type NONE \
  --region "$AWS_REGION" \
  --query FunctionUrl --output text)

echo ""
echo "✅  Deployment complete!"
echo ""
echo "   API URL  : ${FUNCTION_URL}"
echo "   Health   : ${FUNCTION_URL}health"
echo "   Swagger  : (disabled in production)"
echo "   S3       : s3://${S3_BUCKET}"
echo ""
echo "Run smoke test:"
echo "   curl ${FUNCTION_URL}health"
