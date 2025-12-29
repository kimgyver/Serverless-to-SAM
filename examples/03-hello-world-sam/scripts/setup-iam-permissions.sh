#!/bin/bash

# ============================================
# SAM Local Development IAM Permissions Setup
# ============================================
# This script configures IAM permissions for local SAM development
# Usage: ./setup-iam-permissions.sh [user-name] [method]
#   user-name: AWS IAM username (default: jasonkim)
#   method: 'full' for full DynamoDB access, 'restricted' for table-specific (default: restricted)

set -e

# Configuration
USER_NAME="${1:-jasonkim}"
METHOD="${2:-restricted}"
AWS_REGION="${AWS_REGION:-us-east-1}"
TABLE_PATTERN="sam-hello-world-items*"

echo "================================================"
echo "SAM Local Development IAM Setup"
echo "================================================"
echo "User: $USER_NAME"
echo "Method: $METHOD"
echo "Region: $AWS_REGION"
echo ""

# Verify user exists
if ! aws iam get-user --user-name "$USER_NAME" &>/dev/null; then
  echo "❌ Error: IAM user '$USER_NAME' does not exist"
  echo "Please create the user first or specify a different user"
  exit 1
fi

echo "✅ User '$USER_NAME' found"
echo ""

if [ "$METHOD" = "full" ]; then
  # Method 2: Full DynamoDB Access
  echo "📌 Setting up FULL DynamoDB access..."
  echo ""
  
  POLICY_ARN="arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
  
  echo "Attaching policy: $POLICY_ARN"
  aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "$POLICY_ARN"
  
  echo ""
  echo "✅ Full DynamoDB access granted to $USER_NAME"
  echo "⚠️  WARNING: This grants access to ALL DynamoDB tables!"
  echo ""

elif [ "$METHOD" = "restricted" ]; then
  # Method 3: Restricted (Table-Specific) Access
  echo "📌 Setting up RESTRICTED access (specific tables only)..."
  echo "Table pattern: $TABLE_PATTERN"
  echo ""
  
  POLICY_NAME="DynamoDBSAMDevPolicy"
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  
  POLICY_DOCUMENT=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:table/$TABLE_PATTERN"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:$AWS_REGION:$ACCOUNT_ID:log-group:/aws/lambda/*"
    }
  ]
}
EOF
)
  
  echo "Attaching inline policy: $POLICY_NAME"
  echo "Permissions: GetItem, PutItem, UpdateItem, DeleteItem, Scan, Query, BatchGetItem, BatchWriteItem"
  echo ""
  
  aws iam put-user-policy \
    --user-name "$USER_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOCUMENT"
  
  echo "✅ Restricted policy '$POLICY_NAME' attached to $USER_NAME"
  echo "✅ Permissions limited to tables matching: $TABLE_PATTERN"
  echo ""
  
else
  echo "❌ Error: Invalid method '$METHOD'"
  echo "Valid methods: 'full' or 'restricted'"
  exit 1
fi

echo "================================================"
echo "Verification: Attached policies for $USER_NAME"
echo "================================================"
aws iam list-attached-user-policies --user-name "$USER_NAME" --query 'AttachedPolicies[*].[PolicyName,PolicyArn]' --output table

echo ""
echo "Inline policies:"
aws iam list-user-policies --user-name "$USER_NAME" --query 'PolicyNames' --output text | tr '\t' '\n'

echo ""
echo "================================================"
echo "✅ Setup complete!"
echo "================================================"
echo ""
echo "You can now use SAM Local:"
echo "  sam local invoke CreateItemFunction --env-vars .env.json --event ..."
echo "  sam local start-api --env-vars .env.json"
echo ""
