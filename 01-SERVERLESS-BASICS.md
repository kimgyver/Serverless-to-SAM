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

**학습 관점:**

- 먼저: Serverless Framework (이해하기 쉬움)
- 나중: SAM으로 전환 (더 명확함)

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
  stage: ${opt:stage, 'dev'} # dev/staging/prod (배포 시 지정 가능)

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

  # 환경 변수 (모든 Lambda가 접근 가능)
  environment:
    DB_TABLE: Users-${self:provider.stage}
    LOG_LEVEL: INFO

  # 태그 (모든 리소스에 적용)
  tags:
    Environment: ${self:provider.stage}
    Service: MyAPI
    Owner: DataTeam

  # 배포 설정
  stackTags:
    CostCenter: Engineering

  # API Gateway 캐싱 등 고급 설정
  apiGateway:
    minimumCompressionSize: 1024
```

**핵심:**

- `iam.role.statements` = 모든 Lambda 함수가 할 수 있는 작업
- `environment` = 모든 Lambda가 공유하는 환경변수
- `stage`로 환경별 리소스 분리

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

**배포 시 동작:**

```
serverless deploy
  ↓
plugins 로드
  ↓
각 플러그인의 hooks 실행 (pre-deploy, post-deploy)
  ↓
배포 실행
```

---

### 2.7 `custom` - 커스텀 설정 & 스크립트

```yaml
custom:
  # 로컬 DynamoDB 포트
  dynamodb:
    stages:
      - dev
      - test
    start:
      port: 8000
      inMemory: true

  # 환경별 로그 레벨
  logLevel:
    dev: DEBUG
    staging: INFO
    prod: WARN

  # 커스텀 변수
  tableName: Users-${self:provider.stage}
  s3Bucket: uploads-${self:provider.stage}

  # 커스텀 스크립트 (배포 전/후)
  hooks:
    before:package:
      - npm run build
    after:deploy:
      - node ./scripts/post-deploy.js
```

**사용:**

```javascript
// serverless.yml 안에서
${self:custom.tableName}         // "Users-dev"
${self:custom.logLevel.${self:provider.stage}}  // "DEBUG" (dev일 때)
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
