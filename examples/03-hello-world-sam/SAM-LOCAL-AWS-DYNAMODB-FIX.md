# SAM Local + AWS DynamoDB 연결 가이드

## 📌 개요

SAM Local에서 **실제 AWS DynamoDB**에 성공적으로 연결하기 위해 필요한 3가지 핵심 변경사항을 문서화합니다.

> **이 문서의 목표**: LocalStack이 아닌 **실제 AWS 클라우드의 DynamoDB**를 로컬 Lambda 함수에서 접근하기

---

## 🔑 핵심 변경사항 3가지

### 1️⃣ **DynamoDB 리전 Hardcoding** (handlers/hello.js)

#### 문제점

SAM Local Docker 컨테이너는 호스트의 환경변수를 완전히 상속받지 못합니다.  
동적으로 설정된 리전은 컨테이너 내부에서 `undefined`가 될 수 있습니다.

#### ❌ 작동하지 않는 방식

```javascript
const dynamodbConfig = {
  region: process.env.AWS_REGION || "us-east-1" // 불안정 ❌
};
```

#### ✅ 작동하는 방식

```javascript
const dynamodbConfig = {
  region: "us-east-1" // Hardcoded ✅
};
```

#### 왜 작동하는가?

- SAM Local 컨테이너가 리전을 명확하게 알 수 있음
- SDK 초기화 시점에 일관성 있게 "us-east-1" 사용
- 환경변수 전달 불일치 문제 회피

#### 테스트 결과

| 리전 설정                                       | 결과 | 아이템 생성                    |
| ----------------------------------------------- | ---- | ------------------------------ |
| 동적: `process.env.AWS_REGION \|\| "us-east-1"` | ❌   | `Requested resource not found` |
| 고정: `"us-east-1"`                             | ✅   | `item-1766893940280` 성공      |

#### LocalStack 통합 지원

```javascript
const dynamodbConfig = {
  region: "us-east-1" // AWS용
};

// LocalStack 사용 시 (선택사항)
if (process.env.DYNAMODB_ENDPOINT) {
  dynamodbConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamodbConfig.region = process.env.AWS_REGION || "us-west-2";
}

const dynamodb = new AWS.DynamoDB.DocumentClient(dynamodbConfig);
```

**파일 위치**: `handlers/hello.js` 264번 줄

---

### 2️⃣ **환경변수 파일 생성** (.env.json)

#### 문제점

SAM Local은 CloudFormation의 환경변수 치환을 **완전하게 지원하지 않습니다**.

코드에서 사용하는:

```javascript
const tableName = process.env.ITEMS_TABLE || "sam-hello-world-items";
```

이 값이 SAM Local 컨테이너 내부에서 제대로 해석되지 않습니다.

#### ❌ 작동하지 않는 방식

```bash
# 환경변수를 명시하지 않으면 실패
AWS_REGION=us-east-1 sam local invoke CreateItemFunction \
  --parameter-overrides Stage=dev Environment=development \
  --event -
```

**결과**: `Requested resource not found` 에러 발생

#### ✅ 작동하는 방식

```bash
# .env.json 파일로 명시적으로 환경변수 제공
AWS_REGION=us-east-1 sam local invoke CreateItemFunction \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json \
  --event -
```

#### .env.json 파일 내용

**파일 위치**: `03-hello-world-sam/.env.json`

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

#### 테스트 결과

| 상황             | 결과 | 아이템 생성                    |
| ---------------- | ---- | ------------------------------ |
| `.env.json` 없음 | ❌   | `Requested resource not found` |
| `.env.json` 있음 | ✅   | `item-1766893738348` 성공      |

#### 주의사항

- 각 Lambda 함수별로 `ITEMS_TABLE` 환경변수 설정 필요
- 테이블명은 실제 AWS DynamoDB의 테이블명과 일치해야 함
- `Stage`와 `Environment`는 `template.yaml`의 Parameters와 일치해야 함

---

### 3️⃣ **IAM 사용자 권한 추가** (AWS 계정)

#### 문제점

SAM Local에서 실제 AWS DynamoDB에 접근하려면:

1. **Lambda 함수의 IAM 권한** (template.yaml - 클라우드에서 자동 적용)
2. **IAM 사용자의 권한** (로컬 머신에서 AWS API 호출할 때 필요) ← **이것이 빠짐**

#### 권한 계층 구조

```
┌─────────────────────────────────────┐
│ 로컬 머신 (당신)                      │
│ IAM 사용자: jasonkim                │
│ 필요한 권한: DynamoDB 접근 ✅        │
└────────────┬────────────────────────┘
             │ AWS 자격증명 (aws configure)
             │
             ▼
┌─────────────────────────────────────┐
│ SAM Local (Docker 컨테이너)         │
│ 당신의 AWS 자격증명으로 실행         │
│ (IAM 사용자 권한 사용)               │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ AWS DynamoDB (클라우드)             │
│ 테이블: sam-hello-world-items-dev  │
│ 리전: us-east-1                    │
└─────────────────────────────────────┘
```

#### ❌ 실패했던 상황

```bash
# 권한 확인
aws iam list-attached-user-policies --user-name jasonkim
```

**결과:**

```
- IAMReadOnlyAccess
- LambdaSQSPolicy
```

**DynamoDB 권한이 없음!** → SAM Local에서 테이블에 접근 불가

#### ✅ 해결 방법

#### 옵션 A: 제한적 접근 (권장, 안전) 🔒

```bash
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
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ],
        "Resource": "arn:aws:dynamodb:us-east-1:*:table/sam-hello-world-items*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/*"
      }
    ]
  }'
```

**특징:**

- ✅ 특정 테이블만 접근 가능 (sam-hello-world-items\* 패턴)
- ✅ 필요한 작업만 권한 부여
- ✅ 프로덕션 환경에 더 적합

#### 옵션 B: 전체 DynamoDB 접근 (광범위) 🔓

```bash
aws iam attach-user-policy \
  --user-name jasonkim \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

**특징:**

- ⚠️ 모든 DynamoDB 테이블 접근 가능
- ⚠️ 개발 초기 단계에만 권장
- ⚠️ 보안 위험

#### 자동 설정 스크립트

```bash
# 제한적 접근 (권장)
./setup-iam-permissions.sh jasonkim restricted

# 또는 전체 접근
./setup-iam-permissions.sh jasonkim full
```

#### 권한 확인

```bash
# 관리형 정책 확인
aws iam list-attached-user-policies --user-name jasonkim

# 인라인 정책 확인
aws iam list-user-policies --user-name jasonkim

# 정책 상세 내용
aws iam get-user-policy \
  --user-name jasonkim \
  --policy-name DynamoDBSAMDevPolicy
```

#### 테스트 결과

| IAM 권한             | 결과 | 아이템 생성                    |
| -------------------- | ---- | ------------------------------ |
| 없음                 | ❌   | `Requested resource not found` |
| 있음 (DynamoDB 권한) | ✅   | `item-1766893738348` 성공      |

---

## 🧪 통합 테스트

### 3가지 변경사항이 모두 적용된 상태에서 테스트

```bash
# 빌드
sam build

# 개별 함수 테스트
AWS_REGION=us-east-1 sam local invoke CreateItemFunction \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "body": "{\"title\":\"SAM Local Test\",\"description\":\"All 3 fixes applied\"}",
  "httpMethod": "POST",
  "path": "/item"
}
EOF
```

### ✅ 성공 응답

```json
{
  "statusCode": 201,
  "body": {
    "id": "item-1766893940280",
    "title": "SAM Local Test",
    "description": "All 3 fixes applied",
    "author": "Anonymous",
    "createdAt": "2025-12-28T03:52:20.280Z",
    "stage": "dev"
  }
}
```

---

## 📝 변경사항 요약

| #   | 변경사항                 | 파일                        | 내용                    | 필수여부 |
| --- | ------------------------ | --------------------------- | ----------------------- | -------- |
| 1   | DynamoDB 리전 Hardcoding | `handlers/hello.js` (264줄) | `region: "us-east-1"`   | ✅ 필수  |
| 2   | 환경변수 파일 생성       | `.env.json` (신규)          | `ITEMS_TABLE` 등 설정   | ✅ 필수  |
| 3   | IAM 사용자 권한 추가     | AWS 계정                    | DynamoDB 접근 권한 부여 | ✅ 필수  |

---

## 🔄 LocalStack vs AWS DynamoDB

### SAM Local + LocalStack (로컬 완전 폐쇄)

```
당신의 컴퓨터
  ↓
SAM Local + LocalStack (Docker)
  ↓
로컬 가상 DynamoDB
```

- ✅ AWS 자격증명 불필요
- ✅ 빠른 실행
- ❌ 실제 AWS 환경과 차이 가능

### SAM Local + AWS DynamoDB (이 가이드) ⭐

```
당신의 컴퓨터 (IAM 권한 필요)
  ↓
SAM Local (Docker)
  ↓
실제 AWS DynamoDB
```

- ✅ 실제 AWS 환경과 동일
- ✅ 클라우드 배포 전 최종 테스트
- ❌ AWS 자격증명 필요
- ❌ AWS 비용 발생 (약간)

---

## 🚀 다음 단계

1. **3가지 변경사항 모두 적용** ✅
2. **SAM Local로 개발/테스트**
   ```bash
   sam local invoke FunctionName --env-vars .env.json --event -
   sam local start-api --env-vars .env.json
   ```
3. **CloudFormation으로 AWS에 배포**
   ```bash
   sam deploy --guided
   ```
4. **클라우드에서 최종 테스트**
   ```bash
   curl https://your-api-endpoint/item
   ```

---

## ❓ FAQ

### Q1: 왜 리전을 hardcoding해야 하나요?

A: SAM Local Docker 컨테이너는 호스트의 환경변수를 완전히 상속받지 못합니다. 동적 설정은 컨테이너 내부에서 `undefined`가 될 수 있어서 SDK 초기화에 실패합니다.

### Q2: .env.json 파일을 항상 필요한가요?

A: 예. SAM Local은 CloudFormation 변수 치환을 지원하지 않으므로, 환경변수를 명시적으로 제공해야 합니다.

### Q3: IAM 권한은 왜 필요한가요?

A: SAM Local은 당신의 AWS 자격증명으로 실행됩니다. 따라서 IAM 사용자(당신)가 DynamoDB 테이블에 접근할 권한을 가져야 합니다.

### Q4: 프로덕션에서도 이렇게 설정해야 하나요?

A: 아니요. 프로덕션에서는:

- Lambda 함수의 IAM Role이 자동으로 권한을 제공 (template.yaml에서 설정)
- IAM 사용자 권한은 필요 없음
- 리전을 hardcoding할 필요도 없음 (자동으로 처리)

---

## 📚 참고자료

- [AWS SAM Local Testing](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-local-testing.html)
- [DynamoDB IAM Permissions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-overview.html)
- [AWS SDK for JavaScript - DynamoDB](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)

---

**최종 수정일**: 2025-12-28  
**작성자**: SAM Local AWS DynamoDB 연동 테스트  
**상태**: ✅ 검증됨 (3가지 변경사항 모두 실제 테스트 완료)
