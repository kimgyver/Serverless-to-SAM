# Serverless Framework → AWS SAM 1:1 매핑 가이드

## 📋 프로젝트 구조 비교

### 01-hello-world (Serverless Framework)

```
01-hello-world/
├── serverless.yml          # IaC 정의 (함수, 이벤트, 리소스)
├── handlers/
│   └── hello.js            # 8개 핸들러 함수 모두 포함
├── utils/
│   ├── dynamodb.js         # DynamoDB 유틸
│   ├── errors.js           # 에러 처리
│   └── validation.js       # 입력 검증
└── package.json
```

### 03-hello-world-sam (AWS SAM)

```
03-hello-world-sam/
├── template.yaml           # IaC 정의 (함수, 이벤트, 리소스)
├── handlers/
│   └── hello.js            # 8개 핸들러 함수 모두 포함
├── utils/                  # (포함되지 않음 - 필요시 추가)
├── .env.json               # SAM Local 환경변수
└── package.json
```

---

## 🔄 1:1 함수 매핑

### 함수별 매핑 테이블

| #   | Serverless 함수명 | 01 핸들러              | SAM 함수명              | 03 핸들러              | 엔드포인트        | 메서드 | 설명          |
| --- | ----------------- | ---------------------- | ----------------------- | ---------------------- | ----------------- | ------ | ------------- |
| 1️⃣  | `sayHello`        | `helloHandler`         | `SayHelloFunction`      | `helloHandler`         | `/hello`          | GET    | 기본 응답     |
| 2️⃣  | `greet`           | `greetHandler`         | `GreetFunction`         | `greetHandler`         | `/hello/{name}`   | GET    | 경로 파라미터 |
| 3️⃣  | `createMessage`   | `createMessageHandler` | `CreateMessageFunction` | `createMessageHandler` | `/message`        | POST   | POST 본문     |
| 4️⃣  | `divide`          | `divideHandler`        | `DivideFunction`        | `divideHandler`        | `/divide/{a}/{b}` | GET    | 에러 처리     |
| 5️⃣  | `createItem`      | `createItemHandler`    | `CreateItemFunction`    | `createItemHandler`    | `/item`           | POST   | DynamoDB 생성 |
| 6️⃣  | `listItems`       | `listItemsHandler`     | `ListItemsFunction`     | `listItemsHandler`     | `/items`          | GET    | DynamoDB 조회 |
| 7️⃣  | `updateItem`      | `updateItemHandler`    | `UpdateItemFunction`    | `updateItemHandler`    | `/item/{id}`      | PUT    | DynamoDB 수정 |
| 8️⃣  | `deleteItem`      | `deleteItemHandler`    | `DeleteItemFunction`    | `deleteItemHandler`    | `/item/{id}`      | DELETE | DynamoDB 삭제 |

---

## 📝 Serverless.yml → template.yaml 매핑

### Provider 설정

#### Serverless Framework (01-hello-world/serverless.yml)

```yaml
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}

  iam:
    role:
      statements:
        - Effect: Allow
          Action: [logs:*, dynamodb:*]
          Resource: "*"

  environment:
    STAGE: ${self:provider.stage}
    ITEMS_TABLE: hello-world-items-${self:provider.stage}
```

#### AWS SAM (03-hello-world-sam/template.yaml)

```yaml
Parameters:
  Stage:
    Type: String
    Default: dev

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 128
    Environment:
      Variables:
        STAGE: !Ref Stage
        ITEMS_TABLE: !Ref ItemsTable

Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument: { ... }
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: DynamoDBAccess
          PolicyDocument: { ... }
```

**주요 차이점:**

- Serverless: 함수별 설정을 함수 정의에서 오버라이드
- SAM: `Globals` 섹션에서 공통 설정, 함수별로 필요시 오버라이드

---

### 함수 정의 매핑

#### 예시: SayHelloFunction

**Serverless Framework (01)**

```yaml
functions:
  sayHello:
    handler: handlers/hello.helloHandler
    description: Simplest Lambda - returns Hello
    events:
      - http:
          path: hello
          method: get
          cors: true
```

**AWS SAM (03)**

```yaml
Resources:
  SayHelloFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/hello.helloHandler
      Description: Simplest Lambda - returns Hello
      Events:
        HelloEvent:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /hello
            Method: get
```

---

### 경로 파라미터 처리

#### 예시: GreetFunction (with path parameter)

**Serverless Framework (01)**

```yaml
functions:
  greet:
    handler: handlers/hello.greetHandler
    events:
      - http:
          path: hello/{name}
          method: get
          request:
            parameters:
              paths:
                name: true
```

**AWS SAM (03)**

```yaml
Resources:
  GreetFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/hello.greetHandler
      Events:
        GreetEvent:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /hello/{name}
            Method: get
```

**핸들러 코드는 동일** (event.pathParameters.name)

---

## 🗄️ DynamoDB 테이블 정의

### Serverless Framework (01)

```yaml
resources:
  Resources:
    ItemsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: hello-world-items-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
```

### AWS SAM (03)

```yaml
Resources:
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "sam-hello-world-items-${Stage}"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
```

**차이점:**

- Serverless: `${self:provider.stage}` 변수 사용
- SAM: `!Sub` 함수 + `!Ref` 파라미터 사용

---

## 🛠️ 핸들러 코드 비교

### 동일한 코드 사용 가능 ✅

01과 03의 `handlers/hello.js`는 **완전히 동일**합니다.

#### 예시: helloHandler

```javascript
// 01-hello-world/handlers/hello.js
// 03-hello-world-sam/handlers/hello.js (동일)

exports.helloHandler = async (event, context) => {
  console.log("🔵 SayHello Handler called");

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello from Lambda!",
      stage: process.env.STAGE,
      timestamp: new Date().toISOString()
    })
  };
};
```

**이유:**

- Lambda 핸들러는 프레임워크/IaC와 독립적
- 이벤트 형식 (event, context)은 동일
- 환경변수 접근 방식도 동일

---

## 📊 배포 비교

### Serverless Framework (01)

```bash
# 배포
serverless deploy --stage dev --region us-east-1

# 로컬 테스트
serverless offline start

# 함수 호출
curl http://localhost:3000/hello
```

### AWS SAM (03)

```bash
# 빌드
sam build

# 배포
sam deploy --guided

# 로컬 테스트
sam local start-api

# 또는 개별 함수 테스트
sam local invoke SayHelloFunction --event event.json
```

---

## 🧪 테스트 매핑

### 테스트 전략

| 시나리오              | 01 (Serverless)          | 03 (SAM)   | 특징                       |
| --------------------- | ------------------------ | ---------- | -------------------------- |
| **LocalStack 테스트** | N/A (DynamoDB 직접 사용) | ✅ Docker  | 완전 로컬, AWS 비용 X      |
| **SAM Local 테스트**  | N/A                      | ✅ SAM CLI | 로컬 Lambda, 실제 DynamoDB |
| **AWS Lambda 테스트** | ✅ serverless-offline    | ✅ 배포 후 | 실제 클라우드 환경         |

### 01 로컬 테스트

```bash
cd 01-hello-world
npm install
serverless offline start  # localhost:3000
```

### 03 로컬 테스트

```bash
cd 03-hello-world-sam
npm install

# 옵션 A: LocalStack 사용
npm run test:localstack

# 옵션 B: SAM Local + AWS DynamoDB
npm run test:sam-local

# 옵션 C: 배포 후 AWS Lambda 테스트
npm run test:aws
```

---

## 📚 핵심 차이점 정리

### 개념적 차이

| 항목                 | Serverless Framework | AWS SAM                    |
| -------------------- | -------------------- | -------------------------- |
| **철학**             | 간편함, 자동화       | 명시적, CloudFormation     |
| **문법**             | YAML (간소화)        | YAML (CloudFormation 기반) |
| **학습곡선**         | 낮음                 | 중간                       |
| **커스터마이제이션** | 제한적               | 자유도 높음                |
| **AWS 네이티브**     | 추상화 계층          | 직접 접근                  |

### 기술적 차이

| 항목            | Serverless Framework | AWS SAM                     |
| --------------- | -------------------- | --------------------------- |
| **배포 도구**   | 자체 CLI             | AWS SAM CLI                 |
| **기본 형식**   | 자체 YAML            | CloudFormation              |
| **환경변수**    | 함수별로 정의        | Globals + 함수별 오버라이드 |
| **IAM 관리**    | 자동 생성            | 명시적 정의                 |
| **로컬 테스트** | serverless-offline   | sam local                   |

---

## ✅ 마이그레이션 체크리스트

### 코드 레벨

- ✅ 핸들러 함수는 동일하게 복사
- ✅ utils 디렉토리도 동일하게 사용 가능
- ✅ 환경변수 접근은 동일 (process.env.\*)

### IaC 레벨

- ✅ 함수 정의: `handler` → `Handler` + `Type: AWS::Serverless::Function`
- ✅ 이벤트 정의: `events: [http: {...}]` → `Events: {Event: {Type: Api, ...}}`
- ✅ 환경변수: `provider.environment` → `Globals.Function.Environment`
- ✅ IAM 권한: `provider.iam` → `LambdaExecutionRole` 리소스

### 배포 레벨

- ✅ `serverless deploy` → `sam build` + `sam deploy`
- ✅ 로컬 테스트: `serverless offline` → `sam local start-api`
- ✅ 함수 호출: 동일한 HTTP 엔드포인트

---

## 📖 참고 자료

### 01-hello-world (Serverless Framework)

- [serverless.yml 전체 내용](/Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/01-hello-world/serverless.yml)
- [handlers/hello.js 전체 내용](/Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/01-hello-world/handlers/hello.js)

### 03-hello-world-sam (AWS SAM)

- [template.yaml 전체 내용](/Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/03-hello-world-sam/template.yaml)
- [handlers/hello.js 전체 내용](/Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/03-hello-world-sam/handlers/hello.js)

---

## 🎯 결론

**01과 03의 관계:**

- 완전히 동일한 비즈니스 로직 (8개 함수)
- 다른 IaC 표현 방식 (Serverless vs SAM)
- 동일한 AWS 리소스 생성 (Lambda, DynamoDB, API Gateway, IAM Role)

**학습 가치:**

- Serverless Framework의 간편함 이해
- 기저의 CloudFormation 개념 이해
- IaC 표현의 차이와 선택의 중요성

---

**최종 수정일**: 2025-12-30  
**상태**: ✅ 1:1 매핑 완료
