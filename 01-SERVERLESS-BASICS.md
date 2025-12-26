# Serverless Framework 완벽 이해 (Day 1)

## 🎯 목표

- Serverless Framework가 **뭐하는 건가** 정확히 이해
- CloudFormation과의 관계 파악
- `serverless.yml`의 모든 섹션 마스터
- 첫 배포 성공

---

## 📖 파트 1: 기본 개념 (20분)

### Serverless Framework는 뭔가?

```
┌─────────────────────────────────────────┐
│   당신 (Developer)                        │
└────────────────┬────────────────────────┘
                 │
        serverless.yml (쓰기 쉬운)
                 │
┌────────────────▼────────────────────────┐
│   Serverless Framework                   │
│   - serverless.yml 파싱                  │
│   - 플러그인 실행                         │
│   - 커스텀 스크립트                      │
└────────────────┬────────────────────────┘
                 │
      CloudFormation Template (JSON)
                 │
┌────────────────▼────────────────────────┐
│   AWS CloudFormation                     │
│   - 리소스 생성 (Lambda, API GW, etc)   │
│   - IAM Role 할당                        │
│   - 권한 설정                            │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│   실제 AWS 리소스                        │
│   - Lambda functions                    │
│   - API Gateway                         │
│   - S3 buckets                          │
│   - DynamoDB tables                     │
│   - IAM roles & policies                │
└─────────────────────────────────────────┘
```

**쉽게 말하면:**

- **Serverless Framework** = CloudFormation을 쓰기 쉽게 추상화한 도구
- **serverless.yml** = 인간이 쓸 수 있는 YAML 형식
- **실제로는** 내부적으로 CloudFormation JSON을 생성해서 배포

### Serverless vs SAM vs CloudFormation 비교

| 항목          | Serverless Framework | SAM            | CloudFormation     |
| ------------- | -------------------- | -------------- | ------------------ |
| **쓰기 쉬움** | ⭐⭐⭐ (가장 추상화) | ⭐⭐ (중간)    | ⭐ (매우 복잡)     |
| **유연성**    | ⭐⭐ (제한적)        | ⭐⭐⭐         | ⭐⭐⭐ (가장 유연) |
| **플러그인**  | ⭐⭐⭐ (풍부함)      | ⭐ (별로 없음) | ❌                 |
| **커뮤니티**  | ⭐⭐⭐               | ⭐⭐           | ⭐⭐⭐             |
| **학습곡선**  | ⭐ (쉬움)            | ⭐⭐ (중간)    | ⭐⭐⭐ (어려움)    |
| **AWS 공식**  | ❌ (Third-party)     | ✅             | ✅                 |

**아키텍처 관점:**

```
편의성 ─────────────────────────────────→ 유연성

Serverless Framework  ←  SAM  ←  CloudFormation
  (Lambda 중심)        (Lambda + 확장)  (모든 리소스 동등)
  (가장 추상화)        (균형)          (가장 상세)
```

**각 프레임워크의 최적 사용:**

- **Serverless Framework**: Lambda 기반 마이크로서비스 빠르게 배포
- **SAM**: Lambda + 부가 리소스(DDB, S3 등) 조합, AWS 공식 지원 필요할 때
- **CloudFormation**: 전체 인프라 코드화 (EC2, RDS, VPC 등 포함)

**학습 관점:**

- 먼저: Serverless Framework (이해하기 쉬움, Lambda 직관적)
- 다음: SAM으로 전환 (AWS 공식, 더 명확하고 유연함)
- 마지막: CloudFormation 심화 (필요할 때만)

---

## 🔍 파트 2: serverless.yml 섹션별 완벽 가이드

### 2.1 `service` - 프로젝트 이름

```yaml
service: my-awesome-api
# 풀 이름 (deprecated지만 참고)
# service:
#   name: my-awesome-api
#   awsAccountId: "123456789012"
```

**의미:**

- AWS CloudFormation 스택 이름의 기본이 됨
- 실제 CF 스택 이름: `my-awesome-api-dev`, `my-awesome-api-prod` (stage 추가)
- 리소스 이름 prefix로 사용: `my-awesome-api-dev-HelloWorldFunction`

---

### 2.2 `provider` - AWS 설정

가장 중요한 섹션!

```yaml
provider:
  name: aws # 필수: AWS 사용
  runtime: nodejs18.x # Lambda 런타임 (python3.11, ruby3.2 등)
  region: us-east-1 # 기본 리전
  stage: ${opt:stage, 'dev'} # ⭐ 배포 시 --stage 옵션으로 지정, 기본값 'dev'

  # 🔵 stage 심화 설명
  # ${opt:stage, 'dev'} = 명령줄 옵션 ${opt:stage}를 받고, 없으면 기본값 'dev'
  # 사용 예:
  #   serverless deploy --stage prod  → stage = "prod"
  #   serverless deploy               → stage = "dev" (기본값)
  #   serverless deploy --stage staging → stage = "staging"
  #
  # stage는 여러 곳에서 자동 사용됨:
  # - CloudFormation 스택 이름: my-app-dev, my-app-prod
  # - Lambda 함수 이름: my-app-dev-helloWorld, my-app-prod-helloWorld
  # - DynamoDB 테이블: Users-dev, Users-prod
  # - 환경 구분 및 리소스 격리

  # 🟡 환경별 리소스 분리 (Stage Isolation)
  # 같은 코드를 dev/staging/prod에 배포할 때, 각 환경의 리소스가 완전히 분리됨
  #
  # 예시:
  #   dev 환경:
  #   ├─ 스택: my-app-dev (독립적)
  #   ├─ 테이블: Users-dev
  #   ├─ 버킷: uploads-dev
  #   └─ 함수: my-app-dev-helloWorld
  #
  #   prod 환경:
  #   ├─ 스택: my-app-prod (독립적)
  #   ├─ 테이블: Users-prod (✅ dev와 다른 테이블!)
  #   ├─ 버킷: uploads-prod (✅ dev와 다른 버킷!)
  #   └─ 함수: my-app-prod-helloWorld
  #
  # 장점:
  # - 각 환경이 완전히 독립적
  # - dev 테스트가 prod에 영향 없음
  # - 여러 개발자가 동시에 dev 사용 가능
  # - 점진적 배포: dev → staging → prod

  # 🔑 이 role을 모든 Lambda 함수가 공유 (중요!)
  iam:
    role:
      name: MyServiceRole-${self:provider.stage} # 생성될 IAM Role 이름
      statements:
        - Effect: Allow
          Action:
            - logs:CreateLogGroup
            - logs:CreateLogStream
            - logs:PutLogEvents
          Resource: "*"
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:Scan
            - dynamodb:GetItem
          Resource: "arn:aws:dynamodb:${self:provider.region}:*:table/Users"

  # 🔵 환경 변수 (모든 Lambda 함수가 코드에서 접근 가능)
  # Lambda 코드: process.env.DB_TABLE, process.env.LOG_LEVEL
  environment:
    DB_TABLE: Users-${self:provider.stage}
    LOG_LEVEL: INFO

  # 🟢 태그 (모든 리소스에 자동 메타데이터로 붙음)
  # 용도: 비용 추적, 환경 분류, 권한 관리 등
  # Lambda 코드에서 접근 불가 (AWS 콘솔, CLI에서만 조회 가능)
  tags:
    Environment: ${self:provider.stage}
    Service: MyAPI
    Owner: DataTeam

  # 배포 설정
  stackTags:
    CostCenter: Engineering

  # API Gateway 설정
  apiGateway:
    minimumCompressionSize: 1024 # 1KB 이상 응답은 gzip 압축
    # 인증(auth) 설정은 functions.events.http.authorizer에서 함
    # ➜ 상세 가이드: API-AUTHENTICATION.md 참고
```

---

## 🔍 심화: API Gateway 설정 2가지 레벨

Serverless Framework에서 API Gateway는 **2곳**에서 설정됩니다:

### 레벨 1️⃣: provider.apiGateway (전역 설정)

**의미:** 모든 API 엔드포인트에 적용되는 기본 설정

```yaml
provider:
  apiGateway:
    minimumCompressionSize: 1024 # 모든 응답 압축
    cloudWatchLogsLevel: INFO # 모든 요청 로깅
    metricsEnabled: true # 모든 API 메트릭
    dataTraceEnabled: false # 보안: 민감 데이터 로깅 금지
```

**이것들이 적용되는 곳:**

```
provider.apiGateway 설정
    ↓
모든 functions의 http events에 자동 적용
    ↓
authorizer 지정 없는 엔드포인트에도 적용
    ↓
기본값 역할
```

---

### 레벨 2️⃣: functions.events.http (함수별 설정)

**의미:** 개별 엔드포인트별 세부 설정

```yaml
functions:
  helloWorld:
    handler: handlers/hello.handler
    events:
      - http:
          path: hello # 경로
          method: GET # HTTP 메서드
          cors: true # CORS 허용
          authorizer: # 인증
            name: authorizeLambda

  publicApi:
    handler: handlers/public.handler
    events:
      - http:
          path: public
          method: GET
          cors: # CORS 제한
            origin: https://example.com
            headers:
              - Content-Type
              - Authorization
          # authorizer 없음 = 공개
```

---

### 설정 우선순위

```
┌─────────────────────────────────────┐
│ functions.events.http (높음)         │  ← 우선 적용
│ (개별 엔드포인트 설정)               │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ provider.apiGateway (낮음)           │  ← 기본값
│ (전역 설정)                          │
└─────────────────────────────────────┘
```

**실제 예시:**

```yaml
provider:
  apiGateway:
    minimumCompressionSize: 1024 # 기본값
    cloudWatchLogsLevel: INFO # 기본값

functions:
  # 함수 A: 기본값 적용
  hello:
    handler: hello.handler
    events:
      - http:
          path: hello
          method: GET
          # cloudWatchLogsLevel 지정 안 함
          # → provider의 INFO 적용

  # 함수 B: 개별 설정으로 오버라이드
  debug:
    handler: debug.handler
    events:
      - http:
          path: debug
          method: GET
          cloudWatchLogsLevel: DEBUG # ← 이걸 우선 적용!
          # provider의 INFO는 무시됨
```

---

### 언제 어디서 설정할까?

| 상황                   | 설정 위치               | 예시                           |
| ---------------------- | ----------------------- | ------------------------------ |
| **모든 API에 적용**    | `provider.apiGateway`   | 압축, 로깅 레벨                |
| **특정 API만**         | `functions.events.http` | 인증, CORS, 경로               |
| **대부분 같고 일부만** | 양쪽 모두               | 기본값는 provider, 예외는 함수 |

**실무 추천:**

```yaml
provider:
  apiGateway:
    # 공통 설정 (모든 API에 필수)
    minimumCompressionSize: 1024
    metricsEnabled: true

functions:
  # 각 함수별 고유 설정만 여기서
  userApi:
    handler: user.handler
    events:
      - http:
          path: /users
          method: GET
          authorizer: cognitoAuthorizer # ← 이 API만 인증
```

---

**핵심:**

- `iam.role.statements` = 모든 Lambda 함수가 할 수 있는 작업
- `environment` = 모든 Lambda가 공유하는 환경변수
- `stage`로 환경별 리소스 분리
- **`apiGateway`는 2가지 레벨에서 설정**: provider (전역) vs functions.events.http (개별)

---

### 2.3 `functions` - Lambda 함수 정의

```yaml
functions:
  # 함수 이름 (물리적 이름은 서비스 이름과 함께 생성됨)
  helloWorld:
    handler: handlers/hello.handler # 경로/파일.함수명
    runtime: nodejs18.x # 이 함수만 다른 런타임? (provider 오버라이드)

    # 함수 레벨 환경 변수 (provider 환경변수 오버라이드)
    environment:
      LOG_LEVEL: DEBUG # 이 함수만 DEBUG로

    # 이벤트 트리거들
    events:
      # 1️⃣ HTTP API Gateway
      - http:
          path: hello/{name} # /hello/{name}
          method: GET
          cors: true

      # 2️⃣ S3 이벤트
      - s3:
          bucket: my-uploads
          event: s3:ObjectCreated:*
          rules:
            - prefix: uploads/
            - suffix: .jpg

      # 3️⃣ 스케줄 (매일 9시)
      - schedule:
          rate: cron(0 9 * * ? *)

      # 4️⃣ SQS 메시지
      - sqs:
          arn: arn:aws:sqs:us-east-1:123456789012:MyQueue
          batchSize: 10

      # 5️⃣ DynamoDB Stream
      - stream:
          type: dynamodb
          arn:
            Fn::GetAtt: [UsersTable, StreamArn]
          batchSize: 100

    # 메모리, 타임아웃
    memorySize: 256 # MB
    timeout: 30 # 초

    # 함수 로깅
    logs:
      level: INFO
      logRetention: 7 # CloudWatch 로그 보관 기간 (일)

    # VPC에 배포 (RDS 접근 등)
    vpc:
      securityGroupIds:
        - sg-xxxxxx
      subnetIds:
        - subnet-xxxxx
        - subnet-yyyyy

    # 코드 위치 (다른 패키지에 있을 때)
    package:
      individually: true
      patterns:
        - "!node_modules/**"
        - handler.js

  # 또 다른 함수
  processData:
    handler: handlers/process.handler
    events:
      - http:
          path: process
          method: POST
```

**핵심:**

- 함수마다 별도의 Lambda 함수 생성
- `events`로 트리거 설정 (API GW, S3, SQS 등)
- 함수 레벨 설정으로 provider 설정 오버라이드 가능

---

## 🔍 심화: CORS (Cross-Origin Resource Sharing) 이해

### CORS란?

```
브라우저는 보안 때문에 다른 도메인의 API를 호출하지 못함
CORS = "다른 도메인에서도 이 API 호출 허용하기"
```

**구체적인 예시:**

```
❌ CORS 없을 때:
브라우저: https://example.com
API 요청: https://api.example.com/hello
→ 거부됨 (도메인이 다름, 보안상 차단)

✅ CORS: true일 때:
브라우저: https://example.com
API 요청: https://api.example.com/hello
→ 성공 (CORS 허용, 다른 도메인도 호출 가능)
```

### CORS 설정 방법

**1️⃣ 모든 도메인 허용 (개발/테스트):**

```yaml
functions:
  publicApi:
    handler: handlers/public.handler
    events:
      - http:
          path: /public
          method: GET
          cors: true # ← 모든 도메인에서 호출 가능
```

**내부적으로:**

```
API Gateway가 자동으로 다음 헤더 추가:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Headers: Content-Type, X-Amz-Date, ...
- Access-Control-Allow-Methods: GET, POST, PUT, DELETE, ...
```

**2️⃣ 특정 도메인만 허용 (프로덕션):**

```yaml
functions:
  adminApi:
    handler: handlers/admin.handler
    events:
      - http:
          path: /admin
          method: GET
          cors:
            origin: https://admin.example.com # 이 도메인만
            headers:
              - Content-Type
              - Authorization
              - X-Custom-Header
            allowCredentials: true # 쿠키 포함 요청 허용
            maxAge: 3600 # 5분간 preflight 캐싱
```

**3️⃣ CORS 없음 (백엔드끼리만):**

```yaml
functions:
  internalApi:
    handler: handlers/internal.handler
    events:
      - http:
          path: /internal
          method: GET
          # cors 설정 없음 = 같은 도메인에서만 호출 가능
```

### 실무 추천 패턴

```yaml
provider:
  stage: ${opt:stage, 'dev'}

functions:
  # 개발: 모든 도메인 허용
  publicApi:
    handler: handlers/public.handler
    events:
      - http:
          path: /public
          method: GET
          cors: true # 개발할 때는 간단하게

  # 프로덕션: 특정 도메인만
  apiGateway:
    handler: handlers/api.handler
    events:
      - http:
          path: /api
          method: GET
          cors: ${self:custom.corsConfig.${self:provider.stage}}

custom:
  corsConfig:
    dev: true # 개발: 모든 도메인
    prod:
      origin: https://example.com # 프로덕션: 특정 도메인
      allowCredentials: true
```

### CORS 에러 디버깅

**브라우저 에러:**

```
Access to XMLHttpRequest at 'https://api.example.com/hello'
from origin 'https://example.com' has been blocked by CORS policy
```

**해결:**

1. `cors: true` 추가
2. 또는 `cors: { origin: "https://example.com" }` 로 도메인 지정
3. API Gateway 콘솔에서 CORS 설정 확인

### CORS vs 인증 (Authorization)

| 구분         | CORS                  | 인증                 |
| ------------ | --------------------- | -------------------- |
| **목적**     | 다른 도메인 호출 허용 | 누가 호출했는지 확인 |
| **브라우저** | 브라우저가 확인       | 서버가 확인          |
| **설정**     | `cors` 키워드         | `authorizer` 키워드  |
| **예시**     | 도메인 검증           | JWT, API Key         |

**둘 다 필요한 경우:**

```yaml
functions:
  protectedApi:
    handler: handlers/protected.handler
    events:
      - http:
          path: /protected
          method: GET
          cors: true # ← CORS 허용
          authorizer: # ← 인증 필요
            name: authorizeLambda
```

---

**핵심:**

- 함수마다 별도의 Lambda 함수 생성
- `events`로 트리거 설정 (API GW, S3, SQS 등)
- 함수 레벨 설정으로 provider 설정 오버라이드 가능

---

### 2.4 `resources` - 추가 AWS 리소스

`functions` 섹션은 Lambda만 정의. 다른 리소스는 여기에!

```yaml
resources:
  Resources:
    # DynamoDB 테이블
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: Users-${self:provider.stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH
        StreamSpecification:
          StreamViewType: NEW_AND_OLD_IMAGES

    # S3 버킷
    UploadBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: my-uploads-${self:provider.stage}
        VersioningConfiguration:
          Status: Enabled

    # SQS 큐
    ProcessQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ProcessQueue-${self:provider.stage}
        VisibilityTimeout: 300
        MessageRetentionPeriod: 1209600

    # IAM Policy (Lambda에 추가 권한)
    # 💡 provider.iam.role.statements에 넣는 것과 같은 효과
    CustomPolicy:
      Type: AWS::IAM::Policy
      Properties:
        PolicyName: CustomLambdaPolicy
        PolicyDocument:
          Statement:
            - Effect: Allow
              Action:
                - s3:GetObject
              Resource: arn:aws:s3:::my-uploads-${self:provider.stage}/*
        Roles:
          - Ref: IamRoleLambdaExecution # Serverless가 자동 생성한 role

  # Output (배포 후 콘솔에 표시)
  Outputs:
    UsersTableName:
      Description: Users DynamoDB Table Name
      Value:
        Ref: UsersTable
    UploadBucketName:
      Description: Upload S3 Bucket Name
      Value:
        Ref: UploadBucket
    ProcessQueueUrl:
      Description: Process SQS Queue URL
      Value:
        Ref: ProcessQueue
```

**핵심:**

- CloudFormation 문법 그대로 사용
- `${self:provider.stage}` 같은 변수 사용 가능
- IAM Role 이름: `IamRoleLambdaExecution` (자동 생성됨)

---

### 2.5 `environment` + `parameters` - 설정 관리

```yaml
# 🔴 환경 변수 (배포 후 변경 불가)
environment:
  DB_TABLE: Users-${self:provider.stage}
  API_ENDPOINT: https://api-${self:provider.stage}.example.com
  LOG_LEVEL: ${self:custom.logLevel.${self:provider.stage}, 'INFO'}

# 🔵 파라미터 (배포 시 입력 가능)
# serverless deploy --param="region=ap-southeast-2"
# serverless deploy --param="env=au-prod"
params:
  prod:
    region: us-east-1
    minLogLevel: WARN
  au-prod:
    region: ap-southeast-2
    minLogLevel: INFO

  # 또는 명령줄에서 입력
```

**차이:**

- `environment`: 코드에서 `process.env.DB_TABLE` 으로 접근
- `params`: CloudFormation에서 Ref로 접근 (덜 사용)

---

### 2.6 `plugins` - Serverless 확장 기능

```yaml
plugins:
  # 로컬 테스트를 위한 오프라인 모드
  - serverless-offline

  # DynamoDB 로컬 테스트
  - serverless-dynamodb-local

  # Python 의존성 자동 패킹
  - serverless-python-requirements

  # 환경변수 관리
  - serverless-plugin-warmup

  # 커스텀 플러그인
  - ./plugins/custom-deployment-plugin.js
```

**배포 시 동작 (로컬에서만):**

```
[로컬 컴퓨터]
    ↓
serverless deploy (Serverless Framework 로컬에서 실행)
    ↓
plugins 로드 (로컬의 node_modules에서)
    ↓
각 플러그인의 hooks 실행 (pre-deploy, post-deploy)
    - CloudFormation 템플릿 수정
    - 의존성 정리
    - 배포 전 처리
    ↓
Lambda .zip 생성 (devDependencies 제외)
    ↓
AWS S3에 업로드 & Lambda에 배포
    ↓
[AWS Lambda - Production]
plugins 로드 안 됨 ❌
순수 handler.js만 실행 ✅
```

**⚠️ 중요: Production에서는 플러그인이 로드되지 않습니다!**

- 플러그인은 **배포 "과정"**에만 사용됨 (로컬에서)
- `devDependencies`에만 설치됨 (Production에 포함 안 됨)
- Production의 Lambda는 플러그인 없이 순수 코드만 실행됨

**예시:**

```bash
# 로컬에서 배포
serverless deploy
# ✅ plugins 로드됨 (로컬)
# ✅ CloudFormation 생성 (로컬)
# ✅ Lambda .zip에 포함 안 됨

# Production Lambda 실행
exports.handler = async (event) => {
  // ✅ handler.js 실행
  // ❌ serverless-offline 사용 불가 (로드 안 됨)
};
```

---

## 🔍 심화: `environment` vs `tags` 완벽 이해

### environment (환경 변수)

```yaml
provider:
  environment:
    DB_TABLE: Users-${self:provider.stage}
    API_ENDPOINT: https://api.example.com
    LOG_LEVEL: INFO
```

**Lambda 코드에서 접근:**

```javascript
// ✅ 모두 접근 가능
const tableName = process.env.DB_TABLE; // "Users-dev"
const apiEndpoint = process.env.API_ENDPOINT; // "https://api.example.com"
const logLevel = process.env.LOG_LEVEL; // "INFO"
```

**특징:**

- Lambda 함수가 **런타임에 사용**하는 설정값
- 코드 변경 없이 배포 후에도 변경 가능 (AWS 콘솔에서)
- 각 Lambda 함수마다 다르게 설정 가능

---

### tags (태그)

```yaml
provider:
  tags:
    Environment: ${self:provider.stage} # dev, staging, prod
    Service: MyAPI
    Owner: DataTeam
    CostCenter: Engineering
    Project: Serverless-Learning

stackTags: # CloudFormation 스택 자체에만 붙음
  ManagedBy: Serverless
```

**Lambda 코드에서 접근:**

```javascript
// ❌ 코드에서 접근 불가 (메타데이터이기 때문)
// 대신 AWS CLI나 콘솔에서만 조회 가능
```

**특징:**

- 리소스를 **분류/추적/관리**하기 위한 메타데이터
- AWS 콘솔, CLI, Cost Explorer에서 조회 가능
- 비용 추적, 권한 관리, 환경 분류에 사용

---

### 실제 사용 예시

```yaml
provider:
  environment:
    # 🔵 애플리케이션 설정값
    DYNAMODB_TABLE: Users-${self:provider.stage}
    S3_BUCKET: uploads-${self:provider.stage}
    SLACK_WEBHOOK: https://hooks.slack.com/...
    LOG_LEVEL: ${self:custom.logLevel.${self:provider.stage}}

  tags:
    # 🟢 리소스 분류/추적
    Environment: ${self:provider.stage} # dev/staging/prod
    Service: UserManagement # 서비스 이름
    Owner: Backend-Team # 담당 팀
    CostCenter: Engineering # 비용 할당
    Project: Serverless-Learning # 프로젝트명
    DataClassification: Internal # 데이터 분류
    BackupPolicy: Daily # 정책

functions:
  createUser:
    handler: handlers/user.create

    # 함수별 환경변수 오버라이드
    environment:
      LOG_LEVEL: DEBUG # 이 함수만 DEBUG로 (다른 함수는 INFO)
```

**AWS 콘솔에서 보이는 모습:**

```
Lambda 함수: my-app-dev-createUser

📝 구성 탭
├─ 환경 변수
│  ├─ DYNAMODB_TABLE = "Users-dev"
│  ├─ S3_BUCKET = "uploads-dev"
│  └─ LOG_LEVEL = "DEBUG"
│
🏷️ 태그 탭
├─ Environment = "dev"
├─ Service = "UserManagement"
├─ Owner = "Backend-Team"
├─ CostCenter = "Engineering"
└─ Project = "Serverless-Learning"
```

**비용 추적 예시:**

AWS Cost Explorer에서:

```
Filter by tags:
├─ CostCenter = "Engineering" → 이 태그가 붙은 모든 리소스 비용
├─ Environment = "prod" → 프로덕션 환경 비용만
└─ Project = "Serverless-Learning" → 이 프로젝트 비용만
```

---

### 2.7 `custom` - 커스텀 설정

#### 핵심: 왜 `custom`이 필요한가?

**문제:** 환경별로 다른 설정값 관리

```yaml
# ❌ 나쁨 (파일을 매번 수정해야 함)
provider:
  environment:
    LOG_LEVEL: DEBUG          # dev일 때만 맞음
    # prod 배포할 땐? → 파일 수정 필요 😩

# ✅ 좋음 (파일 수정 없음)
custom:
  logLevel:
    dev: DEBUG
    prod: WARN

provider:
  environment:
    LOG_LEVEL: ${self:custom.logLevel.${self:provider.stage}}
    # dev 배포: DEBUG 자동 대입
    # prod 배포: WARN 자동 대입
```

---

#### 예제 1️⃣: 환경별 설정

```yaml
custom:
  logLevel:
    dev: DEBUG
    staging: INFO
    prod: WARN

  apiEndpoint:
    dev: http://localhost:3000
    staging: https://staging-api.example.com
    prod: https://api.example.com

provider:
  environment:
    LOG_LEVEL: ${self:custom.logLevel.${self:provider.stage}}
    API_ENDPOINT: ${self:custom.apiEndpoint.${self:provider.stage}}
```

**배포:**

```bash
serverless deploy --stage dev   # LOG_LEVEL=DEBUG, API_ENDPOINT=http://localhost:3000
serverless deploy --stage prod  # LOG_LEVEL=WARN, API_ENDPOINT=https://api.example.com
```

---

#### 예제 2️⃣: 반복 제거 (한 번 정의, 여러 곳 참조)

```yaml
custom:
  tableName: Users-${self:provider.stage}

provider:
  environment:
    DB_TABLE: ${self:custom.tableName} # 참조 1

resources:
  Resources:
    MyTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:custom.tableName} # 참조 2 (같은 값)
```

---

#### 예제 3️⃣: 플러그인 설정

```yaml
custom:
  dynamodb:
    stages: [dev, test]
    start:
      port: 8000
      inMemory: true
```

→ `serverless dynamodb start`할 때 이 설정 사용

---

#### 정리

| 항목            | 위치                    | 역할                          |
| --------------- | ----------------------- | ----------------------------- |
| **custom**      | `custom:`               | 환경별 값 정의                |
| **environment** | `provider.environment:` | Lambda 환경변수 (custom 참조) |

#### 정리: custom vs provider vs environment

| 항목            | 위치                    | 용도                                  | 예시                       |
| --------------- | ----------------------- | ------------------------------------- | -------------------------- |
| **custom**      | `custom:`               | 플러그인 설정, 환경별 변수, 편의 변수 | `${self:custom.tableName}` |
| **provider**    | `provider:`             | AWS 기본 설정 (런타임, 리전 등)       | `${self:provider.stage}`   |
| **environment** | `provider.environment:` | Lambda 런타임 환경변수                | `process.env.LOG_LEVEL`    |

---

---

#### ⚠️ 중요: `custom`은 로컬 전용이 아닙니다!

```
❌ 잘못된 이해:
custom = 로컬 개발 환경 전용

✅ 올바른 이해:
custom = serverless.yml을 작성할 때
         (배포 과정에서) 사용하는 설정값

배포할 때 custom 참조
  ↓
CloudFormation 템플릿에 값이 치환됨
  ↓
AWS에 배포됨
  ↓
Production에도 값이 반영됨 ✅
```

---

#### 구체적 예시

```yaml
custom:
  # 이 값은 "배포 시" 사용됨
  tableName: Users-${self:provider.stage}
  # dev 배포: "Users-dev" → AWS에 "Users-dev" 생성
  # prod 배포: "Users-prod" → AWS에 "Users-prod" 생성
```

**배포 흐름:**

```
1. 개발자: serverless deploy --stage prod
  ↓
2. Serverless Framework이 custom 참조
   tableName = "Users-prod"
  ↓
3. CloudFormation 템플릿에 치환
   TableName: "Users-prod"
  ↓
4. AWS에 배포
   실제로 "Users-prod" 테이블 생성됨 ✅
```

**결과:**

```
Development (dev):
  - 실제 AWS 리소스: Users-dev 테이블

Production (prod):
  - 실제 AWS 리소스: Users-prod 테이블
  - custom에 정의된 값이 Production에 반영됨!
```

---

#### 다른 예: 환경별 API 엔드포인트

```yaml
custom:
  apiEndpoint:
    dev: http://localhost:3000
    staging: https://staging-api.example.com
    prod: https://api.example.com
```

**배포:**

```bash
# Development 배포
serverless deploy --stage dev
→ API_ENDPOINT = "http://localhost:3000"
→ 개발 환경에만 localhost 엔드포인트 설정

# Production 배포
serverless deploy --stage prod
→ API_ENDPOINT = "https://api.example.com"
→ 실제 운영 API 엔드포인트 설정 ✅
```

**결과:**

```
AWS Production Lambda
  ↓
process.env.API_ENDPOINT = "https://api.example.com"
  ↓
실제 운영 환경의 API로 요청 전송 ✅
```

---

#### 플러그인 설정의 경우 (로컬 전용)

```yaml
custom:
  dynamodb:
    start:
      port: 8000 # ← 이건 로컬용 (serverless dynamodb start)
      inMemory: true
```

**이건 로컬 전용입니다:**

```
serverless dynamodb start
  ↓
custom.dynamodb.start 읽음
  ↓
로컬의 8000 포트에서 DynamoDB 시작
  ↓
AWS에는 배포 안 됨 ❌
```

**정리:**

```
custom의 일부:
├─ 플러그인 설정: 로컬용 (배포되지 않음) ❌
├─ 환경 변수: Production에도 반영됨 ✅
└─ 리소스 이름: Production에도 반영됨 ✅
```

---

**핵심:**

```
custom = "이 프로젝트의 모든 설정을 중앙에서 관리하는 곳"
         + 플러그인 설정 (로컬용)
         + 환경별 변수 (배포 시 AWS에 반영)
         + 리소스 이름 (배포 시 AWS에 반영)

⚠️ 플러그인 설정을 제외한 대부분은
   Production에도 영향을 줍니다!
```

---

### 2.8 `package` - 배포 패키지 설정

```yaml
package:
  # 개별 함수별 패키징 (권장)
  individually: true

  # 모든 함수의 기본 설정
  patterns:
    - "!.git/**"
    - "!.env"
    - "!node_modules/**" # 함수별로 필요한 것만 포함
    - "!.DS_Store"

  # 함수별 세부 설정
functions:
  helloWorld:
    package:
      patterns:
        - handlers/hello.js
        - lib/utils.js
        - node_modules/lodash/**
```

---

## 🔍 심화: 왜 설정을 여러 곳에 중복으로 정의해야 할까?

이건 **CloudFormation의 계층 구조** 때문입니다!

### Serverless의 3가지 설정 계층

```
┌─────────────────────────────┐
│ provider (전역)              │  ← 모든 것에 적용
│ - iam.role.statements       │
│ - environment               │
│ - tags                      │
└──────────────┬──────────────┘
               ↓ (각 함수가 상속)
┌──────────────────────────────────────┐
│ functions.name (함수별)              │  ← 특정 함수만
│ - environment (오버라이드)           │
│ - vpc (이 함수만 VPC)                │
│ - events (이 함수의 트리거)          │
└──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ resources (추가 리소스)              │  ← Lambda 외 다른 것들
│ - DynamoDB, S3, SQS 등              │
└──────────────────────────────────────┘
```

---

### 왜 중복 설정이 필요한가?

#### 예시 1️⃣: 모든 함수에 같은 권한 vs 특정 함수만 다른 권한

```yaml
# provider (모든 함수 공통)
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action: logs:* # 모든 함수가 로깅 가능
          Resource: "*"
        - Effect: Allow
          Action: dynamodb:* # 모든 함수가 DDB 접근 가능
          Resource: "*"

functions:
  # 함수 A: provider의 권한만 사용
  readUser:
    handler: handlers/read.handler
    events:
      - http:
          path: /users
          method: GET
    # 별도 권한 없음 → DynamoDB 읽기 가능 ✅

  # 함수 B: provider + 추가 권한
  deleteUser:
    handler: handlers/delete.handler
    events:
      - http:
          path: /users/{id}
          method: DELETE
    # 추가: S3 삭제 권한만 필요
    # → DynamoDB + S3 모두 가능 ✅

  # 함수 C: provider 권한 필요 없음 (외부 API만)
  callExternalAPI:
    handler: handlers/external.handler
    events:
      - http:
          path: /external
          method: GET
    # 별도 권한 없음 → 외부 API 호출만 ✅
```

**왜 이렇게?**

```
❌ 모든 권한을 provider에 넣으면:
provider:
  iam:
    role:
      statements:
        - Action: logs:*
        - Action: dynamodb:*
        - Action: s3:*
        - Action: rds:*
        - ... (100개의 권한)

결과:
- 모든 함수가 모든 권한 가짐
- 보안 위험 (최소 권한 원칙 위반)
- 한 함수가 해킹되면 모든 권한 노출

✅ 필요한 권한만 함수별로 정의:
- readUser: DynamoDB 읽기만
- deleteUser: DynamoDB + S3만
- callExternalAPI: 외부 API만

결과:
- 최소 권한 원칙 준수 ✅
- 보안 강화 ✅
- 함수별 책임 명확 ✅
```

---

#### 예시 2️⃣: 환경 변수도 계층 구조

```yaml
provider:
  environment:
    # 모든 함수가 공통으로 필요한 설정
    LOG_LEVEL: INFO
    SERVICE_NAME: my-app
    REGION: us-east-1

functions:
  standardFunction:
    handler: handlers/standard.handler
    # environment 없음
    # → LOG_LEVEL=INFO, SERVICE_NAME=my-app, REGION=us-east-1 사용

  debugFunction:
    handler: handlers/debug.handler
    environment:
      LOG_LEVEL: DEBUG # ← provider의 INFO 오버라이드!
    # → LOG_LEVEL=DEBUG, SERVICE_NAME=my-app, REGION=us-east-1 사용

  prodFunction:
    handler: handlers/prod.handler
    environment:
      LOG_LEVEL: ERROR # ← provider의 INFO 오버라이드!
    # → LOG_LEVEL=ERROR, SERVICE_NAME=my-app, REGION=us-east-1 사용
```

**효과:**

```
❌ 중복 없이 (모든 환경변수 function에서 정의):
functions:
  func1:
    environment:
      LOG_LEVEL: INFO
      SERVICE_NAME: my-app
      REGION: us-east-1
  func2:
    environment:
      LOG_LEVEL: DEBUG
      SERVICE_NAME: my-app  # 반복!
      REGION: us-east-1     # 반복!
  func3:
    environment:
      LOG_LEVEL: ERROR
      SERVICE_NAME: my-app  # 반복!
      REGION: us-east-1     # 반복!

결과: 유지보수 어려움, 실수 가능

✅ 계층 구조로 (필요한 것만 오버라이드):
provider:
  environment:
    LOG_LEVEL: INFO          # 한 번만!
    SERVICE_NAME: my-app     # 한 번만!
    REGION: us-east-1        # 한 번만!

functions:
  func1:
    # 상속됨
  func2:
    environment:
      LOG_LEVEL: DEBUG       # 필요한 것만 오버라이드
  func3:
    environment:
      LOG_LEVEL: ERROR       # 필요한 것만 오버라이드

결과: 깔끔하고 유지보수 쉬움
```

---

#### 예시 3️⃣: VPC도 계층 구조

```yaml
provider:
  # 전역: 기본적으로 모든 함수가 VPC 사용 안 함
  # (VPC 지정 안 하면 공개 서브넷에서 실행)

functions:
  # RDS에 접근해야 하는 함수만 VPC
  queryDB:
    handler: handlers/db.handler
    vpc:
      securityGroupIds:
        - sg-12345
      subnetIds:
        - subnet-xxxxx
        - subnet-yyyyy
    # ← 이 함수만 VPC에서 실행

  # S3만 접근하는 함수는 VPC 불필요
  uploadToS3:
    handler: handlers/s3.handler
    # vpc 없음 ← VPC 없이 공개 서브넷에서 실행
    # S3에는 VPC 필요 없음, 오히려 느릴 수 있음
```

**이유:**

```
❌ 모든 함수를 VPC에:
provider:
  vpc:
    securityGroupIds: [sg-12345]
    subnetIds: [subnet-xxxxx]

결과:
- Cold Start 증가 (ENI 할당 시간)
- 모든 함수가 NAT Gateway 통해 나감 (비용)
- 불필요한 VPC 오버헤드

✅ 필요한 함수만 VPC:
functions:
  queryDB:
    vpc: { ... }    # RDS 접근용

  uploadToS3:
    # VPC 없음    # S3 접근용 (VPC 불필요)

결과:
- 성능 최적화
- 비용 절감
- 필요한 것만 설정
```

---

### 설정 우선순위 정리

```
함수 레벨 설정 (가장 높음)
    ↓
provider 레벨 설정 (중간)
    ↓
기본값 (가장 낮음)
```

**구체적 예:**

```yaml
# 1. provider (모두에게 적용)
provider:
  runtime: nodejs18.x
  environment:
    LOG_LEVEL: INFO

# 2. functions (함수별 오버라이드)
functions:
  # 함수 A: provider 설정 그대로 사용
  funcA:
    handler: a.handler
    # runtime: nodejs18.x (상속)
    # LOG_LEVEL: INFO (상속)

  # 함수 B: 일부만 오버라이드
  funcB:
    handler: b.handler
    runtime: python3.9 # ← provider의 nodejs18.x 오버라이드
    environment:
      LOG_LEVEL: DEBUG # ← provider의 INFO 오버라이드

  # 함수 C: 한 번에 오버라이드
  funcC:
    handler: c.handler
    runtime: ruby3.2 # ← 오버라이드
    environment:
      LOG_LEVEL: ERROR # ← 오버라이드
      CUSTOM_VAR: custom-value # ← 추가
```

---

### 실전 패턴: 깔끔하게 설정하기

```yaml
# 공통 설정 (provider)
provider:
  runtime: nodejs18.x
  iam:
    role:
      statements:
        - Effect: Allow
          Action: logs:*
          Resource: "*"
        - Effect: Allow
          Action: dynamodb:Query
          Resource: "arn:aws:dynamodb:*:*:table/Users"

  environment:
    SERVICE: my-app
    LOG_LEVEL: INFO
    REGION: us-east-1

# 함수별 설정 (functions) - 필요한 것만!
functions:
  readAPI:
    handler: handlers/read.handler
    # 공통 설정 그대로 사용
    events:
      - http: { path: /read, method: GET }

  writeAPI:
    handler: handlers/write.handler
    # DynamoDB PutItem 권한 추가 필요
    iam:
      role:
        statements:
          - Effect: Allow
            Action: dynamodb:PutItem
            Resource: "arn:aws:dynamodb:*:*:table/Users"
    events:
      - http: { path: /write, method: POST }

  debugAPI:
    handler: handlers/debug.handler
    # 디버그용으로 로그 상세히
    environment:
      LOG_LEVEL: DEBUG # ← INFO 오버라이드
    events:
      - http: { path: /debug, method: GET }

# 추가 리소스 (resources)
resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: Users
        # ...
```

---

### 핵심 원칙

```
1️⃣ 모든 것에 공통으로 적용
   → provider 섹션

2️⃣ 특정 함수만 다르게
   → functions.name 섹션에서 오버라이드

3️⃣ Lambda 외의 리소스
   → resources 섹션

4️⃣ 설정 값을 한 곳에서 관리
   → custom 섹션에서 참조
```

**이렇게 하면:**

```
✅ 중복 최소화
✅ 유지보수 쉬움
✅ 오버라이드 명확함
✅ 보안 강화 (최소 권한)
✅ 성능 최적화 (필요한 것만)
```

---

## 🧪 파트 3: 첫 실습 (1시간)

### 전제조건 체크

```bash
# Node.js 확인 (14.0 이상)
node --version

# npm 확인
npm --version

# AWS CLI 확인
aws --version

# AWS 자격증명 확인
aws sts get-caller-identity
```

### 새 프로젝트 생성

```bash
# 설치
npm install -g serverless

# 또는 로컬에 설치
npm install --save-dev serverless

# 프로젝트 생성
serverless create --template aws-nodejs18 --path my-first-lambda
cd my-first-lambda
npm install
```

### serverless.yml 분석

생성된 파일을 보면 이렇게 나옴:

```yaml
service: my-first-lambda

provider:
  name: aws
  runtime: nodejs18.x

functions:
  hello:
    handler: handler.hello
    events:
      - http:
          path: hello
          method: get
```

**이게 뭔가?**

- Lambda 함수 1개 생성
- API Gateway로 GET /hello 접근 가능

### 배포

```bash
# dev 환경에 배포 (기본값)
serverless deploy

# prod 환경에 배포
serverless deploy --stage prod

# 특정 리전
serverless deploy --region ap-southeast-2
```

### 배포 결과

```
Deploying my-first-lambda to stage dev (us-east-1)

✔ Service deployed to stack my-first-lambda-dev (4s)

functions:
  hello: my-first-lambda-dev-hello (2.1 kB)

endpoint: GET - https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/hello
```

**이게 생성된 것:**

- CloudFormation 스택: `my-first-lambda-dev`
- Lambda 함수: `my-first-lambda-dev-hello`
- API Gateway: `https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/hello`
- IAM Role: `my-first-lambda-dev-IamRoleLambdaExecution`

### 실제 호출

```bash
# 엔드포인트 호출
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/hello

# 응답
{"message":"Go Serverless v3.0! Your function executed successfully!"}
```

### AWS 콘솔에서 확인

1. **Lambda 콘솔**

   - 함수 보기
   - 트리거 (API Gateway)
   - 실행 역할 (IAM)

2. **API Gateway 콘솔**

   - 리소스 트리 보기
   - 통합 설정 확인

3. **CloudFormation 콘솔**

   - `my-first-lambda-dev` 스택
   - 생성된 리소스 확인
   - 템플릿 JSON 확인 (이게 Serverless가 생성한 것!)

4. **CloudWatch Logs**
   - `/aws/lambda/my-first-lambda-dev-hello` 로그 스트림

### 배포 제거

```bash
serverless remove --stage dev
```

---

## 🎓 Day 1 체크리스트

- [ ] Serverless Framework가 뭐하는지 이해 (CloudFormation 래퍼)
- [ ] serverless.yml의 각 섹션 의미 파악
  - [ ] `service`, `provider`, `functions`, `events`, `resources`
- [ ] AWS 자격증명 설정
- [ ] 첫 Lambda 배포 성공
- [ ] AWS 콘솔에서 생성된 리소스 확인
- [ ] CloudFormation 템플릿(JSON) 확인
- [ ] 배포 제거

---

## 📝 Day 1 정리 노트

여기에 배우면서 이해한 내용 정리:

### 내가 이해한 것:

- ...

### 아직 헷갈리는 것:

- ...

### 다음에 봐야 할 것:

- ...

---

다음: **[Day 2 - Events & 통합 실습](./DAY2-EVENTS-PRACTICE.md)**
