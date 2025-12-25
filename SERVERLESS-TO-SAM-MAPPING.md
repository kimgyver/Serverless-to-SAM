# 🔄 Serverless Framework vs SAM 비교 & 마이그레이션 맵핑

## 🎯 목표

Serverless Framework의 각 개념이 **SAM에서 어떻게 변환되는지** 정확히 이해

---

## 📊 전체 맵핑 테이블

| 개념        | Serverless Framework | SAM                                                              | 변환 난이도   |
| ----------- | -------------------- | ---------------------------------------------------------------- | ------------- |
| 프로젝트    | service: my-api      | Template.AWSTemplateFormatVersion                                | ⭐ 매우 쉬움  |
| AWS 설정    | provider:            | Resources.AWS::IAM::Role                                         | ⭐⭐ 쉬움     |
| Lambda 함수 | functions.name       | Resources.FunctionName (AWS::Serverless::Function)               | ⭐ 매우 쉬움  |
| HTTP 트리거 | events.http          | Resources.Api (AWS::Serverless::Api)                             | ⭐⭐ 쉬움     |
| S3 트리거   | events.s3            | Resources.AWS::S3::Bucket + Properties.NotificationConfiguration | ⭐⭐⭐ 어려움 |
| IAM 권한    | provider.iam         | Resources.FunctionRole (AWS::IAM::Role)                          | ⭐⭐⭐ 어려움 |
| 환경변수    | environment          | Resources.FunctionName.Properties.Environment                    | ⭐ 매우 쉬움  |
| 추가 리소스 | resources            | Resources (네이티브)                                             | ⭐ 매우 쉬움  |

---

## 🔍 섹션별 상세 맵핑

### 1️⃣ service & provider

#### Serverless Framework

```yaml
service: my-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
```

#### SAM

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 128
    Environment:
      Variables:
        STAGE: !Ref StageName

Parameters:
  StageName:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  # 함수들은 여기
```

**주요 차이:**

- Serverless: service 이름이 스택 이름
- SAM: 명시적으로 Template 정의, stage는 Parameter
- Serverless: stage가 자동으로 스택에 포함
- SAM: 모든 stage를 명시적으로 구성

---

## 🔑 핵심: Parameters와 Globals

### **Parameters** - 배포 시 입력값

**의미**: 배포할 때 지정할 수 있는 **변수들**

```yaml
Parameters:
  StageName:
    Type: String
    Default: dev # 기본값
    AllowedValues: [dev, staging, prod] # 가능한 값
    Description: "The stage name"

  Environment:
    Type: String
    Default: development

  EnableXRayTracing:
    Type: String
    Default: "false"
    AllowedValues: ["true", "false"]
```

**사용**:

```bash
# 배포 시점에 값 지정
sam deploy --parameter-overrides StageName=prod Environment=production

# 또는 SAM CLI 대화식
sam deploy --guided  # 각 Parameter 입력 받음
```

**템플릿 내에서 참조**:

```yaml
Resources:
  MyFunction:
    Properties:
      Environment:
        Variables:
          STAGE: !Ref StageName # dev, staging, prod 중 하나
          ENV: !Ref Environment
```

---

### **Globals** - 모든 함수의 공통 설정

**의미**: 모든 Lambda 함수가 **자동으로 상속**하는 설정

```yaml
Globals:
  Function:
    Runtime: nodejs18.x # 모든 함수가 nodejs18.x
    Timeout: 30 # 모든 함수가 30초
    MemorySize: 256 # 모든 함수가 256MB
    Environment:
      Variables:
        STAGE: !Ref StageName
        LOG_LEVEL: INFO
    Tracing: Active # X-Ray 추적 활성화
    Layers:
      - !Ref SharedLayer
```

**효과**:

```yaml
# Globals 없이 (매번 반복)
Resources:
  Function1:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs18.x
      Timeout: 30
      MemorySize: 256

  Function2:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs18.x
      Timeout: 30
      MemorySize: 256

# Globals 있으면 (한번만)
Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 256

Resources:
  Function1:
    Type: AWS::Serverless::Function
    Properties: {}  # Globals에서 상속

  Function2:
    Type: AWS::Serverless::Function
    Properties: {}  # Globals에서 상속
```

---

### **Serverless Framework vs SAM: Parameters & Globals**

| 기능                    | Serverless            | SAM                                                      |
| ----------------------- | --------------------- | -------------------------------------------------------- |
| **환경별 설정**         | `${opt:stage, 'dev'}` | `Parameters`                                             |
| **모든 함수 공통 설정** | `provider:` 섹션      | `Globals:`                                               |
| **함수 특정 설정**      | `functions.name.`     | `Resources.FunctionName.Properties` (Globals 오버라이드) |
| **배포 시 입력**        | CLI 옵션              | Parameter-overrides                                      |

**예**:

**Serverless Framework**:

```yaml
provider:
  runtime: nodejs18.x
  timeout: 30
  stage: ${opt:stage, 'dev'}
  environment:
    STAGE: ${self:provider.stage}

functions:
  func1:
    handler: h1.handler
    timeout: 60 # 이 함수만 60초

  func2:
    handler: h2.handler
    # timeout 안 정의하면 provider의 30초 상속
```

**SAM**:

```yaml
Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    Environment:
      Variables:
        STAGE: !Ref StageName

Parameters:
  StageName:
    Type: String
    Default: dev

Resources:
  Func1:
    Type: AWS::Serverless::Function
    Properties:
      Timeout: 60 # 이 함수만 60초 (Globals 오버라이드)

  Func2:
    Type: AWS::Serverless::Function
    Properties: {} # Globals의 30초 상속
```

---

### **실전 예제**

```yaml
# Globals 설정 (모든 함수가 받음)
Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 256
    Tracing: Active
    Environment:
      Variables:
        STAGE: !Ref StageName
        LOG_LEVEL: !Ref LogLevel
        REGION: !Ref AWS::Region
    Layers:
      - arn:aws:lambda:us-east-1:123456789012:layer:CommonLibs:1

# Parameters (배포 시 지정)
Parameters:
  StageName:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
    Description: Deployment stage

  LogLevel:
    Type: String
    Default: INFO
    AllowedValues: [DEBUG, INFO, WARN, ERROR]

  EnableMetrics:
    Type: String
    Default: "false"
    AllowedValues: ["true", "false"]

Resources:
  # 기본: Globals 모두 상속
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/api/
      Handler: index.handler

  # 특정 설정 오버라이드
  HighMemoryFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/heavy/
      Handler: index.handler
      MemorySize: 1024 # Globals의 256 대신 1024 사용
      Timeout: 300 # Globals의 30 대신 300 사용

  # 추가 환경변수
  DatabaseFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/db/
      Handler: index.handler
      Environment:
        Variables:
          DB_HOST: !Ref DatabaseHost # Globals 변수에 추가
          DB_PORT: "5432"
```

---

### **Parameters 유형 (Type)**

| 유형                               | 예                    | 용도                       |
| ---------------------------------- | --------------------- | -------------------------- |
| `String`                           | "dev", "my-bucket"    | 일반 문자열                |
| `Number`                           | 123, 3600             | 숫자 (메모리, 타임아웃 등) |
| `CommaDelimitedList`               | "a,b,c"               | 쉼표 구분 목록             |
| `AWS::EC2::AvailabilityZone::Name` | "us-east-1a"          | AZ 선택                    |
| `AWS::EC2::Instance::Id`           | "i-1234567890abcdef0" | 인스턴스 ID                |

---

### **자주 하는 실수**

❌ **틀림**:

```yaml
# Parameters 정의 안 하고 바로 사용
Resources:
  MyFunction:
    Properties:
      Environment:
        Variables:
          STAGE: dev # 문자열 (배포마다 같음)
```

✅ **맞음**:

```yaml
Parameters:
  StageName:
    Type: String
    Default: dev

Globals:
  Function:
    Environment:
      Variables:
        STAGE: !Ref StageName # Parameter 참조 (배포마다 다를 수 있음)

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties: {} # Globals에서 상속
```

---

### 2️⃣ Lambda 함수

#### Serverless Framework

```yaml
functions:
  helloWorld:
    handler: handlers/hello.helloHandler
    memorySize: 256
    timeout: 30
    environment:
      LOG_LEVEL: DEBUG
    events:
      - http:
          path: hello/{name}
          method: GET
```

#### SAM

```yaml
Resources:
  HelloWorldFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-api-dev-helloWorld
      CodeUri: handlers/
      Handler: hello.helloHandler
      Runtime: nodejs18.x
      MemorySize: 256
      Timeout: 30
      Environment:
        Variables:
          LOG_LEVEL: DEBUG
          STAGE: !Ref StageName
      Role: !GetAtt HelloWorldFunctionRole.Arn
      Events:
        HelloEvent:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /hello/{name}
            Method: GET
```

**주요 차이:**

- Serverless: 함수명이 자동으로 리소스명 생성
- SAM: 명시적으로 FunctionName 지정 필요
- Serverless: events에 직접 정의
- SAM: Resources.Events에 Type과 Properties 명시

---

### 3️⃣ API Gateway

#### Serverless Framework

```yaml
functions:
  sayHello:
    events:
      - http:
          path: hello
          method: get
          cors: true

  createItem:
    events:
      - http:
          path: items
          method: post
```

#### SAM

```yaml
Resources:
  Api:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref StageName
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE'"
        AllowHeaders: "'Content-Type'"
        AllowOrigin: "'*'"

  SayHelloFunction:
    Type: AWS::Serverless::Function
    Properties:
      ...
      Events:
        HelloEvent:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /hello
            Method: GET

  CreateItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      ...
      Events:
        CreateEvent:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /items
            Method: POST
```

**주요 차이:**

- Serverless: API 게이트웨이가 자동으로 생성
- SAM: 명시적으로 Api 리소스 정의
- Serverless: 함수마다 cors 설정 가능
- SAM: Api 레벨에서 한번에 설정

---

### 4️⃣ S3 이벤트 트리거

#### Serverless Framework

```yaml
functions:
  processUpload:
    handler: handlers/s3.processUploadHandler
    events:
      - s3:
          bucket: uploads-${self:provider.stage}
          event: s3:ObjectCreated:*
          rules:
            - prefix: uploads/
            - suffix: .json

resources:
  Resources:
    UploadBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: uploads-${self:provider.stage}
```

#### SAM

```yaml
Resources:
  UploadBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "uploads-${StageName}"
      NotificationConfiguration:
        LambdaConfigurations:
          - Event: s3:ObjectCreated:*
            Function: !GetAtt ProcessUploadFunction.Arn
            Filter:
              Key:
                FilterRules:
                  - Name: prefix
                    Value: uploads/
                  - Name: suffix
                    Value: .json

  ProcessUploadFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/
      Handler: s3.processUploadHandler
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref UploadBucket

  ProcessUploadFunctionPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref ProcessUploadFunction
      Action: lambda:InvokeFunction
      Principal: s3.amazonaws.com
      SourceArn: !GetAtt UploadBucket.Arn
```

**주요 차이:**

- Serverless: events에 간단히 정의
- SAM: S3 버킷 NotificationConfiguration + Lambda Permission 명시 필요
- Serverless: 권한이 자동으로 처리됨
- SAM: Lambda가 S3의 이벤트를 받을 권한 명시 필요 (🔴 중요!)

---

### 5️⃣ IAM 권한

#### Serverless Framework

```yaml
provider:
  iam:
    role:
      name: MyServiceRole-${self:provider.stage}
      statements:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
          Resource: !Sub "${UploadBucket.Arn}/*"
        - Effect: Allow
          Action:
            - dynamodb:Query
            - dynamodb:GetItem
          Resource: arn:aws:dynamodb:*:*:table/Users
```

#### SAM

```yaml
Resources:
  MyFunctionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: MyServiceRole-${StageName}
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: S3AndDynamoAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                Resource: !Sub '${UploadBucket.Arn}/*'
              - Effect: Allow
                Action:
                  - dynamodb:Query
                  - dynamodb:GetItem
                Resource: !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/Users'

  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      ...
      Role: !GetAtt MyFunctionRole.Arn
```

**또는 SAM Policies 사용 (더 간단):**

```yaml
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    ...
    Policies:
      - S3CrudPolicy:
          BucketName: !Ref UploadBucket
      - DynamoDBCrudPolicy:
          TableName: Users
```

**주요 차이:**

- Serverless: statements만 정의하면 role 자동 생성
- SAM: role을 명시적으로 정의해야 함
- SAM: AssumeRolePolicyDocument 필수 (Lambda가 이 role 사용 허용)
- SAM: SAM Policies로 간단히 정의 가능

---

### 6️⃣ 환경 변수

#### Serverless Framework

```yaml
provider:
  environment:
    STAGE: ${self:provider.stage}
    DB_TABLE: Users-${self:provider.stage}
    REGION: ${self:provider.region}

functions:
  myFunc:
    environment:
      LOG_LEVEL: DEBUG # provider 환경변수 오버라이드
```

#### SAM

```yaml
Parameters:
  StageName:
    Type: String
    Default: dev

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Environment:
        Variables:
          STAGE: !Ref StageName
          DB_TABLE: !Sub "Users-${StageName}"
          REGION: !Ref AWS::Region
          LOG_LEVEL: DEBUG
```

**주요 차이:**

- Serverless: ${} 문법으로 변수 치환
- SAM: !Ref, !Sub 등 CloudFormation 함수 사용
- Serverless: provider와 function 레벨 분리
- SAM: 각 function에 명시적으로 정의

---

### 7️⃣ 추가 리소스 (DynamoDB, SQS 등)

#### Serverless Framework

```yaml
resources:
  Resources:
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

  Outputs:
    UsersTableName:
      Value: !Ref UsersTable
```

#### SAM

```yaml
Resources:
  UsersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "Users-${StageName}"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
      KeySchema:
        - AttributeName: userId
          KeyType: HASH

Outputs:
  UsersTableName:
    Value: !Ref UsersTable
    Description: DynamoDB Table Name
```

**주요 차이:**

- 문법이 거의 동일
- Serverless: 별도 resources 섹션
- SAM: 모든 것이 Resources에 통합

---

## 🎯 마이그레이션 단계별 가이드

### Phase 1️⃣: 기본 구조 변환 (1-2시간)

```
Serverless serverless.yml
├─ service → AWSTemplateFormatVersion + Transform
├─ provider → Parameters + Globals + IAM Role
└─ functions → Resources (AWS::Serverless::Function)
```

### Phase 2️⃣: 이벤트 변환 (2-3시간)

```
Serverless events
├─ http → Api (AWS::Serverless::Api) + Events
├─ s3 → S3::Bucket NotificationConfiguration + Permission
├─ sqs → AWS::SQS::Queue + Event Source Mapping
└─ schedule → AWS::Events::Rule
```

### Phase 3️⃣: IAM 권한 상세화 (2-3시간)

```
권한 명시화
├─ Role 정의 (AssumeRolePolicyDocument 필수)
├─ 각 statement 검토
└─ SAM Policies 적용 (또는 수동 IAM Policy)
```

### Phase 4️⃣: 리소스 추가 (1-2시간)

```
DynamoDB, SQS, S3, etc
├─ Resources 섹션으로 이동
├─ 모든 참조 업데이트 (!Ref, !GetAtt)
└─ Outputs 정의
```

### Phase 5️⃣: 테스트 (2-3시간)

```
테스트 및 검증
├─ sam local start-api (로컬)
├─ sam build && sam deploy (AWS)
├─ 배포된 리소스 확인
└─ 기존과 동일한 동작 검증
```

---

## 📋 마이그레이션 체크리스트

### 기본 구조

- [ ] template.yaml 생성
- [ ] AWSTemplateFormatVersion 및 Transform 정의
- [ ] Parameters로 stage 정의

### Lambda 함수

- [ ] 각 함수를 AWS::Serverless::Function으로 변환
- [ ] CodeUri, Handler, Runtime 설정
- [ ] 환경변수 정의
- [ ] 메모리, 타임아웃 설정

### 이벤트 (트리거)

- [ ] HTTP 이벤트 → Api 리소스로 변환
- [ ] S3 이벤트 → NotificationConfiguration 추가
- [ ] SQS, Schedule 등 변환

### IAM 권한

- [ ] Role 리소스 생성
- [ ] AssumeRolePolicyDocument 정의
- [ ] Policy statements 검토 및 명시화
- [ ] Lambda 함수에 Role 연결

### 추가 리소스

- [ ] 모든 resources 항목 유지
- [ ] !Ref, !GetAtt 문법 유지
- [ ] Outputs 정의

### 테스트

- [ ] 로컬 테스트 성공
- [ ] AWS 배포 성공
- [ ] 동일 기능 동작 확인

---

## 🔥 주의사항

### 1️⃣ S3 이벤트 트리거

- ❌ **틀렸음**: events에만 정의
- ✅ **맞음**: S3::Bucket의 NotificationConfiguration + Lambda Permission 모두 필요

### 2️⃣ IAM 권한

- ❌ **틀렸음**: statements만 정의
- ✅ **맞음**: AssumeRolePolicyDocument 필수 (Lambda가 role 사용 가능하도록)

### 3️⃣ API Gateway

- ❌ **틀렸음**: 각 함수에 따로 API 정의
- ✅ **맞음**: 하나의 Api 리소스로 통합, 각 함수는 Event로 연결

### 4️⃣ 환경변수

- ❌ **틀렸음**: Serverless 문법 (${self:provider.stage})
- ✅ **맞음**: CloudFormation 문법 (!Ref, !Sub)

---

## 🚀 예제: 실제 변환

### Before (Serverless)

```yaml
service: my-api

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}
  iam:
    role:
      statements:
        - Effect: Allow
          Action: s3:*
          Resource: "*"

functions:
  helloWorld:
    handler: handlers/hello.handler
    events:
      - http:
          path: hello
          method: get
          cors: true

resources:
  Resources:
    MyBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: my-bucket-${self:provider.stage}
```

### After (SAM)

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Parameters:
  StageName:
    Type: String
    Default: dev

Resources:
  # API Gateway
  Api:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref StageName
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE'"
        AllowOrigin: "'*'"

  # IAM Role
  HelloWorldFunctionRole:
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
        - PolicyName: S3Access
          PolicyDocument:
            Version: "2012-10-17"
            Statement:
              - Effect: Allow
                Action: s3:*
                Resource: "*"

  # Lambda Function
  HelloWorldFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/
      Handler: hello.handler
      Runtime: nodejs18.x
      Role: !GetAtt HelloWorldFunctionRole.Arn
      Events:
        HelloEvent:
          Type: Api
          Properties:
            RestApiId: !Ref Api
            Path: /hello
            Method: GET

  # S3 Bucket
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "my-bucket-${StageName}"

Outputs:
  ApiEndpoint:
    Value: !Sub "https://${Api}.execute-api.${AWS::Region}.amazonaws.com/${StageName}"
  BucketName:
    Value: !Ref MyBucket
```

---

## 📚 더 학습할 것

- SAM Policy Templates (자주 사용되는 권한 세트)
- SAM Connectors (리소스 간 권한 자동 설정)
- SAM 로컬 테스트 (sam local start-api)
- SAM build & deploy 과정

---

**다음: [SAM으로 변환된 예제들]을 보며 학습 계속!** 🚀
