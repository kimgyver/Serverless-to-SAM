# 리소스 네이밍 전략: 01 vs 03 충돌 방지

## 📋 문제점

01-hello-world와 03-hello-world-sam을 **같은 AWS 계정**에 배포하면 리소스명 충돌이 발생합니다.

### 01-hello-world (Serverless Framework)

```
IAM Role: HelloWorldRole-dev
DynamoDB: hello-world-items-dev
Lambda: hello-world-say-hello-dev, hello-world-greet-dev, ...
API Gateway: hello-world-api-dev
```

### 03-hello-world-sam (원본 - 충돌 위험)

```
IAM Role: HelloWorldRole-dev  ❌ 충돌!
DynamoDB: hello-world-items-dev  ❌ 충돌!
Lambda: hello-world-say-hello-dev  ❌ 충돌!
API Gateway: hello-world-api-dev  ❌ 충돌!
```

---

## ✅ 해결: 03에 `sam-` 접두사 추가

### 03-hello-world-sam (수정됨 - 충돌 없음)

```
IAM Role: HelloWorldRole-sam-dev  ✅
DynamoDB: hello-world-items-sam-dev  ✅
Lambda: hello-world-sam-say-hello-dev  ✅
API Gateway: hello-world-sam-api-dev  ✅
```

---

## 🔄 리소스 네이밍 매핑

| 리소스 타입               | 01 (원본)                             | 03 (SAM)                                  | 비고         |
| ------------------------- | ------------------------------------- | ----------------------------------------- | ------------ |
| **IAM Role**              | `HelloWorldRole-${Stage}`             | `HelloWorldRole-sam-${Stage}`             | ✅ 충돌 방지 |
| **DynamoDB 테이블**       | `hello-world-items-${Stage}`          | `hello-world-items-sam-${Stage}`          | ✅ 충돌 방지 |
| **Lambda: SayHello**      | `hello-world-say-hello-${Stage}`      | `hello-world-sam-say-hello-${Stage}`      | ✅ 충돌 방지 |
| **Lambda: Greet**         | `hello-world-greet-${Stage}`          | `hello-world-sam-greet-${Stage}`          | ✅ 충돌 방지 |
| **Lambda: CreateMessage** | `hello-world-create-message-${Stage}` | `hello-world-sam-create-message-${Stage}` | ✅ 충돌 방지 |
| **Lambda: Divide**        | `hello-world-divide-${Stage}`         | `hello-world-sam-divide-${Stage}`         | ✅ 충돌 방지 |
| **Lambda: ListItems**     | `hello-world-list-items-${Stage}`     | `hello-world-sam-list-items-${Stage}`     | ✅ 충돌 방지 |
| **Lambda: CreateItem**    | `hello-world-create-item-${Stage}`    | `hello-world-sam-create-item-${Stage}`    | ✅ 충돌 방지 |
| **Lambda: UpdateItem**    | `hello-world-update-item-${Stage}`    | `hello-world-sam-update-item-${Stage}`    | ✅ 충돌 방지 |
| **Lambda: DeleteItem**    | `hello-world-delete-item-${Stage}`    | `hello-world-sam-delete-item-${Stage}`    | ✅ 충돌 방지 |
| **API Gateway**           | `hello-world-api-${Stage}`            | `hello-world-sam-api-${Stage}`            | ✅ 충돌 방지 |

---

## 🎯 배포 시나리오

### 시나리오 1: 개별 배포 (충돌 없음) ✅

```bash
# 먼저 01을 배포
cd 01-hello-world
serverless deploy --stage dev

# 그 다음 03을 배포
cd ../03-hello-world-sam
sam deploy --guided
```

**결과:**

- 01: `HelloWorldRole-dev`, `hello-world-items-dev` 등
- 03: `HelloWorldRole-sam-dev`, `hello-world-items-sam-dev` 등
- ✅ 충돌 없음!

### 시나리오 2: 동시 배포 (충돌 없음) ✅

```bash
# 터미널 1
cd 01-hello-world && serverless deploy --stage dev

# 터미널 2 (병렬 실행)
cd 03-hello-world-sam && sam deploy --guided --stack-name hello-world-sam-dev
```

**결과:**

- 두 프로젝트가 동시에 배포되어도 리소스명이 다르므로 충돌 없음

---

## 📝 코드 레벨 차이

### 01-hello-world (serverless.yml)

```yaml
service: hello-world-lambda

provider:
  iam:
    role:
      name: HelloWorldRole-${self:provider.stage} # 고정명

resources:
  Resources:
    ItemsTable:
      Properties:
        TableName: hello-world-items-${self:provider.stage} # 고정명
```

### 03-hello-world-sam (template.yaml)

```yaml
Parameters:
  Stage:
    Type: String
    Default: dev

Resources:
  LambdaExecutionRole:
    Properties:
      RoleName: !Sub "HelloWorldRole-sam-${Stage}" # sam 접두사 추가

  ItemsTable:
    Properties:
      TableName: !Sub "hello-world-items-sam-${Stage}" # sam 접두사 추가
```

---

## ⚠️ 주의사항

### 1. 핸들러 코드는 동일

```javascript
// handlers/hello.js (01과 03에서 동일)
const tableName = process.env.ITEMS_TABLE; // 환경변수로 제공됨
```

환경변수를 통해 테이블명을 동적으로 제공하므로, 핸들러 코드는 변경 없음:

- 01: `ITEMS_TABLE=hello-world-items-dev`
- 03: `ITEMS_TABLE=hello-world-items-sam-dev`

### 2. 배포 후 환경변수 확인

```bash
# 01 함수 확인
aws lambda get-function-configuration \
  --function-name hello-world-say-hello-dev \
  --query 'Environment.Variables'

# 03 함수 확인
aws lambda get-function-configuration \
  --function-name hello-world-sam-say-hello-dev \
  --query 'Environment.Variables'
```

### 3. CloudFormation 스택 이름

```bash
# 01: serverless-framework가 자동으로 생성 (service-stage)
aws cloudformation describe-stacks --stack-name hello-world-lambda-dev

# 03: 명시적으로 지정 권장
sam deploy --guided --stack-name hello-world-sam-dev
```

---

## 🔍 검증 체크리스트

배포 전 확인:

- [ ] 03의 모든 리소스명에 `sam-` 또는 `-sam-` 접두사가 있는가?
- [ ] DynamoDB 테이블명: `hello-world-items-sam-${Stage}` ✅
- [ ] IAM Role명: `HelloWorldRole-sam-${Stage}` ✅
- [ ] Lambda 함수명: `hello-world-sam-*` ✅
- [ ] API Gateway명: `hello-world-sam-api-${Stage}` ✅
- [ ] 환경변수 `ITEMS_TABLE`이 올바른 테이블명으로 설정됨 ✅

---

## 📚 참고

- 01-hello-world: `/Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/01-hello-world/serverless.yml`
- 03-hello-world-sam: `/Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/03-hello-world-sam/template.yaml`
- 환경변수 설정: `/Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/03-hello-world-sam/.env.json`

---

**최종 수정일**: 2025-12-30  
**상태**: ✅ 충돌 방지 전략 적용됨
