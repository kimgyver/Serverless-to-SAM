# SAM Local Development Setup Guide

이 가이드는 SAM Local을 사용하여 AWS DynamoDB와 연동하여 로컬에서 Lambda 함수를 테스트하는 방법을 설명합니다.

## 📋 전제 조건

- ✅ AWS CLI 설치 및 설정 (`aws configure`)
- ✅ AWS IAM 사용자 계정
- ✅ Docker 설치
- ✅ SAM CLI 설치
- ✅ Node.js 18.x 이상

## 🔑 1단계: IAM 권한 설정

### 옵션 A: 자동 설정 (권장)

#### 방법 1 - 특정 테이블만 접근 (제한적, 안전)

```bash
./setup-iam-permissions.sh jasonkim restricted
```

**설정되는 권한:**

- `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`
- `dynamodb:Scan`, `Query`, `BatchGetItem`, `BatchWriteItem`
- 테이블: `sam-hello-world-items*` 패턴만 접근 가능

#### 방법 2 - 모든 DynamoDB 접근 (광범위)

```bash
./setup-iam-permissions.sh jasonkim full
```

**설정되는 권한:**

- 모든 DynamoDB 작업 (권장하지 않음 - 프로덕션용 아님)

### 옵션 B: 수동 설정

```bash
# 방법 1 - 제한적 접근
aws iam put-user-policy \
  --user-name jasonkim \
  --policy-name DynamoDBSAMDevPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ],
        "Resource": "arn:aws:dynamodb:us-east-1:*:table/sam-hello-world-items*"
      }
    ]
  }'

# 방법 2 - 전체 접근
aws iam attach-user-policy \
  --user-name jasonkim \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

### ✅ 권한 확인

```bash
# 사용자가 가진 정책 확인
aws iam list-attached-user-policies --user-name jasonkim

# Inline 정책 확인
aws iam list-user-policies --user-name jasonkim

# 특정 정책 상세 정보
aws iam get-user-policy --user-name jasonkim --policy-name DynamoDBSAMDevPolicy
```

## 🏗️ 2단계: 핵심 설정 확인

### .env.json 파일 확인

SAM Local은 환경변수를 완벽하게 상속받지 못하므로, 명시적으로 설정해야 합니다:

```json
{
  "CreateItemFunction": {
    "ITEMS_TABLE": "sam-hello-world-items-dev",
    "STAGE": "dev",
    "ENVIRONMENT": "development"
  },
  "ListItemsFunction": {
    "ITEMS_TABLE": "sam-hello-world-items-dev",
    "STAGE": "dev",
    "ENVIRONMENT": "development"
  },
  "UpdateItemFunction": {
    "ITEMS_TABLE": "sam-hello-world-items-dev",
    "STAGE": "dev",
    "ENVIRONMENT": "development"
  },
  "DeleteItemFunction": {
    "ITEMS_TABLE": "sam-hello-world-items-dev",
    "STAGE": "dev",
    "ENVIRONMENT": "development"
  }
}
```

### handlers/hello.js 확인

DynamoDB 리전이 명시적으로 설정되어 있는지 확인:

```javascript
const dynamodbConfig = {
  region: "us-east-1" // ← 반드시 hardcoded여야 함
};
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
```

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

## ✅ 체크리스트

- [ ] AWS CLI 설정 완료 (`aws configure`)
- [ ] IAM 권한 설정 완료 (./setup-iam-permissions.sh 실행)
- [ ] .env.json 파일 존재
- [ ] handlers/hello.js에서 region이 "us-east-1"로 hardcoded
- [ ] DynamoDB 테이블 존재 (sam-hello-world-items-dev)
- [ ] Docker 실행 중
- [ ] `sam build` 성공
- [ ] `sam local invoke` 테스트 성공

## 📚 참고자료

- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/)
- [SAM Local Testing](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-local-testing.html)
- [DynamoDB IAM Permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-overview.html)
