# GitHub Repository Secrets

Configure these secrets in your GitHub repository under
**Settings → Secrets and variables → Actions → New repository secret**.

## Required for all environments

| Secret | Description | Example |
|--------|-------------|---------|
| `SECRET_KEY` | JWT signing key (≥32 chars, random) | `openssl rand -hex 32` |
| `CODECOV_TOKEN` | Codecov upload token | From codecov.io |

## Required for AWS deployment (main branch)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID |
| `DATABASE_URL` | Production PostgreSQL URL |

## Optional quality metrics

| Secret | Description |
|--------|-------------|
| `SONAR_TOKEN` | SonarCloud analysis token |
| `SAFETY_API_KEY` | Safety CLI API key for enhanced vuln DB |

## IAM Permissions needed for deploy user

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:CreateRepository",
        "ecr:DescribeRepositories"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:CreateFunction",
        "lambda:GetFunctionUrlConfig",
        "lambda:CreateFunctionUrlConfig",
        "lambda:AddPermission",
        "lambda:WaitForFunctionUpdated"
      ],
      "Resource": "arn:aws:lambda:*:*:function:mlapi-*"
    },
    {
      "Effect": "Allow",
      "Action": ["iam:GetRole", "iam:CreateRole", "iam:AttachRolePolicy"],
      "Resource": "arn:aws:iam::*:role/mlapi-*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:CreateBucket", "s3:PutBucketEncryption"],
      "Resource": "arn:aws:s3:::mlapi-*"
    }
  ]
}
```
