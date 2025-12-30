#!/bin/bash

# AWS Lambda API Gateway 라이브 테스트
# 배포된 실제 AWS Lambda 함수를 테스트합니다.
#
# 사용법: ./test/aws-lambda.test.sh

# API 엔드포인트 설정 (배포 후 업데이트 필요)
API="${API_ENDPOINT:-https://your-api-endpoint.execute-api.us-west-2.amazonaws.com/dev}"

echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║          🚀 AWS LAMBDA API GATEWAY 라이브 테스트                          ║"
echo "║               8개 함수 자동 검증                                          ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "API Endpoint: $API"
echo ""

# API 엔드포인트 확인
if [[ "$API" == *"your-api-endpoint"* ]]; then
  echo "⚠️  경고: API 엔드포인트가 설정되지 않았습니다."
  echo ""
  echo "배포 후 다음 중 하나를 실행하세요:"
  echo ""
  echo "방법 1: 환경변수 설정"
  echo "  export API_ENDPOINT='https://your-actual-endpoint.execute-api.us-west-2.amazonaws.com/dev'"
  echo "  npm run test:aws-lambda"
  echo ""
  echo "방법 2: CloudFormation에서 엔드포인트 조회"
  echo "  aws cloudformation describe-stacks \\"
  echo "    --stack-name hello-world-sam-dev \\"
  echo "    --region us-west-2 \\"
  echo "    --query 'Stacks[0].Outputs[0]' \\"
  echo "    --output text"
  echo ""
  exit 1
fi

passCount=0
failCount=0

test_endpoint() {
  local name=$1
  local method=$2
  local path=$3
  local data=$4

  echo -n "📦 $name ... "

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  # 마지막 줄은 HTTP 상태 코드
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ ($http_code)"
    ((passCount++))
  else
    echo "❌ ($http_code)"
    echo "   Response: $body"
    ((failCount++))
  fi
}

# ========================================
# 테스트 실행
# ========================================
echo "테스트 실행 중...\n"

echo "📌 그룹 1: 기본 함수 테스트\n"

test_endpoint "SayHello" "GET" "/hello"

test_endpoint "Greet (Alice)" "GET" "/hello/Alice"

test_endpoint "CreateMessage" "POST" "/message" \
  '{"title":"Test Title","content":"Test Content"}'

test_endpoint "Divide" "GET" "/divide/10/2"

echo ""
echo "📌 그룹 2: DynamoDB 함수 테스트\n"

test_endpoint "CreateItem" "POST" "/item" \
  '{"title":"AWS Lambda Test Item","description":"Created by live test"}'

test_endpoint "ListItems" "GET" "/items"

test_endpoint "UpdateItem (item-1)" "PUT" "/item/item-1" \
  '{"title":"Updated by AWS Lambda test"}'

test_endpoint "DeleteItem (item-1)" "DELETE" "/item/item-1"

# ========================================
# 결과 요약
# ========================================
echo ""
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                        📊 테스트 결과 요약                                 ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ 성공: $passCount"
echo "❌ 실패: $failCount"
echo ""

total=$((passCount + failCount))

if [ $failCount -eq 0 ] && [ $passCount -gt 0 ]; then
  echo "✨ 모든 테스트 성공! 🎉"
  echo ""
  echo "📌 검증 완료:"
  echo "   ✅ API Gateway 엔드포인트 정상"
  echo "   ✅ SayHello 함수"
  echo "   ✅ Greet 함수"
  echo "   ✅ CreateMessage 함수"
  echo "   ✅ Divide 함수"
  echo "   ✅ DynamoDB CRUD 함수"
  echo ""
  exit 0
else
  echo "⚠️  $failCount개 테스트 실패"
  echo ""
  echo "🔍 트러블슈팅:"
  echo "   1. API 엔드포인트가 올바른지 확인"
  echo "   2. AWS 자격증명이 설정되어 있는지 확인"
  echo "   3. 함수가 배포되었는지 확인"
  echo ""
  exit 1
fi
