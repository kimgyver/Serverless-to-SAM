# SAM Example 1: Hello World - Complete Guide

## 📌 목적

이 예제는 **AWS SAM (Serverless Application Model)**의 기본 개념을 실습하기 위한 프로젝트입니다.

Serverless Framework 예제(01-hello-world)와 비교하면서 **SAM의 명시적 리소스 정의**, **Parameter 활용**, **Globals 설정** 등을 배울 수 있습니다.

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────┐
│          API Gateway (REST API)             │
│                                             │
│  GET  /say-hello       ──┐                 │
│  GET  /greet/{name}    ──┼──→ Lambda Fns   │
│  POST /message         ──┤                 │
│  POST /divide          ──┘                 │
│                                             │
│  ✅ CloudWatch Logs                        │
│  ✅ X-Ray Tracing (enabled)                │
│  ✅ Request Throttling (50 RPS)            │
└─────────────────────────────────────────────┘
```

---

## 📂 폴더 구조

```
03-hello-world-sam/
├── template.yaml              # SAM 템플릿 (CloudFormation 변환됨)
├── handlers/
│   └── hello.js               # 4개 함수: sayHello, greet, createMessage, divide
├── package.json               # npm 의존성 + SAM 배포 명령
├── samconfig.toml             # SAM 배포 설정 (처음 deploy --guided 후 생성)
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

```bash
# SAM 로컬 API 시작 (localhost:3000)
npm run local
```

그러면 다음과 같이 로컬 엔드포인트가 시작됨:

```
Mounting SayHelloFunction at http://127.0.0.1:3000/say-hello [GET]
Mounting GreetFunction at http://127.0.0.1:3000/greet/{name} [GET]
Mounting CreateMessageFunction at http://127.0.0.1:3000/message [POST]
Mounting DivideFunction at http://127.0.0.1:3000/divide [POST]
```

테스트 (다른 터미널에서):

```bash
# 1️⃣ GET /say-hello
curl http://localhost:3000/say-hello

# 2️⃣ GET /greet/{name}
curl http://localhost:3000/greet/Alice

# 3️⃣ POST /message
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World","author":"Alice"}'

# 4️⃣ POST /divide
curl -X POST http://localhost:3000/divide \
  -H "Content-Type: application/json" \
  -d '{"dividend":10,"divisor":2}'
```

### Step 3: AWS에 배포

```bash
# 첫 배포 (대화형 설정)
npm run deploy

# 또는 명령줄로 직접
sam deploy --guided \
  --parameter-overrides \
    Stage=dev \
    Environment=development

# 이후 배포 (samconfig.toml 사용)
npm run deploy-dev
npm run deploy-staging
npm run deploy-prod
```

배포 후 출력:

```
CloudFormation outputs from deployed stack
Key                   Value
HelloWorldApiEndpoint https://abc123.execute-api.us-east-1.amazonaws.com/dev
SayHelloFunctionArn   arn:aws:lambda:us-east-1:123456:function:hello-world-say-hello-dev
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
```

---

## 💡 각 함수별 설명

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

**테스트 - 에러 케이스**:

```bash
curl -X POST http://localhost:3000/divide \
  -H "Content-Type: application/json" \
  -d '{"dividend":10,"divisor":0}'

# Response: { "error": "divisor cannot be 0" }
```

---

## 🔐 IAM 권한 관리 (LambdaExecutionRole)

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
