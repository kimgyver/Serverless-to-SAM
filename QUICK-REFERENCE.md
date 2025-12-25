# 📝 Day 1-2 빠른 참고 (Quick Reference)

## 🎯 한눈에 보는 Serverless Framework

### serverless.yml 구조

```yaml
service: my-service # 프로젝트명

provider: # AWS 기본 설정
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'} # 배포 시점 stage 지정

  iam: # 모든 Lambda의 기본 권한
    role:
      statements:
        - Effect: Allow
          Action: [s3:*, logs:*]
          Resource: "*"

  environment: # 모든 Lambda의 환경변수
    STAGE: ${self:provider.stage}
    BUCKET: !Ref MyBucket

functions: # Lambda 함수들
  myFunction:
    handler: handlers/index.handler
    description: "Function description"
    memorySize: 256
    timeout: 30

    environment: # 함수별 환경변수 (오버라이드)
      LOG_LEVEL: DEBUG

    events: # 트리거들
      - http: GET /path
      - s3:
          bucket: my-bucket
          event: s3:ObjectCreated:*

resources: # 추가 AWS 리소스 (CloudFormation)
  Resources:
    MyBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: my-bucket-${self:provider.stage}

  Outputs: # 배포 후 출력 정보
    BucketName:
      Value: !Ref MyBucket

plugins: # Serverless 플러그인
  - serverless-offline # 로컬 테스트
```

---

## 🔑 핵심 개념 5가지

### 1️⃣ Service = CloudFormation 스택

```
service: my-api
배포 명령: serverless deploy --stage prod
실제 CF 스택명: my-api-prod
```

### 2️⃣ Provider = AWS 기본 설정

```yaml
provider:
  iam.role.statements       # 모든 함수가 공유
  environment              # 모든 함수가 접근
  region, runtime, stage   # 배포 기본값
```

### 3️⃣ Functions = Lambda 배치

```yaml
functions:
  funcA:
    handler: path.to.function
    events: # 언제 실행될지
      - http: GET /path # API Gateway
      - s3: { ... } # S3 이벤트
      - schedule: ... # CloudWatch
```

### 4️⃣ Events = 트리거 방식

| 이벤트   | 타입   | 응답           |
| -------- | ------ | -------------- |
| http     | 동기   | HTTP 응답 필요 |
| s3       | 비동기 | 응답 불필요    |
| schedule | 비동기 | 응답 불필요    |
| sqs      | 비동기 | 응답 불필요    |

### 5️⃣ Resources = CloudFormation 리소스

```yaml
resources:
  Resources:
    MyTable: # CloudFormation 리소스 정의
      Type: AWS::DynamoDB::Table
      Properties: { ... }

  Outputs: # 배포 후 정보 출력
    TableName:
      Value: !Ref MyTable
```

---

## 🚀 배포 명령어

```bash
# 기본 배포 (dev 환경)
serverless deploy

# 특정 stage
serverless deploy --stage prod

# 특정 리전
serverless deploy --region ap-southeast-2

# 특정 함수만 (빠름)
serverless deploy function -f myFunction

# 상세 로그
serverless deploy -v

# 배포 제거
serverless remove --stage prod

# 배포된 정보 확인
serverless info
```

---

## 📦 Lambda Handler 기본 형식

```javascript
// exports.functionName = handler
exports.myHandler = async (event, context, callback) => {
  // event: 트리거에서 온 입력
  // context: Lambda 메타정보 (requestId, functionName, etc)
  // callback: (error, result) - async 쓸 때는 생략 가능

  return {
    statusCode: 200,        // API Gateway일 때 필수
    headers: {...},
    body: JSON.stringify({...})
  };
};
```

### 이벤트 타입별 형식

```javascript
// API Gateway 이벤트
event = {
  httpMethod: "GET",
  path: "/hello/world",
  pathParameters: { name: "world" },
  queryStringParameters: { filter: "active" },
  headers: {...},
  body: JSON.stringify({...})  // String!
};

// S3 이벤트
event = {
  Records: [
    {
      s3: {
        bucket: { name: "my-bucket" },
        object: { key: "folder/file.json" }
      },
      eventName: "s3:ObjectCreated:Put"
    }
  ]
};

// CloudWatch Events (스케줄)
event = {
  version: "0",
  id: "xxx",
  time: "2024-01-01T12:00:00Z"
};

// SQS 이벤트
event = {
  Records: [
    {
      messageId: "xxx",
      body: "message content",  // String!
      attributes: {...}
    }
  ]
};
```

---

## 🔐 IAM 권한 설정

### provider 레벨 (모든 함수)

```yaml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action: [s3:GetObject, s3:PutObject]
          Resource: "arn:aws:s3:::bucket-name/*"
```

### 함수 레벨 (특정 함수만)

```yaml
functions:
  myFunc:
    iamRoleStatements:
      - Effect: Allow
        Action: [dynamodb:Query]
        Resource: "arn:aws:dynamodb:*:*:table/MyTable"
```

### resources 섹션

```yaml
resources:
  Resources:
    MyPolicy:
      Type: AWS::IAM::Policy
      Properties:
        PolicyDocument:
          Statement:
            - Effect: Allow
              Action: [...]
              Resource: [...]
        Roles:
          - Ref: IamRoleLambdaExecution # Serverless 자동 생성 role
```

---

## 🌍 환경별 설정

### 환경변수 (배포 후 변경 불가)

```yaml
provider:
  environment:
    DB_HOST: ${self:custom.db.${self:provider.stage}}
    LOG_LEVEL: ${self:custom.logLevel.${self:provider.stage}}

custom:
  db:
    dev: localhost:5432
    prod: prod-db.example.com
  logLevel:
    dev: DEBUG
    prod: WARN
```

### Parameters (배포 시 입력)

```yaml
params:
  prod:
    minLogLevel: WARN
    region: us-east-1
  au-prod:
    minLogLevel: INFO
    region: ap-southeast-2
```

---

## 🔧 SAM 특별 섹션: Parameters & Globals

### Parameters - 배포 시 입력값

```yaml
Parameters:
  StageName:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
    Description: "The deployment stage"

  LogLevel:
    Type: String
    Default: INFO
    AllowedValues: [DEBUG, INFO, WARN, ERROR]
```

**배포 시 사용**:

```bash
sam deploy --parameter-overrides StageName=prod LogLevel=WARN
```

### Globals - 모든 함수의 공통 설정

```yaml
Globals:
  Function:
    Runtime: nodejs18.x # 모든 함수가 상속
    Timeout: 30
    MemorySize: 256
    Tracing: Active # X-Ray 추적
    Environment:
      Variables:
        STAGE: !Ref StageName # Parameter 참조
        LOG_LEVEL: !Ref LogLevel
```

**효과**: 모든 Lambda 함수가 자동으로 위 설정을 받음  
**오버라이드**: 특정 함수에서 다시 설정 가능

---

## 📊 CloudFormation 함수들

```yaml
# 참조
!Ref ResourceName                    # 리소스의 ID/ARN 가져오기
!GetAtt Resource.Property            # 리소스의 특정 속성

# 문자열 조작
!Sub "arn:aws:s3:::${BucketName}/*"  # 변수 치환 (AWS 변수도 사용 가능)
!Join ["-", [a, b, c]]              # 문자열 연결

# 조건
!If [ConditionName, ValueIfTrue, ValueIfFalse]
```

**자주 쓰이는 AWS 내장 변수** (in !Sub):

```yaml
${AWS::Region}        # 리전 (us-east-1)
${AWS::AccountId}     # 계정 ID (123456789012)
${AWS::StackName}     # 스택 이름
${AWS::Partition}     # 파티션 (aws)
```

---

## 🎯 배포 플로우

```
1. serverless deploy 명령
         ↓
2. serverless.yml 파싱
         ↓
3. 플러그인 실행 (pre-deploy hooks)
         ↓
4. CloudFormation 템플릿 생성 (.serverless/cloudformation-template-update-stack.json)
         ↓
5. S3에 배포 패키지 업로드
         ↓
6. CloudFormation 스택 생성/업데이트
         ↓
7. AWS 리소스 생성 (Lambda, API GW, etc)
         ↓
8. 플러그인 실행 (post-deploy hooks)
         ↓
9. 배포 완료 (endpoint 출력)
```

---

## 🧪 로컬 테스트

### serverless-offline 사용

```bash
npm install --save-dev serverless-offline

# serverless.yml에 추가
plugins:
  - serverless-offline

# 실행
serverless offline start
# 기본: http://localhost:3000

# 커스텀 포트
custom:
  serverless-offline:
    httpPort: 4000
```

### AWS Lambda 콘솔 테스트

1. Lambda 콘솔 → 함수 선택
2. "Test" 버튼
3. 테스트 이벤트 작성 (JSON)
4. 결과 확인 (Logs에서 console.log 출력 확인)

---

## 🐛 문제 해결

### 배포 실패

```bash
# 상세 로그 보기
serverless deploy -v

# CloudFormation 이벤트 확인
aws cloudformation describe-stack-events --stack-name my-service-dev
```

### Lambda 함수 에러

```bash
# 최신 로그 확인
serverless logs -f myFunction --tail

# AWS CLI로 직접
aws logs tail /aws/lambda/my-service-dev-myFunction --follow
```

### 권한 에러

- IAM role의 policy 확인
- Resource ARN이 정확한지 확인
- principal (Lambda) 확인

### S3 이벤트 안 됨

- S3 버킷에 이벤트 알림 설정 확인
- Lambda 실행 역할이 s3:GetObject, s3:ListBucket 권한 있는지 확인
- 파일이 serverless.yml에서 지정한 rules 만족하는지 확인

---

## 📌 Serverless vs SAM 맵핑 시작

| 기능   | Serverless                   | SAM                                                |
| ------ | ---------------------------- | -------------------------------------------------- |
| 파일   | serverless.yml               | template.yaml                                      |
| 함수   | functions.name               | Resources.FunctionName (AWS::Serverless::Function) |
| IAM    | provider.iam.role.statements | Resources.FunctionRole (AWS::IAM::Role)            |
| API GW | functions.events.http        | Resources.Api (AWS::Serverless::Api)               |
| 배포   | serverless deploy            | sam deploy                                         |

---

## 🎓 Day 1-2 체크리스트

- [ ] serverless.yml 문법 완벽 이해
- [ ] 4가지 이벤트 타입 (http, s3, schedule, sqs) 구분 가능
- [ ] Example 01 & 02 로컬/AWS 배포 성공
- [ ] CloudFormation 템플릿(JSON) 확인 가능
- [ ] Lambda handler 함수 작성 가능
- [ ] API Gateway 요청/응답 형식 이해
- [ ] S3 이벤트 트리거 이해
- [ ] IAM 권한 설정 가능

---

**다음: SAM으로 전환하기! → [마이그레이션 가이드](../comparison/serverless-to-sam-mapping.md)**
