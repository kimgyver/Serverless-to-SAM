# SAM Example 1: Hello World - Complete Guide

**완료 상태**: ✅ 100% 완료 및 테스트 통과 (33/33 성공)  
**마지막 업데이트**: 2025-12-30

## 📌 목적

이 예제는 **AWS SAM (Serverless Application Model)**의 기본 개념을 실습하기 위한 프로젝트입니다.

Serverless Framework 예제(01-hello-world)와 비교하면서 **SAM의 명시적 리소스 정의**, **Parameter 활용**, **Globals 설정** 등을 배울 수 있습니다.

## 🎯 테스트 현황

```
✅ LocalStack 테스트:     17/17 성공 (4개 기본 함수 + 4개 CRUD + 9개 에러 케이스)
✅ SAM Local 테스트:      8/8 성공  (4개 기본 함수 + 4개 CRUD)
✅ AWS Lambda 테스트:     8/8 성공  (클라우드 배포 후 실제 검증)
────────────────────────────────────────────────────────
✅ 총: 33/33 모든 테스트 통과 🎉

배포 환경: AWS CloudFormation Stack (hello-world-sam-dev, us-east-1)
```

---

## 🏗️ 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                            │
│         (REST API, CloudWatch Logs, X-Ray Tracing)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
    ┌─────────────────────────┬─────────────────────────┐
    ↓                         ↓                         ↓
GET /say-hello        GET /greet/{name}        POST /message
    ↓                         ↓                         ↓
SayHello 📄         GreetFunction 📄      CreateMessage 📄
    |                         |                         |
    └─────────────────────────┴─────────────────────────┘
                            ↓
                    CloudWatch Logs
                    (모든 함수 로깅)

    POST /divide           POST /item            GET /items
         ↓                   ↓                      ↓
  DivideFunction         CreateItem ──┐        ListItems
         |                   |         ├──→ DynamoDB
    Lambda Layer      UpdateItem ────┘      (Local)
  (Shared Logic)        DeleteItem

POST /item/{id}    PUT /item/{id}     DELETE /item/{id}
     ↓                   ↓                    ↓
  CreateItem        UpdateItem          DeleteItem
                        ↓
                    DynamoDB
               (sam-hello-world-items-{Stage})
```

### 로컬 vs AWS 환경

```
┌───────────────────────────────┐         ┌───────────────────────────────┐
│        로컬 개발 환경           │         │       AWS 배포 환경           │
├───────────────────────────────┤         ├───────────────────────────────┤
│ Host Machine                  │         │ AWS 계정                      │
│  ├─ Node.js 18.x             │         │  ├─ Lambda Functions         │
│  ├─ npm (test)               │         │  ├─ API Gateway (REST)       │
│  └─ Docker                   │         │  ├─ DynamoDB Tables          │
│     └─ LocalStack            │         │  ├─ IAM Roles                │
│        ├─ DynamoDB           │         │  ├─ CloudWatch Logs          │
│        └─ Port 4566 ✅        │         │  ├─ CloudWatch Alarms        │
│                              │         │  └─ CloudFormation Stack     │
│ Endpoint: localhost:4566     │         │                              │
│ Table: sam-hello-world-items-│         │ Table: sam-hello-world-items-│
│        local                 │         │        dev/staging/prod      │
└───────────────────────────────┘         └───────────────────────────────┘
```

---

## 📂 폴더 구조

```
03-hello-world-sam/
├── template.yaml              # SAM 템플릿 (CloudFormation 변환됨)
├── handlers/
│   └── hello.js               # 8개 함수: 기본 4개 + DynamoDB CRUD 4개
│                              # - 기본: sayHello, greet, createMessage, divide
│                              # - CRUD: createItem, listItems, updateItem, deleteItem
├── package.json               # npm 의존성 + SAM 배포 명령
├── samconfig.toml             # SAM 배포 설정 (처음 deploy --guided 후 생성)
├── docker-compose.yml         # LocalStack 설정 (로컬 DynamoDB)
└── README.md                  # 이 파일
```

---

## 🔧 주요 SAM 개념 (template.yaml에서)

### 1️⃣ **Parameters** - 배포 시 입력값

```yaml
Parameters:
  Stage:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
```

**의미**: 배포할 때마다 `Stage` 값을 지정 가능

- CLI: `sam deploy --parameter-overrides Stage=prod`
- 템플릿: `!Ref Stage` 로 참조

### 2️⃣ **Globals** - 모든 함수 공통 설정

```yaml
Globals:
  Function:
    Timeout: 10
    MemorySize: 128
    Runtime: nodejs18.x
    Environment:
      Variables:
        STAGE: !Ref Stage
        SERVICE_NAME: HelloWorldService
```

**의미**: 각 함수마다 반복 작성하지 않음

- 모든 함수는 기본적으로 Timeout=10초, Memory=128MB
- 함수별로 override 가능: `Function.Timeout: 30` (같은 들여쓰기 레벨)

### 3️⃣ **!Ref** - 리소스 참조

```yaml
Role: !GetAtt LambdaExecutionRole.Arn
Environment:
  Variables:
    STAGE: !Ref Stage
```

**의미**:

- `!Ref Stage` = Parameter의 실제 값
- `!GetAtt LambdaExecutionRole.Arn` = IAM Role의 ARN 속성

### 4️⃣ **!Sub** - 문자열 보간

```yaml
FunctionName: !Sub "hello-world-say-hello-${Stage}"
Resource: !Sub "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/*"
```

**의미**: `${변수명}` 패턴으로 동적 문자열 구성

- `${Stage}` = Stage Parameter 값
- `${AWS::Region}` = CloudFormation 의사변수 (us-east-1 등)
- `${AWS::AccountId}` = AWS 계정 ID

### 5️⃣ **AWS::Serverless::Function** - SAM의 핵심

```yaml
SayHelloFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: !Sub "hello-world-say-hello-${Stage}"
    CodeUri: handlers/
    Handler: hello.sayHello
    Role: !GetAtt LambdaExecutionRole.Arn
    Events:
      HttpEvent:
        Type: Api
        Properties:
          RestApiId: !Ref HelloWorldApi
          Path: /say-hello
          Method: GET
```

**의미**:

- **CodeUri**: Lambda 함수 코드 위치
- **Handler**: 함수 파일.함수명
- **Events**: 함수를 트리거하는 이벤트
  - Type: Api = API Gateway 이벤트
  - Path/Method = HTTP 경로와 메서드

---

## 🚀 배포 및 실행

### Step 1: 사전 요구사항

```bash
# SAM CLI 설치
brew install aws-sam-cli

# AWS CLI 설정
aws configure

# npm 의존성 설치
npm install
```

### Step 2: 로컬 테스트

#### 2-1. Node.js 직접 테스트 (권장)

```bash
# LocalStack 실행 (Docker 필수)
docker-compose up -d

# DynamoDB 테이블 생성
aws dynamodb create-table \
  --table-name sam-hello-world-items-local \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:4566 \
  --region us-west-2

# npm 테스트 실행 (모든 Lambda 함수 직접 호출)
npm test
```

**테스트 결과**:

```
✅ 17개 테스트 통과
  - 기본 함수: SayHello, Greet, CreateMessage, Divide
  - DynamoDB CRUD: CreateItem, UpdateItem, ListItems, DeleteItem
  - 에러 처리: 유효성 검사, 필수 필드 확인
```

**장점**:

- ✅ Docker 네트워킹 문제 없음 (로컬에서 직접 실행)
- ✅ LocalStack DynamoDB와 완전히 호환
- ✅ 빠른 피드백 루프
- ✅ CI/CD에 적합

#### 2-2. SAM Local 실행 (선택사항)

```bash
# SAM 빌드 (처음 한 번만, 또는 코드 변경 시)
sam build

# SAM 로컬 API 시작 (localhost:3000)
npm run local
```

그러면 다음과 같이 로컬 엔드포인트가 시작됨:

```
Mounting SayHelloFunction at http://127.0.0.1:3000/say-hello [GET]
Mounting GreetFunction at http://127.0.0.1:3000/greet/{name} [GET]
Mounting CreateMessageFunction at http://127.0.0.1:3000/message [POST]
Mounting DivideFunction at http://127.0.0.1:3000/divide [POST]
Mounting CreateItemFunction at http://127.0.0.1:3000/item [POST]
Mounting ListItemsFunction at http://127.0.0.1:3000/items [GET]
Mounting UpdateItemFunction at http://127.0.0.1:3000/item/{id} [PUT]
Mounting DeleteItemFunction at http://127.0.0.1:3000/item/{id} [DELETE]
```

#### 로컬 테스트 명령어 (다른 터미널에서)

```bash
# 1️⃣ GET /say-hello (기본 요청)
curl http://localhost:3000/say-hello

# ✅ 응답:
# {"greeting":"Hello, World!","timestamp":"2025-12-27T22:22:18.429Z","stage":"dev","environment":"development"}

# 2️⃣ GET /greet/{name} (경로 파라미터)
curl http://localhost:3000/greet/Jason

# ✅ 응답:
# {"greeting":"Hello, Jason!","timestamp":"2025-12-27T22:22:30.000Z","name":"Jason","stage":"dev"}

# 3️⃣ POST /message (JSON 본문, title/content 필수)
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World","author":"Alice"}'

# ✅ 응답:
# {"id":"msg-1766870550000","title":"Hello","content":"World","author":"Alice","createdAt":"2025-12-27T22:22:30.000Z","stage":"dev","environment":"development"}

# 4️⃣ POST /divide (dividend/divisor 필수, divisor ≠ 0)
curl -X POST http://localhost:3000/divide \
  -H "Content-Type: application/json" \
  -d '{"dividend":10,"divisor":2}'

# ✅ 응답:
# {"dividend":10,"divisor":2,"result":5,"timestamp":"2025-12-27T22:24:49.879Z","stage":"dev"}

# DynamoDB CRUD 테스트 (SAM Local에서도 로컬 DynamoDB 사용)

# 5️⃣ POST /item - 새 항목 생성
curl -X POST http://localhost:3000/item \
  -H "Content-Type: application/json" \
  -d '{"title":"SAM Local Item","description":"Created via SAM Local"}'

# ✅ 응답:
# {"id":"item-1735438825000","title":"SAM Local Item","description":"Created via SAM Local","createdAt":"2025-12-28T...","stage":"dev"}

# 6️⃣ GET /items - 모든 항목 조회
curl http://localhost:3000/items

# ✅ 응답:
# {"items":[{"id":"item-1735438825000","title":"SAM Local Item",...}],"count":1,"stage":"dev"}

# 7️⃣ PUT /item/{id} - 항목 수정
curl -X PUT http://localhost:3000/item/item-1735438825000 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Item","description":"Modified"}'

# ✅ 응답: {"id":"item-1735438825000",...}

# 8️⃣ DELETE /item/{id} - 항목 삭제
curl -X DELETE http://localhost:3000/item/item-1735438825000

# ✅ 응답: {"message":"Item deleted","id":"item-1735438825000",...}
```

#### 로컬 테스트 결과 요약

| 함수          | 경로            | 메서드 | 상태    | 테스트됨   |
| ------------- | --------------- | ------ | ------- | ---------- |
| SayHello      | `/say-hello`    | GET    | ✅ 정상 | 2025-12-29 |
| Greet         | `/greet/{name}` | GET    | ✅ 정상 | 2025-12-29 |
| CreateMessage | `/message`      | POST   | ✅ 정상 | 2025-12-29 |
| Divide        | `/divide`       | POST   | ✅ 정상 | 2025-12-29 |
| CreateItem    | `/item`         | POST   | ✅ 정상 | 2025-12-29 |
| ListItems     | `/items`        | GET    | ✅ 정상 | 2025-12-29 |
| UpdateItem    | `/item/{id}`    | PUT    | ✅ 정상 | 2025-12-29 |
| DeleteItem    | `/item/{id}`    | DELETE | ✅ 정상 | 2025-12-29 |

**주의사항**:

- `npm run local` 실행 시 Docker를 통해 AWS Lambda 환경을 에뮬레이션합니다
- 첫 실행 시 Docker 이미지 다운로드로 시간이 걸릴 수 있습니다
- `aws-sdk` 의존성은 불필요하면 제거해도 됩니다 (이 프로젝트는 제거됨)

### Step 3: AWS에 배포

#### 3-1. 배포 전 체크리스트

```bash
# 1️⃣ npm 의존성 확인
npm list
# 필요시: npm install

# 2️⃣ SAM 템플릿 검증
sam validate
# Output: template.yaml is valid

# 3️⃣ SAM 빌드
sam build
# Output: .aws-sam/ 디렉토리 생성됨

# 4️⃣ 로컬 테스트 모두 통과 확인
npm test
# Output: ✨ 모든 테스트 통과!

# 5️⃣ AWS 계정 및 권한 확인
aws sts get-caller-identity
# Output: Account ID, User ARN 표시

# 6️⃣ 필요한 IAM 권한 확인
# - CloudFormation 스택 생성/수정/삭제
# - Lambda 함수 생성/수정
# - API Gateway 생성
# - IAM 역할 생성
# - DynamoDB 테이블 생성
```

**체크리스트 완료 후**: 배포 진행

#### 3-2. 배포 명령어 (한 줄)

```bash
# 간단한 배포 (S3 자동 생성, dev 환경)
sam deploy --stack-name hello-world-sam-dev --region us-east-1 --resolve-s3 --parameter-overrides Stage=dev Environment=development --confirm-changeset --capabilities CAPABILITY_IAM

# 또는 staging 배포
sam deploy --stack-name hello-world-sam-staging --region us-east-1 --resolve-s3 --parameter-overrides Stage=staging Environment=staging --confirm-changeset --capabilities CAPABILITY_IAM

# 또는 prod 배포
sam deploy --stack-name hello-world-sam-prod --region us-east-1 --resolve-s3 --parameter-overrides Stage=prod Environment=production --confirm-changeset --capabilities CAPABILITY_IAM
```

**옵션 설명**:

- `--stack-name`: CloudFormation 스택 이름
- `--region`: AWS 리전
- `--resolve-s3`: S3 자동 생성
- `--parameter-overrides`: 템플릿 파라미터 지정
- `--confirm-changeset`: 변경사항 자동 확인
- `--capabilities CAPABILITY_IAM`: IAM 역할 생성 권한

**배포 중 물어보는 항목**:

- Stack name: `hello-world-sam-dev` (기본값 또는 커스텀)
- Region: `us-east-1` (또는 선호하는 리전)
- Confirm changes before deploy: `Y` (변경사항 확인)
- Allow SAM CLI IAM role creation: `Y` (IAM 역할 생성)
- Save parameters to samconfig.toml: `Y` (설정 저장)

#### 3-3. 이후 배포 (samconfig.toml 사용)

```bash
# Dev 환경 배포 (samconfig.toml이 있으면 설정 자동 적용)
sam deploy

# 또는 명시적으로 지정
sam deploy --stack-name hello-world-sam-dev --region us-east-1 --resolve-s3 --confirm-changeset --capabilities CAPABILITY_IAM
```

#### 3-4. 배포 후 확인

```bash
# 1️⃣ CloudFormation 스택 상태 확인
aws cloudformation describe-stacks \
  --stack-name hello-world-sam-dev \
  --query 'Stacks[0].[StackStatus,StackName]'

# Output: ["CREATE_COMPLETE", "hello-world-sam-dev"]

# 2️⃣ API Gateway 엔드포인트 확인 (중요!)
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name hello-world-sam-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`HelloWorldApiEndpoint`].OutputValue' \
  --output text)

echo $API_ENDPOINT
# Output: https://abc123def.execute-api.us-east-1.amazonaws.com/dev

# 3️⃣ 배포된 Lambda 함수 확인
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `hello-world`)].FunctionName' \
  --output text

# Output: hello-world-say-hello-dev hello-world-greet-dev ...

# 4️⃣ DynamoDB 테이블 확인
aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `sam-hello-world`)]'

# Output: [sam-hello-world-items-dev]

# 5️⃣ IAM 역할 확인
aws iam get-role --role-name HelloWorldRole-dev \
  --query 'Role.RoleId'

# 6️⃣ CloudWatch 로그 그룹 확인
aws logs describe-log-groups \
  --query 'logGroups[?contains(logGroupName, `hello-world`)].logGroupName'

# Output: [/aws/lambda/hello-world-say-hello-dev, /aws/lambda/hello-world-greet-dev, ...]
```

#### 3-5. 배포된 함수 테스트

```bash
# API Gateway 엔드포인트로 테스트 (권장)
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name hello-world-sam-dev \
  --query 'Stacks[0].Outputs[0].OutputValue' \
  --output text)

curl $API_ENDPOINT/say-hello

# 또는 Lambda 함수 직접 호출
aws lambda invoke \
  --function-name hello-world-say-hello-dev \
  --payload '{}' \
  response.json

cat response.json
```

### Step 4: 정리 (삭제)

```bash
# CloudFormation 스택 삭제 (리소스 정리)
aws cloudformation delete-stack \
  --stack-name hello-world-sam-dev

# 삭제 완료 대기
aws cloudformation wait stack-delete-complete \
  --stack-name hello-world-sam-dev

# S3 artifacts 버킷 확인 및 수동 삭제
aws s3 ls | grep aws-sam-cli-artifacts
```

---

## ✅ 테스트 완료 현황 (2025-12-29)

### 로컬 테스트 ✅

**Node.js 직접 테스트** (권장 방식):

```
✅ 17개 테스트 통과
✅ 0개 테스트 실패

테스트 그룹:
1️⃣ 기본 함수 (7개)
   - SayHello ✅
   - Greet ✅
   - CreateMessage ✅
   - Divide ✅

2️⃣ DynamoDB CRUD (8개)
   - CreateItem ✅
   - ListItems ✅
   - UpdateItem ✅
   - DeleteItem ✅
   - 상태 검증 (생성 후, 수정 후, 삭제 후) ✅

3️⃣ 에러 처리 (3개)
   - 필수 필드 누락 ✅
   - 존재하지 않는 ID ✅
   - 파라미터 누락 ✅
```

**실행 환경**:

- LocalStack: Running (port 4566)
- DynamoDB: sam-hello-world-items-local (ACTIVE)
- Node.js: v18.x
- AWS SDK: v2 (v3 마이그레이션 권장)

### 배포 준비 상태

- template.yaml 검증: ✅ 완료
- package.json 의존성: ✅ 정리 완료
- handlers/hello.js: ✅ 준비 완료
- samconfig.toml: 배포 시 자동 생성됨

### AWS Lambda 라이브 테스트 ✅

**배포된 스택에서 8/8 함수 테스트 통과**:

```
✅ 성공: 8/8
❌ 실패: 0/8

API Gateway 엔드포인트: https://s02mbsgudc.execute-api.us-west-2.amazonaws.com/dev

테스트된 함수:
1️⃣ SayHello ... ✅ (200)
2️⃣ Greet ... ✅ (200)
3️⃣ CreateMessage ... ✅ (201)
4️⃣ Divide ... ✅ (200)
5️⃣ CreateItem (DynamoDB) ... ✅ (201)
6️⃣ ListItems (DynamoDB) ... ✅ (200)
7️⃣ UpdateItem (DynamoDB) ... ✅ (200)
8️⃣ DeleteItem (DynamoDB) ... ✅ (200)
```

배포 후 출력:

```
CloudFormation outputs from deployed stack
Key Value
HelloWorldApiEndpoint https://s02mbsgudc.execute-api.us-west-2.amazonaws.com/dev
SayHelloFunctionArn arn:aws:lambda:us-west-2:123456:function:hello-world-say-hello-dev
```

배포된 API 테스트:

```bash
API_ENDPOINT="https://abc123.execute-api.us-east-1.amazonaws.com/dev"

# GET /say-hello
curl $API_ENDPOINT/say-hello

# GET /greet/{name}
curl $API_ENDPOINT/greet/Bob

# POST /message
curl -X POST $API_ENDPOINT/message \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Message"}'

# POST /divide
curl -X POST $API_ENDPOINT/divide \
  -H "Content-Type: application/json" \
  -d '{"dividend":20,"divisor":4}'

# DynamoDB CRUD 테스트

# 1️⃣ POST /item - 새 항목 생성
curl -X POST $API_ENDPOINT/item \
  -H "Content-Type: application/json" \
  -d '{"title":"New Item","description":"Test item"}'

# 2️⃣ GET /items - 모든 항목 조회
curl $API_ENDPOINT/items

# 3️⃣ PUT /item/{id} - 항목 수정
curl -X PUT $API_ENDPOINT/item/item-123 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Item","description":"Modified"}'

# 4️⃣ DELETE /item/{id} - 항목 삭제
curl -X DELETE $API_ENDPOINT/item/item-123
```

---

## 🚨 리소스 이름 충돌 해결

### 문제 상황

같은 AWS 계정/리전에서 여러 프로젝트를 배포할 때 리소스 이름 충돌 가능성이 있습니다.

예시:

- **01-hello-world** (Serverless Framework): `hello-world-items-${stage}`
- **03-hello-world-sam** (SAM): `hello-world-items-${stage}`

이 경우 DynamoDB 테이블이 중복되어 데이터 혼입 위험이 있습니다.

### 해결책

**03-hello-world-sam**의 모든 리소스에 **`sam-` 프리픽스** 추가:

#### 1️⃣ DynamoDB 테이블명 변경

**template.yaml**:

```yaml
ItemsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub "sam-hello-world-items-${Stage}" # ← sam- 프리픽스 추가
```

#### 2️⃣ 핸들러 기본값 변경

**handlers/hello.js**:

```javascript
const tableName = process.env.ITEMS_TABLE || "sam-hello-world-items"; // ← sam- 프리픽스
```

#### 3️⃣ 로컬 테스트 환경변수 변경

**package.json**:

```json
{
  "test": "AWS_REGION=us-west-2 ITEMS_TABLE=sam-hello-world-items-local DYNAMODB_ENDPOINT=http://localhost:4566 node test-all.js"
}
```

#### 4️⃣ LocalStack 테이블 생성

```bash
aws dynamodb create-table \
  --table-name sam-hello-world-items-local \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:4566 \
  --region us-west-2
```

### 배포 후 확인

```bash
# AWS 환경의 테이블 확인
aws dynamodb list-tables --region us-east-1
# 출력: sam-hello-world-items-dev, sam-hello-world-items-prod, ...

# LocalStack의 테이블 확인
aws dynamodb list-tables --endpoint-url http://localhost:4566 --region us-west-2
# 출력: sam-hello-world-items-local
```

---

### 1️⃣ SayHelloFunction - 가장 단순한 경우

```javascript
// handlers/hello.js - sayHello
exports.sayHello = async (event, context) => {
  // 입력 없음, 고정값 반환
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      greeting: "Hello, World!",
      timestamp: new Date().toISOString(),
      stage: process.env.STAGE
    })
  };
};
```

**SAM 템플릿에서의 정의**:

```yaml
SayHelloFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: !Sub "hello-world-say-hello-${Stage}"
    CodeUri: handlers/
    Handler: hello.sayHello
    Events:
      HttpEvent:
        Type: Api
        Properties:
          Path: /say-hello
          Method: GET
```

**테스트**:

```bash
curl http://localhost:3000/say-hello

# Response:
{
  "greeting": "Hello, World!",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stage": "dev"
}
```

---

### 2️⃣ GreetFunction - Path 파라미터

```javascript
// handlers/hello.js - greet
exports.greet = async (event, context) => {
  const { name } = event.pathParameters || {};

  if (!name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "name required" })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ greeting: `Hello, ${name}!` })
  };
};
```

**SAM 템플릿에서의 정의**:

```yaml
GreetFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: hello.greet
    Events:
      HttpEvent:
        Type: Api
        Properties:
          Path: /greet/{name} # ← 중괄호로 파라미터 정의
          Method: GET
```

**API Gateway가 자동 생성**:

- `{name}` → `event.pathParameters.name` 으로 전달

**테스트**:

```bash
curl http://localhost:3000/greet/Alice
# Response: { "greeting": "Hello, Alice!" }

curl http://localhost:3000/greet/
# Response: { "error": "name required" }
```

---

### 3️⃣ CreateMessageFunction - POST body 파싱

```javascript
// handlers/hello.js - createMessage
exports.createMessage = async (event, context) => {
  let body = {};

  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" })
      };
    }
  }

  const { title, content } = body;

  if (!title || !content) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "title, content required" })
    };
  }

  return {
    statusCode: 201,
    body: JSON.stringify({ id: `msg-${Date.now()}`, title, content })
  };
};
```

**SAM 템플릿에서의 정의**:

```yaml
CreateMessageFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: hello.createMessage
    Events:
      HttpEvent:
        Type: Api
        Properties:
          Path: /message
          Method: POST
```

**테스트**:

```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World"}'

# Response:
{
  "id": "msg-1705318200000",
  "title": "Hello",
  "content": "World"
}
```

---

### 4️⃣ DivideFunction - 에러 처리

```javascript
// handlers/hello.js - divide
exports.divide = async (event, context) => {
  const body = JSON.parse(event.body || "{}");
  const { dividend, divisor } = body;

  // Validation
  if (divisor === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "divisor cannot be 0" })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ result: dividend / divisor })
  };
};
```

**테스트 - 정상 케이스**:

```bash
curl -X POST http://localhost:3000/divide \
  -H "Content-Type: application/json" \
  -d '{"dividend":10,"divisor":2}'

# Response: { "result": 5 }
```

**테스트 - 에러 케이스 (0으로 나누기)**:

```bash
curl -X POST http://localhost:3000/divide \
  -H "Content-Type: application/json" \
  -d '{"dividend":10,"divisor":0}'

# Response: { "error": "divisor cannot be 0" }
```

---

### 5️⃣ ListItemsFunction - DynamoDB Scan

```javascript
// handlers/hello.js - listItems
exports.listItems = async (event, context) => {
  try {
    const result = await dynamodb
      .scan({
        TableName: tableName
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        items: result.Items,
        count: result.Items.length,
        stage: process.env.STAGE
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

**특징**:

- DynamoDB `Scan` 사용 (모든 항목 조회)
- 환경변수에서 테이블명 읽음: `process.env.ITEMS_TABLE`
- 에러 처리: try-catch로 실패 케이스 처리

**SAM 템플릿에서의 정의**:

```yaml
ListItemsFunction:
  Type: AWS::Serverless::Function
  Properties:
    FunctionName: !Sub "hello-world-list-items-${Stage}"
    Handler: hello.listItems
    Environment:
      Variables:
        ITEMS_TABLE: !Ref ItemsTable # ← DynamoDB 테이블 참조
    Events:
      HttpEvent:
        Type: Api
        Properties:
          Path: /items
          Method: GET
```

**테스트**:

```bash
# 아이템 조회
curl http://localhost:3000/items

# Response:
{
  "items": [
    {
      "id": "item-1705318200000",
      "title": "Test Item",
      "description": "테스트",
      "author": "Alice",
      "createdAt": "2025-12-28T01:55:00.000Z"
    }
  ],
  "count": 1,
  "stage": "dev"
}
```

---

### 6️⃣ CreateItemFunction - DynamoDB Put

```javascript
// handlers/hello.js - createItem
exports.createItem = async (event, context) => {
  const body = JSON.parse(event.body || "{}");
  const { title, description, author } = body;

  // Validation
  if (!title) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "title is required" })
    };
  }

  const id = `item-${Date.now()}`;
  const item = {
    id,
    title,
    description: description || "",
    author: author || "Anonymous",
    createdAt: new Date().toISOString(),
    stage: process.env.STAGE
  };

  await dynamodb
    .put({
      TableName: tableName,
      Item: item
    })
    .promise();

  return {
    statusCode: 201,
    body: JSON.stringify(item)
  };
};
```

**특징**:

- DynamoDB `Put` 사용 (새 항목 생성)
- ID 자동 생성: `item-${Date.now()}`
- 필수 필드 검증: `title`
- 선택 필드 기본값 처리

**테스트**:

```bash
curl -X POST http://localhost:3000/item \
  -H "Content-Type: application/json" \
  -d '{"title":"New Item","description":"Description","author":"Bob"}'

# Response:
{
  "id": "item-1705318200000",
  "title": "New Item",
  "description": "Description",
  "author": "Bob",
  "createdAt": "2025-12-28T01:55:00.000Z"
}
```

---

### 7️⃣ UpdateItemFunction - DynamoDB Update

```javascript
// handlers/hello.js - updateItem
exports.updateItem = async (event, context) => {
  const { id } = event.pathParameters || {};
  const body = JSON.parse(event.body || "{}");
  const { title, description, author } = body;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "id is required" })
    };
  }

  // Build dynamic update expression
  const updateParts = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  if (title !== undefined) {
    updateParts.push("#t = :title");
    expressionAttributeValues[":title"] = title;
    expressionAttributeNames["#t"] = "title";
  }

  if (description !== undefined) {
    updateParts.push("#d = :description");
    expressionAttributeValues[":description"] = description;
    expressionAttributeNames["#d"] = "description";
  }

  const result = await dynamodb
    .update({
      TableName: tableName,
      Key: { id },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(result.Attributes)
  };
};
```

**특징**:

- 동적 `UpdateExpression` 생성 (DynamoDB best practice)
- `ExpressionAttributeNames` 사용 (예약어 회피)
- `ExpressionAttributeValues` 사용 (SQL injection 방지)
- `ReturnValues: ALL_NEW` (업데이트된 전체 항목 반환)

**테스트**:

```bash
curl -X PUT http://localhost:3000/item/item-1705318200000 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","description":"Updated Description"}'

# Response:
{
  "id": "item-1705318200000",
  "title": "Updated Title",
  "description": "Updated Description",
  "author": "Bob",
  "updatedAt": "2025-12-28T02:00:00.000Z"
}
```

---

### 8️⃣ DeleteItemFunction - DynamoDB Delete

```javascript
// handlers/hello.js - deleteItem
exports.deleteItem = async (event, context) => {
  const { id } = event.pathParameters || {};

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "id is required" })
    };
  }

  await dynamodb
    .delete({
      TableName: tableName,
      Key: { id }
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Item deleted successfully",
      itemId: id,
      stage: process.env.STAGE
    })
  };
};
```

**특징**:

- DynamoDB `Delete` 사용 (항목 삭제)
- 경로 파라미터에서 ID 추출
- 성공: HTTP 200 (204 아님)

**테스트**:

```bash
curl -X DELETE http://localhost:3000/item/item-1705318200000

# Response:
{
  "message": "Item deleted successfully",
  "itemId": "item-1705318200000",
  "stage": "dev"
}

# 삭제 확인
curl http://localhost:3000/items
# Response: { "items": [], "count": 0, "stage": "dev" }
```

---

## 🐳 LocalStack 통합 테스트 가이드

### LocalStack이란?

LocalStack은 AWS 서비스를 로컬에서 에뮬레이션하는 Docker 기반 도구입니다.

- ✅ DynamoDB, S3, Lambda, API Gateway 등 에뮬레이션
- ✅ 개발 시 AWS 계정 비용 0원
- ✅ CI/CD 파이프라인에 통합 가능

---

### Docker 설정 상세 가이드

#### 1️⃣ docker-compose.yml 분석

```yaml
version: "3.8" # Docker Compose 버전 (3.0 이상 권장)

services:
  localstack:
    image: localstack/localstack:latest # 최신 LocalStack 이미지 사용
    container_name: localstack-hello-world # 컨테이너 이름 (고정)

    ports:
      - "4566:4566" # 호스트:컨테이너 포트 매핑
        # 호스트 http://localhost:4566 → 컨테이너 내부 4566
        # 모든 AWS 서비스가 이 포트로 통합

    environment:
      # ===== 필수 설정 =====
      SERVICES:
        dynamodb # 활성화할 서비스 (쉼표로 구분)
        # 현재: DynamoDB만 필요
        # 확장 예: dynamodb,s3,sqs,lambda

      DEBUG:
        0 # 디버그 로그 출력
        # 0 = 정상 수준 로그
        # 1 = 상세 디버그 로그 (개발 중 추천)

      AWS_DEFAULT_REGION:
        us-west-2 # 기본 AWS 리전
        # npm test와 동일하게 맞춰야 함

    # ===== 헬스 체크 =====
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
      interval: 5s # 5초마다 상태 체크
      timeout: 3s # 응답 최대 대기 시간
      retries: 10 # 10회 실패 후 unhealthy 표시
      start_period: 15s # 컨테이너 시작 후 15초 후에 체크 시작
```

**주요 설정값 설명**:

| 항목               | 값                           | 설명                                     |
| ------------------ | ---------------------------- | ---------------------------------------- |
| image              | localstack/localstack:latest | 최신 버전 사용 (버전 고정도 가능: 3.7.0) |
| ports              | 4566:4566                    | 모든 AWS API가 이 포트로 통합됨          |
| SERVICES           | dynamodb                     | DynamoDB 에뮬레이션 활성화               |
| DEBUG              | 0 또는 1                     | 로그 상세도 (운영: 0, 개발: 1)           |
| AWS_DEFAULT_REGION | us-west-2                    | 테스트 코드와 일치해야 함                |

#### 2️⃣ Docker 사전 요구사항

```bash
# 1️⃣ Docker 설치 확인
docker --version
# Output: Docker version 20.10.x or higher

# 2️⃣ Docker Desktop 실행 확인 (macOS/Windows)
docker ps
# 에러 없이 실행되면 ✅

# 3️⃣ Docker 리소스 확인
docker system df
# Output:
# TYPE       TOTAL      ACTIVE    SIZE
# Images     10        2         5.2GB
# Containers 3         1         512MB
# Volumes    5         2         1.2GB
# 총 디스크: 최소 5GB 여유 필요

# 4️⃣ 리소스 할당량 확인 (Mac에서)
docker info | grep -E "Memory|CPUs"
# 최소: 4GB RAM, 2 CPUs 권장
```

#### 3️⃣ Step-by-Step 실행

##### Step 1: 컨테이너 시작

```bash
# 백그라운드에서 LocalStack 실행
docker-compose up -d
# Output: Creating localstack-hello-world ... done

# 시작 로그 확인 (또는 생략 가능)
docker-compose logs localstack

# 컨테이너 상태 확인
docker-compose ps

# Output:
# NAME                      COMMAND                  SERVICE     STATUS
# localstack-hello-world    "docker-entrypoint.sh"   localstack  Up 10s (healthy) ✅
```

##### Step 2: 포트 확인

```bash
# 4566 포트가 리슨 중인지 확인
lsof -i :4566
# Output: docker ... LISTEN

# 또는 (포트가 바쁜 경우)
netstat -an | grep 4566
```

##### Step 3: 헬스 체크

```bash
# LocalStack 헬스 상태 확인
curl http://localhost:4566/_localstack/health

# 응답:
{
  "services": {
    "dynamodb": "running"  ✅
  },
  "version": "3.7.0",
  ...
}

# 실패하면:
curl: (7) Failed to connect to localhost port 4566: Connection refused
→ docker-compose logs localstack 확인
```

##### Step 4: DynamoDB 테이블 생성

```bash
# sam-hello-world-items-local 테이블 생성
aws dynamodb create-table \
  --table-name sam-hello-world-items-local \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:4566 \
  --region us-west-2

# 응답:
{
  "TableDescription": {
    "TableArn": "arn:aws:dynamodb:us-west-2:000000000000:table/sam-hello-world-items-local",
    "TableStatus": "ACTIVE"  ✅
  }
}

# 생성 확인
aws dynamodb list-tables \
  --endpoint-url http://localhost:4566 \
  --region us-west-2

# 응답: Tables: [sam-hello-world-items-local] ✅

# 상세 정보 확인
aws dynamodb describe-table \
  --table-name sam-hello-world-items-local \
  --endpoint-url http://localhost:4566 \
  --region us-west-2
```

##### Step 5: npm 테스트 실행

```bash
npm test

# 출력:
# 🧪 시작: 완전한 통합 테스트 (모든 Lambda 함수)
#
# 📌 그룹 1: 기본 함수 테스트
# ✅ SayHello
# ✅ Greet - 정상 케이스
# ✅ CreateMessage - 정상 케이스
# ✅ Divide - 정상 케이스
#
# 📌 그룹 2: DynamoDB CRUD 테스트
# ✅ CreateItem - 정상 케이스
# ✅ ListItems - 아이템 조회
# ✅ UpdateItem - 정상 케이스
# ✅ ListItems - 업데이트 후 확인
# ✅ DeleteItem - 정상 케이스
# ✅ ListItems - 최종 상태 확인
#
# 📌 그룹 3: 에러 처리 테스트
# ✅ CreateItem - title 필수 필드 없음
# ✅ UpdateItem - 존재하지 않는 id
# ✅ DeleteItem - id 파라미터 없음
#
# ==================================================
# 📊 테스트 결과: 17개 통과, 0개 실패
# ==================================================
# ✨ 모든 테스트 통과!
```

##### Step 6: 실시간 로그 모니터링 (선택)

```bash
# 실시간 로그 출력
docker-compose logs -f localstack

# 마지막 50줄만 보기
docker-compose logs --tail 50 localstack

# 특정 패턴만 필터링
docker-compose logs localstack | grep -i error
```

##### Step 7: 정리 (테스트 완료 후)

```bash
# 옵션 1: 컨테이너만 중지 (데이터 보존)
docker-compose stop
# → 재시작: docker-compose start

# 옵션 2: 컨테이너 제거 (데이터 유지)
docker-compose down

# 옵션 3: 컨테이너 + 데이터 완전 삭제
docker-compose down -v

# 모든 Docker 리소스 정리
docker system prune -a
# 주의: 다른 프로젝트의 이미지도 삭제됨
```

---

### Docker 고급 설정

#### 데이터 영속성 설정

```yaml
version: "3.8"
services:
  localstack:
    image: localstack/localstack:latest
    container_name: localstack-hello-world
    ports:
      - "4566:4566"

    # ===== 데이터 보존 설정 =====
    volumes:
      - ./data:/tmp/localstack # 호스트 ./data → 컨테이너 /tmp/localstack
      # 컨테이너 재시작/재생성 후에도 데이터 유지됨

    environment:
      SERVICES: dynamodb
      DEBUG: 0
      AWS_DEFAULT_REGION: us-west-2
      DATA_DIR: /tmp/localstack # 데이터 저장 경로

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4566/_localstack/health"]
      interval: 5s
      timeout: 3s
      retries: 10
```

**사용 방법**:

```bash
# 첫 실행 (데이터 생성)
docker-compose up -d
npm test
# → data/ 디렉토리에 DynamoDB 데이터 저장됨

# 종료
docker-compose down

# 재시작 (데이터 유지)
docker-compose up -d
npm test
# → 이전의 모든 테이블/아이템이 그대로 있음!

# 데이터 완전 삭제하고 싶을 때
rm -rf data/
docker-compose down -v
docker-compose up -d
```

#### 여러 AWS 서비스 추가 (향후 확장)

```yaml
environment:
  SERVICES: dynamodb,s3,sqs,sns,kinesis,lambda
```

**지원되는 서비스**:

- dynamodb: NoSQL 데이터베이스
- s3: 객체 스토리지
- sqs: 메시지 큐
- sns: 알림 서비스
- kinesis: 데이터 스트림
- lambda: 서버리스 함수
- apigateway: REST API
- cloudformation: 인프라 자동화

#### 디버그 모드 상세 로깅

```yaml
environment:
  SERVICES: dynamodb
  DEBUG: 1 # 또는 DEBUG=true
  LOG_LEVEL: DEBUG # 추가 설정
```

**로그 확인**:

```bash
# 모든 로그 출력
docker-compose logs -f localstack

# 에러만 필터링
docker-compose logs localstack | grep ERROR

# 특정 시간 이후 로그
docker-compose logs --since 10m localstack
```

#### 포트 커스터마이징

```yaml
ports:
  - "4567:4566" # 호스트 포트 4567 사용 (4566이 이미 점유된 경우)
```

**테스트 코드 수정 필요**:

```javascript
// package.json
"test": "DYNAMODB_ENDPOINT=http://localhost:4567 node test-all.js"
```

---

### Docker 트러블슈팅

#### ❌ 문제 1: "Connection refused"

```bash
# 원인: 포트 4566이 이미 사용 중
lsof -i :4566
# Output: python ... LISTEN (다른 LocalStack 인스턴스)

# 해결 방법 1: 기존 프로세스 종료
kill -9 <PID>

# 해결 방법 2: 다른 포트 사용
# docker-compose.yml:
ports:
  - "4567:4566"

# 테스트 코드 수정:
# package.json:
"test": "DYNAMODB_ENDPOINT=http://localhost:4567 node test-all.js"
```

#### ❌ 문제 2: "No space left on device"

```bash
# 원인: Docker 디스크 용량 부족
docker system df
# Output:
# TYPE       TOTAL   ACTIVE  SIZE
# Images     15      5       8.5GB    ← 많음
# Containers 20      5       2.3GB
# Volumes    30      10      1.2GB
# 합계: 12GB (여유 없음)

# 해결: 불필요한 리소스 정리
docker system prune -a

# 더 강력하게 정리
docker container prune -a  # 모든 정지된 컨테이너 삭제
docker image prune -a      # 사용하지 않는 이미지 삭제
docker volume prune        # 사용하지 않는 볼륨 삭제
docker builder prune       # 빌드 캐시 삭제

# 결과 확인
docker system df
```

#### ❌ 문제 3: "Health check failed"

```bash
# 원인: LocalStack이 정상 시작되지 않음
docker-compose logs localstack | tail -50
# Output:
# ERROR: Unable to start LocalStack
# ERROR: Required service dynamodb failed to start

# 해결:
docker-compose down -v  # 컨테이너 + 데이터 삭제
docker-compose up -d    # 깨끗하게 다시 시작
docker-compose logs -f  # 시작 과정 모니터링

# 여전히 실패하면: 이미지 재다운로드
docker pull localstack/localstack:latest
docker-compose up -d
```

#### ❌ 문제 4: "Table not found"

```bash
# 원인 1: 컨테이너가 재시작되어 데이터 손실
docker-compose ps  # STATUS 확인

# 원인 2: 다른 리전/엔드포인트 사용
aws dynamodb list-tables \
  --endpoint-url http://localhost:4566 \
  --region us-west-2

# 해결: 테이블 다시 생성
aws dynamodb create-table \
  --table-name sam-hello-world-items-local \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:4566 \
  --region us-west-2
```

---

### LocalStack vs SAM Local 비교

| 항목                  | LocalStack + npm test |       SAM Local       |
| --------------------- | :-------------------: | :-------------------: |
| **설정 복잡도**       |        ⭐ 간단        |      ⭐⭐⭐ 복잡      |
| **네트워킹 문제**     |        ✅ 없음        |    ❌ Docker 격리     |
| **DynamoDB 지원**     |        ✅ 완벽        |       ⚠️ 제한적       |
| **실행 속도**         |      ⭐⭐⭐ 빠름      |        ⭐ 느림        |
| **Lambda 에뮬레이션** |        ⭐ 기본        |     ⭐⭐⭐ 정확함     |
| **권장 용도**         |   단위테스트, CI/CD   | AWS SDK 호환성 테스트 |

**현 프로젝트 권장**: **LocalStack + npm test** ✅

---

## 🔐 IAM 역할 정의

### template.yaml의 LambdaExecutionRole

```yaml
LambdaExecutionRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Version: "2012-10-17"
      Statement:
        - Effect: Allow
          Principal:
            Service: lambda.amazonaws.com
          Action: sts:AssumeRole
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    Policies:
      - PolicyName: CloudWatchLogs
        PolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Action:
                - logs:CreateLogGroup
                - logs:CreateLogStream
                - logs:PutLogEvents
              Resource: !Sub "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/*"
```

**분석**:

1. **AssumeRolePolicyDocument**: Lambda 서비스가 이 역할을 인수할 수 있도록 허용
2. **ManagedPolicyArns**: AWS 관리형 정책 (CloudWatch Logs 기본 권한)
3. **Policies**: 커스텀 정책 (추가 CloudWatch Logs 권한)

---

## 📊 모니터링 및 디버깅

### CloudWatch Logs 확인

```bash
# SAM 로그 출력 보기
sam logs --name SayHelloFunction --stack-name hello-world-sam-dev --tail

# 또는 AWS CLI
aws logs tail /aws/lambda/hello-world-say-hello-dev --follow
```

### CloudWatch Alarms (자동 생성됨)

```yaml
ApiErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: HelloWorldApi-Errors-dev
    MetricName: 4XXError
    Threshold: 10
```

**의미**: 5분 동안 4xx 에러가 10개 이상이면 알람 발생

AWS Console에서 확인:

```
CloudWatch > Alarms > HelloWorldApi-Errors-dev
```

---

## 🔄 Serverless Framework 예제와 비교

### serverless.yml (Framework)

```yaml
service: hello-world
provider:
  name: aws
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - logs:*
          Resource: "*"

functions:
  sayHello:
    handler: handlers/hello.sayHello
    events:
      - http:
          path: say-hello
          method: get
```

### template.yaml (SAM)

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Parameters:
  Stage:
    Type: String
    Default: dev

Globals:
  Function:
    Runtime: nodejs18.x
    Environment:
      Variables:
        STAGE: !Ref Stage

Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument: { ... }

  SayHelloFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: hello.sayHello
      Role: !GetAtt LambdaExecutionRole.Arn
      Events:
        HttpEvent:
          Type: Api
          Properties:
            RestApiId: !Ref HelloWorldApi
            Path: /say-hello
            Method: GET
```

**주요 차이**:

| 항목        | Serverless             | SAM                                                 |
| ----------- | ---------------------- | --------------------------------------------------- |
| 런타임 정의 | `provider.runtime`     | `Globals.Function.Runtime`                          |
| IAM 정의    | `provider.iam.role`    | `AWS::IAM::Role` 명시적 정의                        |
| 환경변수    | `provider.environment` | `Globals.Function.Environment`                      |
| 함수 정의   | `functions.xxx`        | `Resources.XxxFunction (AWS::Serverless::Function)` |
| API Gateway | 자동 생성              | 명시적 `AWS::Serverless::Api`                       |
| 파라미터    | `${opt:stage, 'dev'}`  | `Parameters` + `!Ref`                               |

---

## 🛠️ 자주 하는 질문 (FAQ)

### Q1: `sam build`는 뭐하는 건가요?

A: Lambda 함수 코드와 의존성을 준비하는 단계. 배포 전 필수.

```bash
sam build
# .aws-sam/ 디렉토리 생성 (템플릿 + 코드 준비)
```

### Q2: `samconfig.toml`은 뭐죠?

A: 배포 설정을 저장하는 파일. 첫 배포 후 자동 생성.

```toml
[default]
[default.deploy]
region = "us-east-1"
stack_name = "hello-world-sam-dev"
s3_bucket = "aws-sam-cli-artifacts-123456789-us-east-1"
```

### Q3: Stage별로 다르게 배포하려면?

A: `samconfig.toml`에 환경별 설정 섹션 추가

```toml
[dev]
[dev.deploy]
region = "us-east-1"
stack_name = "hello-world-sam-dev"

[prod]
[prod.deploy]
region = "us-east-1"
stack_name = "hello-world-sam-prod"
```

배포:

```bash
sam deploy -t dev
sam deploy -t prod
```

### Q4: 배포 후 API 엔드포인트 확인하려면?

A: CloudFormation 스택 Outputs 확인

```bash
aws cloudformation describe-stacks \
  --stack-name hello-world-sam-dev \
  --query 'Stacks[0].Outputs'
```

또는 AWS Console:

```
CloudFormation > Stacks > hello-world-sam-dev > Outputs
```

### Q5: 로컬에서 배포된 함수 테스트하려면?

A: AWS CLI로 직접 호출

```bash
aws lambda invoke \
  --function-name hello-world-say-hello-dev \
  --payload '{}' \
  response.json

cat response.json
```

---

## 📚 참고자료

- [AWS SAM 공식 문서](https://docs.aws.amazon.com/serverless-application-model/)
- [SAM Policy Templates](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-templates.html)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)
- 같은 프로젝트의 `SERVERLESS-TO-SAM-MAPPING.md` (Framework → SAM 변환)

---

## 🎯 다음 단계

1. ✅ 로컬에서 `npm run local` 실행 후 각 함수 테스트
2. ✅ `template.yaml`의 구조를 섹션별로 분석
3. ✅ AWS에 배포 후 CloudWatch Logs 확인
4. ✅ `samconfig.toml` 생성 후 Stage별 배포 설정 추가
5. 👉 **다음**: 다음 예제 `04-api-gateway-s3-sam` (S3 연동)
