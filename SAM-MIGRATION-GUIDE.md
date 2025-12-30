# SAM 마이그레이션 가이드: Serverless Framework → SAM

> **목표**: Serverless Framework 프로젝트를 AWS SAM으로 완전히 마이그레이션하기

---

## 📊 마이그레이션 단계 개요

```
Phase 1: 이해          Phase 2: 변환          Phase 3: 테스트       Phase 4: 배포
─────────────────  ─────────────────    ─────────────────   ──────────────
serverless.yml     template.yaml        로컬 테스트         AWS 배포
분석 & 매핑        생성 & 수정          검증                검증 & 최적화
```

---

## Phase 1: 기존 serverless.yml 분석

### Step 1.1: 파일 구조 파악

```yaml
# serverless.yml (기존)
service: my-service
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    STAGE: ${self:provider.stage}
    DB_TABLE: users-${self:provider.stage}

functions:
  sayHello:
    handler: handlers/hello.sayHello
    events:
      - http:
          path: say-hello
          method: get

  listUsers:
    handler: handlers/users.listUsers
    events:
      - http:
          path: users
          method: get

resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: users-${self:provider.stage}
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
```

### Step 1.2: 체크리스트 작성

```
[ ] service 이름 확인
[ ] provider 설정 (runtime, region, memory, timeout)
[ ] IAM 권한 (provider.iam.role.statements)
[ ] 환경변수 (provider.environment)
[ ] 함수 목록 및 핸들러
[ ] 이벤트 타입 (http, s3, dynamodb, etc)
[ ] custom 섹션 (커스텀 변수)
[ ] resources 섹션 (CF 리소스)
[ ] plugins 목록
```

---

## Phase 2: SAM template.yaml 생성

### Step 2.1: 기본 구조

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Description: "Migrated from Serverless Framework"

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
  # IAM Role 정의
  # 함수 정의
  # 리소스 정의 (DB, S3 등)

Outputs:
  # 스택 출력값
```

### Step 2.2: Parameters 섹션 생성

**Serverless**:

```yaml
provider:
  stage: ${opt:stage, 'dev'}
```

**SAM**:

```yaml
Parameters:
  Stage:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
    Description: Deployment stage
```

### Step 2.3: Globals 섹션 작성

**Serverless**:

```yaml
provider:
  runtime: nodejs18.x
  timeout: 10
  memorySize: 128
  environment:
    STAGE: ${self:provider.stage}
    SERVICE_NAME: my-service
```

**SAM**:

```yaml
Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 10
    MemorySize: 128
    Environment:
      Variables:
        STAGE: !Ref Stage
        SERVICE_NAME: my-service
```

### Step 2.4: IAM Role 정의

**Serverless**:

```yaml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:GetItem
          Resource: arn:aws:dynamodb:*:*:table/users-*
```

**SAM**:

```yaml
Resources:
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
        - PolicyName: DynamoDBAccess
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:Query
                  - dynamodb:GetItem
                Resource: !Sub "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/users-*"
```

### Step 2.5: 함수 정의

**Serverless**:

```yaml
functions:
  sayHello:
    handler: handlers/hello.sayHello
    timeout: 15 # override
    events:
      - http:
          path: say-hello
          method: get
```

**SAM**:

```yaml
Resources:
  SayHelloFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "say-hello-${Stage}"
      CodeUri: handlers/
      Handler: hello.sayHello
      Role: !GetAtt LambdaExecutionRole.Arn
      Timeout: 15 # override
      Events:
        SayHelloEvent:
          Type: Api
          Properties:
            RestApiId: !Ref MyApi
            Path: /say-hello
            Method: GET
```

### Step 2.6: 이벤트 매핑

#### HTTP 이벤트

**Serverless**:

```yaml
events:
  - http:
      path: users/{id}
      method: get
```

**SAM**:

```yaml
Events:
  GetUserEvent:
    Type: Api
    Properties:
      RestApiId: !Ref MyApi
      Path: /users/{id}
      Method: GET
```

#### S3 이벤트

**Serverless**:

```yaml
events:
  - s3:
      bucket: my-bucket
      event: s3:ObjectCreated:*
      rules:
        - prefix: uploads/
        - suffix: .json
```

**SAM**:

```yaml
Events:
  S3UploadEvent:
    Type: S3
    Properties:
      Bucket: !Ref MyBucket
      Events: s3:ObjectCreated:*
      Filter:
        S3Key:
          Rules:
            - Name: prefix
              Value: uploads/
            - Name: suffix
              Value: .json
```

#### DynamoDB Stream 이벤트

**Serverless**:

```yaml
events:
  - stream:
      type: dynamodb
      arn:
        Fn::GetAtt: [UsersTable, StreamArn]
      batchSize: 100
      startingPosition: LATEST
```

**SAM**:

```yaml
Events:
  DynamoDBStreamEvent:
    Type: DynamoDB
    Properties:
      Stream: !GetAtt UsersTable.StreamArn
      StartingPosition: LATEST
      BatchSize: 100
```

#### CloudWatch Events (Scheduled)

**Serverless**:

```yaml
events:
  - schedule:
      rate: cron(0 0 * * ? *)
      enabled: true
```

**SAM**:

```yaml
Events:
  ScheduledEvent:
    Type: Schedule
    Properties:
      Schedule: cron(0 0 * * ? *)
      Enabled: true
```

### Step 2.7: CloudFormation 리소스 마이그레이션

**Serverless** (resources 섹션):

```yaml
resources:
  Resources:
    UsersTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: users-${self:provider.stage}
        AttributeDefinitions:
          - AttributeName: userId
            AttributeType: S
        KeySchema:
          - AttributeName: userId
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
```

**SAM** (Resources 섹션):

```yaml
Resources:
  UsersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "users-${Stage}"
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
      KeySchema:
        - AttributeName: userId
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST
```

### Step 2.8: Outputs 섹션 추가

**Serverless** (자동 생성):

- Lambda 함수 ARN
- API Gateway 엔드포인트

**SAM** (명시적 정의):

```yaml
Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint
    Value: !Sub "https://${MyApi}.execute-api.${AWS::Region}.amazonaws.com/${Stage}"
    Export:
      Name: !Sub "MyApi-${Stage}-Endpoint"

  SayHelloFunctionArn:
    Description: SayHello Lambda function ARN
    Value: !GetAtt SayHelloFunction.Arn
    Export:
      Name: !Sub "SayHelloFunction-${Stage}-Arn"

  UsersTableName:
    Description: Users DynamoDB table name
    Value: !Ref UsersTable
    Export:
      Name: !Sub "UsersTable-${Stage}-Name"
```

---

## Phase 3: 로컬 테스트

### Step 3.1: SAM 빌드

```bash
# 템플릿과 코드 준비
sam build

# 출력: .aws-sam/build/ 생성
```

### Step 3.2: 로컬 API 실행

```bash
# API Gateway 에뮬레이션 시작 (포트 3000)
sam local start-api --port 3000

# 출력:
# Mounting SayHelloFunction at http://127.0.0.1:3000/say-hello [GET]
# Mounting ListUsersFunction at http://127.0.0.1:3000/users [GET]
```

### Step 3.3: 테스트 케이스 실행

```bash
# 케이스 1: GET 요청
curl http://localhost:3000/say-hello

# 케이스 2: Path 파라미터
curl http://localhost:3000/users/user123

# 케이스 3: POST 요청
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice"}'
```

### Step 3.4: 환경변수 검증

로컬에서 환경변수 확인:

```bash
curl http://localhost:3000/debug

# 응답에서 STAGE, SERVICE_NAME 등 확인
```

### Step 3.5: 로컬 DynamoDB (선택적)

```bash
# 로컬 DynamoDB 시작 (별도 터미널)
docker run -p 8000:8000 amazon/dynamodb-local

# SAM에서 로컬 DynamoDB 사용
sam local start-api \
  --env-vars env.json  # AWS_ENDPOINT_URL=http://host.docker.internal:8000
```

env.json:

```json
{
  "SayHelloFunction": {
    "AWS_ENDPOINT_URL": "http://host.docker.internal:8000"
  }
}
```

---

## 🔄 중요: .env.json vs samconfig.toml 차이

### ⚡ 빠른 정리

| 항목          | `.env.json`                             | `samconfig.toml`              |
| ------------- | --------------------------------------- | ----------------------------- |
| **역할**      | 런타임 환경변수 관리                    | 배포 설정 저장                |
| **적용 범위** | SAM Local 함수 실행                     | CloudFormation 배포           |
| **형식**      | JSON (함수별 분리)                      | TOML (환경별 섹션)            |
| **사용 명령** | `sam local invoke --env-vars .env.json` | `sam deploy --config-env dev` |
| **필수여부**  | SAM Local 테스트 시 필수                | 배포 시 필수                  |

### `.env.json` - 로컬 개발 환경변수

**왜 필요한가?**

- SAM Local은 CloudFormation의 동적 변수 치환을 완벽하게 지원하지 않음
- `template.yaml`의 `Environment.Variables`가 컨테이너에서 제대로 전달되지 않음
- 로컬 테스트 시 명시적으로 환경변수를 제공해야 함

**구조:**

```json
{
  "FunctionName": {
    "ENV_VAR1": "value1",
    "ENV_VAR2": "value2"
  },
  "AnotherFunction": {
    "ENV_VAR1": "different_value"
  }
}
```

**실제 예:**

```json
{
  "ListItemsFunction": {
    "ITEMS_TABLE": "hello-world-items-dev",
    "STAGE": "dev",
    "LOG_LEVEL": "INFO"
  },
  "CreateItemFunction": {
    "ITEMS_TABLE": "hello-world-items-dev",
    "STAGE": "dev",
    "LOG_LEVEL": "INFO"
  }
}
```

**사용:**

```bash
# SAM Local 함수 테스트
sam local invoke ListItemsFunction --env-vars .env.json --event -

# SAM Local API 서버 실행
sam local start-api --env-vars .env.json --port 3000
```

### `samconfig.toml` - 배포 설정 저장소

**왜 필요한가?**

- CloudFormation 배포 시 반복되는 옵션들을 저장
- 환경별(dev/staging/prod) 다른 설정을 효율적으로 관리
- `sam deploy` 명령을 간단하게 함

**구조:**

```toml
[default.deploy.parameters]
# 모든 환경의 기본 설정

[dev.deploy.parameters]
# dev 환경 전용 설정

[prod.deploy.parameters]
# prod 환경 전용 설정
```

**저장 항목:**

```toml
stack_name = "hello-world-sam-dev"           # CloudFormation 스택 이름
region = "us-east-1"                         # 배포 리전
capabilities = "CAPABILITY_NAMED_IAM"        # IAM 권한 허용
parameter_overrides = "Stage=dev"            # template.yaml의 Parameters 전달값
resolve_s3 = true                            # 자동 S3 버킷 생성
confirm_changeset = false                    # 변경사항 자동 승인
```

**사용:**

```bash
# samconfig.toml의 설정으로 배포
sam deploy --config-env dev

# 또는 기본값 사용
sam deploy
```

---

## Phase 4: AWS 배포

### Step 4.1: samconfig.toml 생성

처음 배포:

```bash
sam deploy --guided \
  --parameter-overrides \
    Stage=dev

# 대화형 질문:
# - Stack Name: my-service-dev
# - AWS Region: us-east-1
# - Confirm changes before deploy: Y
# - Allow SAM CLI to create IAM roles: Y
# - Save configuration: Y
```

생성된 samconfig.toml:

```toml
[default]
[default.deploy]
region = "us-east-1"
stack_name = "my-service-dev"
confirm_changeset = true
capabilities = "CAPABILITY_IAM"
s3_bucket = "aws-sam-cli-artifacts-123456789-us-east-1"
s3_prefix = "my-service-dev"
```

### Step 4.2: 배포 환경 구성

#### 개발 환경

```toml
[dev]
[dev.deploy]
region = "us-east-1"
stack_name = "my-service-dev"
parameter_overrides = "Stage=dev"
s3_prefix = "my-service-dev"
```

#### 프로덕션 환경

```toml
[prod]
[prod.deploy]
region = "us-east-1"
stack_name = "my-service-prod"
parameter_overrides = "Stage=prod"
s3_prefix = "my-service-prod"
```

### Step 4.3: 배포 실행

```bash
# 개발 환경
sam deploy -t dev

# 프로덕션 환경
sam deploy -t prod

# 또는 직접 명령
sam deploy --stack-name my-service-dev --parameter-overrides Stage=dev
```

### Step 4.4: 배포 검증

```bash
# CloudFormation 스택 확인
aws cloudformation describe-stacks \
  --stack-name my-service-dev \
  --query 'Stacks[0].StackStatus'

# Outputs 확인
aws cloudformation describe-stacks \
  --stack-name my-service-dev \
  --query 'Stacks[0].Outputs'

# Lambda 함수 확인
aws lambda get-function \
  --function-name say-hello-dev \
  --query 'Configuration.[FunctionName,Runtime,Handler]'
```

### Step 4.5: API 엔드포인트 테스트

```bash
# Outputs에서 API 엔드포인트 조회
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name my-service-dev \
  --query 'Stacks[0].Outputs[0].OutputValue' \
  --output text)

# API 테스트
curl $API_ENDPOINT/say-hello
curl $API_ENDPOINT/users
```

---

## 🔄 공통 마이그레이션 패턴

### 패턴 1: 커스텀 변수 (custom 섹션)

**Serverless**:

```yaml
custom:
  tableName: users-${self:provider.stage}
  bucketName: files-${self:provider.stage}

provider:
  environment:
    USERS_TABLE: ${self:custom.tableName}
    FILES_BUCKET: ${self:custom.bucketName}
```

**SAM**:

```yaml
Parameters:
  Stage:
    Type: String
    Default: dev

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Environment:
        Variables:
          USERS_TABLE: !Sub "users-${Stage}"
          FILES_BUCKET: !Sub "files-${Stage}"
```

### 패턴 2: 조건부 리소스

**Serverless** (플러그인 필요):

```yaml
custom:
  pythonRequirements:
    dockerizePip: true

plugins:
  - serverless-python-requirements
```

**SAM** (Metadata 섹션):

```yaml
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Metadata:
      BuildMethod: python3.9
```

### 패턴 3: 레이어 (공유 코드)

**Serverless**:

```yaml
functions:
  myFunction:
    handler: handler.main
    layers:
      - arn:aws:lambda:us-east-1:123456:layer:my-layer:1
```

**SAM**:

```yaml
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Layers:
        - arn:aws:lambda:us-east-1:123456:layer:my-layer:1
```

또는 SAM에서 생성:

```yaml
Resources:
  MyLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: my-layer
      ContentUri: layers/
      CompatibleRuntimes:
        - nodejs18.x

  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Layers:
        - !Ref MyLayer
```

---

## 📋 마이그레이션 체크리스트

### 사전 준비

- [ ] Serverless 프로젝트 백업 (git branch)
- [ ] 배포 역사 문서화 (Stage, Parameters)
- [ ] 현재 Lambda 함수 목록 확인
- [ ] 현재 IAM 권한 분석

### Phase 1: 분석

- [ ] serverless.yml 구조 파악
- [ ] 함수 목록 및 핸들러 정리
- [ ] 이벤트 타입 분류
- [ ] CloudFormation 리소스 목록화
- [ ] IAM 권한 정리

### Phase 2: 변환

- [ ] template.yaml 골격 생성
- [ ] Parameters 섹션 작성
- [ ] Globals 섹션 작성
- [ ] IAM Role 정의
- [ ] 함수 모두 SAM으로 변환
- [ ] 이벤트 모두 매핑
- [ ] 리소스 모두 복사
- [ ] Outputs 섹션 추가

### Phase 3: 로컬 테스트

- [ ] `sam build` 성공
- [ ] `sam local start-api` 시작 확인
- [ ] 모든 HTTP 엔드포인트 테스트
- [ ] 환경변수 확인
- [ ] 에러 케이스 테스트

### Phase 4: AWS 배포

- [ ] samconfig.toml 생성
- [ ] 개발 환경 배포
- [ ] CloudFormation 스택 확인
- [ ] API 엔드포인트 테스트
- [ ] CloudWatch Logs 확인
- [ ] 성능 비교 (Serverless vs SAM)

---

## 🆘 문제 해결

### 문제: `sam build` 실패

```
Error: Unable to build template
```

**해결**:

```bash
# 1. SAM CLI 버전 확인
sam --version

# 2. Python 의존성 확인
cd handlers/
pip install -r requirements.txt

# 3. CodeUri 경로 확인
# template.yaml에서 CodeUri가 정확한지 확인
```

### 문제: 로컬 테스트 중 DynamoDB 연결 실패

```
ResourceNotFoundException: Requested resource not found
```

**해결**:

```bash
# 1. 로컬 DynamoDB 시작 (별도 터미널)
docker run -p 8000:8000 amazon/dynamodb-local

# 2. env.json 생성
cat > env.json << EOF
{
  "MyFunction": {
    "AWS_ENDPOINT_URL": "http://host.docker.internal:8000"
  }
}
EOF

# 3. SAM 실행
sam local start-api --env-vars env.json
```

### 문제: 배포 후 Lambda 권한 부족

```
User: arn:aws:iam::123456:user/dev is not authorized
```

**해결**:

```bash
# 1. IAM 정책 확인
aws iam get-user-policy --user-name dev --policy-name ...

# 2. 필요 권한:
# - cloudformation:*
# - lambda:*
# - iam:CreateRole, iam:PutRolePolicy
# - s3:*
# - apigateway:*
# - logs:*
```

---

## 📚 참고자료

- [SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/)
- [Serverless to SAM Migration](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [CloudFormation Resource Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html)

---

## 🎯 다음 단계

1. ✅ 기존 Serverless 프로젝트 1개 SAM으로 변환
2. ✅ 로컬 및 AWS 배포 테스트
3. ✅ 성능, 배포 시간, 비용 비교
4. 👉 **다음**: CI/CD 파이프라인 (GitHub Actions)
