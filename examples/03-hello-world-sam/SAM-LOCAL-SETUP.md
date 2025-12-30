# SAM Local Development Setup Guide

> **완료 상태**: ✅ 모든 설정 완료 및 테스트 통과 (33/33)
> **마지막 업데이트**: 2025-12-30

이 가이드는 SAM Local을 사용하여 AWS DynamoDB와 연동하여 로컬에서 Lambda 함수를 테스트하는 **단계별 실행 방법**을 설명합니다.

> **참고**: SAM Local의 3가지 핵심 변경사항에 대한 상세 설명은 [SAM-LOCAL-AWS-DYNAMODB-FIX.md](./SAM-LOCAL-AWS-DYNAMODB-FIX.md)를 참고하세요.

## 📋 전제 조건

- ✅ AWS CLI 설치 및 설정 (`aws configure`)
- ✅ AWS IAM 사용자 계정
- ✅ Docker 설치
- ✅ SAM CLI 설치
- ✅ Node.js 18.x 이상

## ⚡ 빠른 시작 (모든 테스트 한 번에)

```bash
# 1. LocalStack 실행
docker-compose up -d

# 2. 모든 테스트 실행 (33/33 성공)
npm run test:all
```

---

## 🔑 1단계: IAM 권한 설정

> **상세 정보**: [SAM-LOCAL-AWS-DYNAMODB-FIX.md](./SAM-LOCAL-AWS-DYNAMODB-FIX.md)의 "3️⃣ IAM 사용자 권한 추가" 섹션을 참고하세요.

### 빠른 설정 (자동 스크립트)

```bash
# 제한적 접근 (권장, 안전)
./setup-iam-permissions.sh jasonkim restricted

# 또는 전체 DynamoDB 접근 (개발 초기)
./setup-iam-permissions.sh jasonkim full
```

### ✅ 권한 확인

```bash
# 사용자의 정책 확인
aws iam list-attached-user-policies --user-name jasonkim
aws iam list-user-policies --user-name jasonkim
```

## 🏗️ 2단계: 핵심 설정 확인

> **상세 정보**: [SAM-LOCAL-AWS-DYNAMODB-FIX.md](./SAM-LOCAL-AWS-DYNAMODB-FIX.md)의 다음 섹션을 참고하세요:
>
> - 1️⃣ DynamoDB 리전 Hardcoding
> - 2️⃣ 환경변수 파일 생성

### 필수 체크리스트

```bash
# 1. .env.json 파일 존재 확인
ls -la .env.json

# 2. handlers/hello.js에서 리전이 hardcoded되었는지 확인
grep 'region:' handlers/hello.js
# 출력 예: const dynamodbConfig = { region: "us-east-1" }

# 3. DynamoDB 테이블 존재 확인
aws dynamodb describe-table --table-name hello-world-items-dev
```

## 🚀 3단계: SAM Local 실행

### 빌드

```bash
sam build
```

### 개별 함수 테스트

#### CreateItem 함수 테스트

```bash
AWS_REGION=us-east-1 sam local invoke CreateItemFunction \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "body": "{\"title\":\"My Item\",\"description\":\"Test item\"}",
  "httpMethod": "POST",
  "path": "/item"
}
EOF
```

````

**예상 응답:**

```json
{
  "statusCode": 201,
  "body": {
    "id": "item-1766893738348",
    "title": "My Item",
    "description": "Test item",
    "author": "Anonymous",
    "createdAt": "2025-12-28T03:48:58.348Z",
    "stage": "dev"
  }
}
````

#### ListItems 함수 테스트

```bash
AWS_REGION=us-east-1 sam local invoke ListItemsFunction \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "httpMethod": "GET",
  "path": "/items"
}
EOF
```

#### UpdateItem 함수 테스트

```bash
AWS_REGION=us-east-1 sam local invoke UpdateItemFunction \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "body": "{\"title\":\"Updated Title\"}",
  "pathParameters": {"id": "item-1766893738348"},
  "httpMethod": "PUT",
  "path": "/item/item-1766893738348"
}
EOF
```

#### DeleteItem 함수 테스트

```bash
AWS_REGION=us-east-1 sam local invoke DeleteItemFunction \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "pathParameters": {"id": "item-1766893738348"},
  "httpMethod": "DELETE",
  "path": "/item/item-1766893738348"
}
EOF
```

### API Gateway 에뮬레이션 실행

```bash
sam local start-api \
  --port 3000 \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json
```

그 후 브라우저나 curl로 테스트:

```bash
# Create Item
curl -X POST http://localhost:3000/item \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Testing SAM Local"}'

# List Items
curl http://localhost:3000/items

# Update Item
curl -X PUT http://localhost:3000/item/{id} \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated"}'

# Delete Item
curl -X DELETE http://localhost:3000/item/{id}
```

## 🐛 문제 해결

### 에러: "Requested resource not found"

**원인:**

1. `.env.json` 파일이 없음
2. `ITEMS_TABLE` 환경변수가 설정되지 않음
3. DynamoDB 테이블이 존재하지 않음
4. IAM 사용자 권한 부족

**해결:**

```bash
# 1. .env.json 파일 확인
ls -la .env.json

# 2. 테이블 존재 확인
aws dynamodb describe-table --table-name sam-hello-world-items-dev

# 3. IAM 권한 다시 설정
./setup-iam-permissions.sh jasonkim restricted

# 4. SAM 다시 빌드
sam build
```

### 에러: "Cannot find module 'aws-sdk'"

```bash
# node_modules 재설치
cd handlers && npm install && cd ..

# SAM 빌드
sam build
```

### Docker 이미지 문제

```bash
# Docker 이미지 업데이트
sam build --use-container
```

## 📊 구조 요약

```
SAM Local 실행 흐름:
┌─────────────────────────────────────┐
│ 1. 로컬 머신 (당신의 컴퓨터)         │
│    - IAM 사용자 권한 필요            │
│    - AWS 자격증명 사용               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. SAM Local (Docker 컨테이너)      │
│    - Lambda 함수 실행                │
│    - .env.json으로 환경변수 제공    │
│    - 리전: us-east-1 (hardcoded)   │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. AWS DynamoDB (실제 클라우드)     │
│    - 테이블: sam-hello-world-items  │
│    - 리전: us-east-1                │
│    - 테이블 생성 필요 (CloudFormation)
└─────────────────────────────────────┘
```

## ✅ 최종 체크리스트

- [ ] AWS CLI 설정 완료 (`aws configure`)
- [ ] IAM 권한 설정 완료 (`./scripts/setup-iam-permissions.sh` 실행)
- [ ] `.env.json` 파일 존재 및 올바른 내용
- [ ] `handlers/hello.js`에서 region이 "us-east-1"로 hardcoded
- [ ] DynamoDB 테이블 존재 (`aws dynamodb list-tables` 확인)
- [ ] Docker 실행 중 (`docker ps` 확인)
- [ ] `sam build` 성공 (`.aws-sam/` 디렉토리 생성)
- [ ] `sam local invoke` 테스트 성공 (JSON 응답 확인)

## 📚 참고자료

- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/)
- [SAM Local Testing](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-local-testing.html)
- [DynamoDB IAM Permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-overview.html)
