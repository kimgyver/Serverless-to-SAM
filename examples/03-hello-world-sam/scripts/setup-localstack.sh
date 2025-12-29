#!/bin/bash

# LocalStack DynamoDB 테이블 생성 스크립트
# sam-hello-world-items-local 테이블 생성

DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:4566}"
AWS_REGION="${AWS_REGION:-us-west-2}"
TABLE_NAME="sam-hello-world-items-local"

echo "🔧 LocalStack DynamoDB 테이블 생성"
echo "Endpoint: $DYNAMODB_ENDPOINT"
echo "Region: $AWS_REGION"
echo "Table: $TABLE_NAME"
echo ""

# 기존 테이블 삭제 (선택사항)
echo "기존 테이블 확인..."
aws dynamodb describe-table \
  --table-name "$TABLE_NAME" \
  --endpoint-url "$DYNAMODB_ENDPOINT" \
  --region "$AWS_REGION" \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ 테이블이 이미 존재합니다."
  exit 0
fi

# 새 테이블 생성
echo "테이블 생성 중..."
aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION" \
  --endpoint-url "$DYNAMODB_ENDPOINT" \
  2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 테이블이 생성되었습니다: $TABLE_NAME"
  exit 0
else
  echo ""
  echo "❌ 테이블 생성 실패"
  exit 1
fi
