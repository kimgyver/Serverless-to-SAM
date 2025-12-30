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

### Step 2.9: 실제 변환 사례 - 01→03 Hello World 마이그레이션

이 섹션은 **examples/01-hello-world (Serverless)** → **examples/03-hello-world-sam (SAM)** 실제 변환 과정에서 발견한 핵심 이슈와 해결 방법입니다.

#### 이슈 1️⃣: 핸들러 Export 이름 불일치

**문제**: `template.yaml`의 Handler 정의와 실제 `handlers/hello.js`의 export 이름이 다르면 배포 후 에러 발생

**Serverless (01-hello-world/serverless.yml)**:

```yaml
functions:
  sayHello:
    handler: handlers/hello.sayHello # sayHello 함수를 찾음
  greet:
    handler: handlers/hello.greet
```

**초기 handlers/hello.js** (❌ 잘못됨):

```javascript
exports.sayHello = async event => {
  return { statusCode: 200, body: "Hello, World!" };
};
exports.greet = async event => {
  return { statusCode: 200, body: `Hello, ${name}!` };
};
```

**SAM (03-hello-world-sam/template.yaml)** (❌ 이름 변경):

```yaml
Resources:
  SayHelloFunction:
    Properties:
      Handler: hello.helloHandler # ⚠️ 다른 이름!

  GreetFunction:
    Properties:
      Handler: hello.greetHandler
```

**해결책**: handlers/hello.js에서 export 이름을 template.yaml에 맞게 변경

```javascript
// 01-hello-world와 동일한 로직, 이름만 변경
exports.helloHandler = async event => {
  return { statusCode: 200, body: "Hello, World!" };
};
exports.greetHandler = async event => {
  const name = event.pathParameters?.name || "World";
  return { statusCode: 200, body: `Hello, ${name}!` };
};
exports.createMessageHandler = async event => {
  // POST /message 처리
};
// ... 나머지 8개 함수
```

**배운 점**: SAM은 핸들러 이름을 엄격하게 검증하므로, 함수 로직은 그대로 두고 export 이름만 수정하는 게 가장 깔끔합니다.

---

#### 이슈 2️⃣: API 경로 파라미터 형식 차이

**문제**: Serverless Framework와 SAM의 경로 파라미터 처리 방식이 미묘하게 다름

**Serverless (01-hello-world)**:

```yaml
functions:
  divide:
    handler: handlers/hello.divide
    events:
      - http:
          path: divide/{a}/{b}
          method: post # ⚠️ POST!
          # body에 {dividend, divisor} 전달
```

**handlers/hello.js (01의 원본)**:

```javascript
exports.divide = async event => {
  const { dividend, divisor } = JSON.parse(event.body);
  return {
    statusCode: 200,
    body: JSON.stringify({ result: dividend / divisor })
  };
};
```

**테스트 호출**:

```bash
curl -X POST http://localhost:3000/divide/10/2 \
  -H "Content-Type: application/json" \
  -d '{"dividend": 100, "divisor": 4}'
```

**SAM (03-hello-world-sam)**로 변환 시:

```yaml
Resources:
  DivideFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: hello.divideHandler
      Events:
        DivideEvent:
          Type: Api
          Properties:
            Path: /divide/{a}/{b}
            Method: GET # ❌ 경로 파라미터 사용 시 GET이 더 적절!
```

**개선된 handlers/hello.js**:

```javascript
exports.divideHandler = async event => {
  // 경로 파라미터 추출 ({a}/{b})
  const a = parseInt(event.pathParameters.a, 10);
  const b = parseInt(event.pathParameters.b, 10);

  if (b === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Division by zero" })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ result: a / b })
  };
};
```

**테스트 호출**:

```bash
curl http://localhost:3000/divide/100/4  # GET으로 단순화!
```

**배운 점**:

- 경로 파라미터는 POST보다 GET이 더 RESTful
- `event.body` 파싱은 POST/PUT에만 필요
- `event.pathParameters`는 경로 파라미터 `{a}/{b}`에서 자동 추출

---

#### 이슈 3️⃣: DynamoDB 테이블 리소스 명명 규칙

**문제**: 01과 03이 동시에 배포되면 같은 이름의 DynamoDB 테이블로 충돌

**Serverless (01)**:

```yaml
resources:
  Resources:
    ItemsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: hello-world-items-${self:provider.stage}
```

**SAM (03) 초기** (❌ 충돌!):

```yaml
Resources:
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "hello-world-items-${Stage}"
```

**결과**: 같은 테이블 이름 → CloudFormation 에러

**해결책**: 리소스 이름에 `sam-` prefix 추가

```yaml
Resources:
  SamItemsTable: # 리소스명 변경
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "hello-world-items-sam-${Stage}" # 테이블명도 변경
```

**배운 점**:

- 서로 다른 프레임워크의 동일 프로젝트는 리소스명을 명확히 구분
- `sam-` prefix, `-sam-` suffix 등 일관된 명명 규칙 필요
- CloudFormation 스택 이름도 `hello-world-sam-dev`처럼 구분

---

#### 이슈 4️⃣: IAM 권한 관리 명시성

**Serverless (01-hello-world)**:

```yaml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action: logs:*
          Resource: "*"
        - Effect: Allow
          Action: dynamodb:*
          Resource: !GetAtt ItemsTable.Arn
```

**SAM (03)**:

```yaml
Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "HelloWorldRole-${Stage}" # ⭐ 명시적 이름!
      AssumeRolePolicyDocument:
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
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                  - dynamodb:DeleteItem
                  - dynamodb:Query
                  - dynamodb:Scan
                Resource: !GetAtt SamItemsTable.Arn
```

**배운 점**:

- SAM은 IAM Role을 **명시적으로** 정의해야 함 (Serverless는 자동 생성)
- `RoleName`을 명시하면 리소스 충돌 예방 가능
- 권한을 최소화 (principle of least privilege) - `dynamodb:*` 대신 필요한 권한만

---

#### 이슈 5️⃣: 환경변수 전달 메커니즘 (SAM Local vs AWS)

**문제**: SAM Local과 AWS CloudFormation의 환경변수 처리 방식이 다름

**template.yaml**:

```yaml
Globals:
  Function:
    Environment:
      Variables:
        STAGE: !Ref Stage
        SERVICE_NAME: hello-world-lambda
        ITEMS_TABLE: !Sub "hello-world-items-sam-${Stage}"
```

**SAM Local 시** (❌ 변수 치환 미지원):

```bash
sam local invoke CreateItemFunction --event -
# 결과: ITEMS_TABLE = undefined ❌
```

**해결책**: `.env.json` 파일로 명시적 제공

```json
{
  "CreateItemFunction": {
    "STAGE": "dev",
    "SERVICE_NAME": "hello-world-lambda",
    "ITEMS_TABLE": "hello-world-items-sam-dev"
  }
}
```

**올바른 실행**:

```bash
sam local invoke CreateItemFunction --env-vars .env.json --event -
# 결과: ITEMS_TABLE = hello-world-items-sam-dev ✅
```

**배운 점**:

- SAM Local은 template.yaml의 `!Ref`, `!Sub` 문법을 **완벽히 해석하지 못함**
- 로컬 테스트 시 `.env.json` 필수
- AWS 배포 시는 CloudFormation이 처리하므로 문제 없음

---

### Step 2.10: 변환 체크리스트

실제 변환 수행 시 다음 사항을 확인하세요:

```
[ ] 모든 핸들러 export 이름이 template.yaml Handler와 일치
[ ] 경로 파라미터 ({id} 등) 처리 방식 검토 (GET vs POST)
[ ] DynamoDB, S3 등 리소스명에 프로젝트별 prefix/suffix 추가
[ ] IAM Role을 명시적으로 정의하고 권한 최소화
[ ] .env.json 파일 생성 (SAM Local 테스트용)
[ ] samconfig.toml 생성 (AWS 배포용)
[ ] 로컬 테스트 완료 (sam local invoke, sam local start-api)
[ ] AWS 배포 전 충돌 리소스 확인
[ ] CloudFormation 스택 이름도 프로젝트별로 구분
```

---

### Step 2.11: 실제 변환 사례 - 02→04 API Gateway + S3 마이그레이션

이 섹션은 **examples/02-api-gateway-s3 (Serverless)** → **examples/04-api-gateway-s3-sam (SAM)** 실제 변환 과정입니다.

#### 주요 차이점: S3 통합

**02-api-gateway-s3 (Serverless)**:

- 5개 S3 핸들러 (listFiles, uploadFile, getFile, deleteFile, processUpload)
- Pre-signed URL 생성 (PUT/GET)
- S3 이벤트 트리거 통합

#### 이슈 1️⃣: S3 버킷 리소스 및 권한 정의

**Serverless (02)**:

```yaml
provider:
  iam:
    role:
      name: ApiS3Role-${self:provider.stage}
      statements:
        - Effect: Allow
          Action: [s3:ListBucket, s3:GetObject, s3:PutObject, s3:DeleteObject]
          Resource: "arn:aws:s3:::api-s3-bucket-${self:service}-${self:provider.stage}/*"

resources:
  Resources:
    FileUploadBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: api-s3-bucket-${self:service}-${self:provider.stage}
```

**SAM (04)**:

```yaml
Parameters:
  AwsAccountId:
    Type: String
    Description: AWS Account ID for bucket ARN

Resources:
  # ⭐ 명시적 S3 버킷 정의
  FileUploadBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "api-s3-bucket-${Stage}-${AwsAccountId}"
      VersioningConfiguration:
        Status: Enabled

  # ⭐ 명시적 IAM Role 정의
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "ApiS3Role-${Stage}"
      AssumeRolePolicyDocument:
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
            Statement:
              - Effect: Allow
                Action:
                  - s3:ListBucket
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                Resource:
                  - !GetAtt FileUploadBucket.Arn
                  - !Sub "${FileUploadBucket.Arn}/*"
```

**배운 점**:

- SAM도 S3 버킷을 Resources에 명시적으로 정의
- IAM Role이 명시적이어야 하고, 리소스 ARN을 `!GetAtt` 또는 `!Sub`로 동적 참조
- 버킷 이름에 Account ID 포함 시 `Parameters`로 입력받기

---

#### 이슈 2️⃣: Pre-signed URL 생성 로직 (SDK 차이 없음)

**Serverless (02) & SAM (04) 모두 동일**:

handlers/s3.js:

```javascript
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({ region: "us-west-2" }); // ⭐ Hardcoded!

exports.uploadFileHandler = async event => {
  const bucketName = process.env.BUCKET_NAME;
  const fileName = event.pathParameters.fileName || "default.txt";

  // PutObject Pre-signed URL 생성 (업로드용)
  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName
  });

  const presignedUrl = await getSignedUrl(s3Client, putCommand, {
    expiresIn: parseInt(process.env.SIGNED_URL_EXPIRY || "3600", 10)
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      uploadUrl: presignedUrl,
      expiresIn: 3600
    })
  };
};

exports.getFileHandler = async event => {
  const bucketName = process.env.BUCKET_NAME;
  const fileName = event.pathParameters.fileName;

  // GetObject Pre-signed URL 생성 (다운로드용)
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName
  });

  const presignedUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: 3600
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      downloadUrl: presignedUrl,
      expiresIn: 3600
    })
  };
};
```

**배운 점**:

- Pre-signed URL 생성은 Serverless/SAM 구분 없이 동일
- S3 SDK 사용 시 **리전을 hardcoding** 필요 (SAM Local 호환성)

---

#### 이슈 3️⃣: S3 이벤트 트리거 마이그레이션

**Serverless (02)**:

```yaml
functions:
  processUpload:
    handler: handlers/s3.processUploadHandler
    events:
      - s3:
          bucket: FileUploadBucket
          event: s3:ObjectCreated:*
          rules:
            - prefix: uploads/
            - suffix: .jpg
```

**SAM (04)**:

```yaml
Resources:
  ProcessUploadFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/
      Handler: s3.processUploadHandler
      Events:
        S3UploadEvent:
          Type: S3
          Properties:
            Bucket: !Ref FileUploadBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: prefix
                    Value: uploads/
                  - Name: suffix
                    Value: .jpg
```

**배운 점**:

- S3 이벤트는 `Type: S3`로 명시
- `bucket:` → `Bucket: !Ref` (리소스 참조)
- `rules` → `Filter.S3Key.Rules` (복잡한 구조)

---

#### 이슈 4️⃣: 환경변수와 .env.json

**template.yaml**:

```yaml
Globals:
  Function:
    Environment:
      Variables:
        BUCKET_NAME: !Ref FileUploadBucket
        BUCKET_REGION: !Sub "${AWS::Region}"
        STAGE: !Ref Stage
        SIGNED_URL_EXPIRY: "3600"
```

**SAM Local 테스트용 .env.json**:

```json
{
  "ListFunc": {
    "BUCKET_NAME": "api-s3-dev-840297437975",
    "BUCKET_REGION": "us-west-2",
    "STAGE": "dev",
    "SIGNED_URL_EXPIRY": "3600"
  },
  "UploadFunc": {
    "BUCKET_NAME": "api-s3-dev-840297437975",
    "BUCKET_REGION": "us-west-2",
    "STAGE": "dev",
    "SIGNED_URL_EXPIRY": "3600"
  },
  "GetFunc": {
    "BUCKET_NAME": "api-s3-dev-840297437975",
    "BUCKET_REGION": "us-west-2",
    "STAGE": "dev"
  },
  "DeleteFunc": {
    "BUCKET_NAME": "api-s3-dev-840297437975",
    "BUCKET_REGION": "us-west-2",
    "STAGE": "dev"
  },
  "ProcessFunc": {
    "BUCKET_NAME": "api-s3-dev-840297437975",
    "BUCKET_REGION": "us-west-2",
    "STAGE": "dev"
  }
}
```

**배운 점**:

- 각 함수가 필요한 환경변수를 명시적으로 정의
- BUCKET_NAME은 실제 S3 버킷 이름으로 (AWS 배포 후)

---

#### 이슈 5️⃣: 리전 Hardcoding (S3에도 적용)

**handlers/s3.js**:

```javascript
// ❌ 작동하지 않음 (SAM Local)
const s3Client = new S3Client({
  region: process.env.BUCKET_REGION || "us-west-2"
});

// ✅ 작동함 (SAM Local + AWS)
const s3Client = new S3Client({
  region: "us-west-2" // Hardcoded!
});
```

**배운 점**:

- DynamoDB와 마찬가지로 S3도 리전을 hardcoding
- SAM Local 컨테이너 환경변수 상속 문제

---

#### 이슈 6️⃣: Pre-signed URL의 버킷 이름 차이

**Serverless (02) 배포 후**:

- 버킷 이름: `api-s3-bucket-api-s3-integration-dev`

**SAM (04) 배포 후**:

- 버킷 이름: `api-s3-bucket-dev-840297437975`

**테스트 시 주의**:

```bash
# 02 테스트
curl http://localhost:3000/files
# BUCKET_NAME = api-s3-bucket-api-s3-integration-dev

# 04 테스트
curl http://localhost:3000/files
# BUCKET_NAME = api-s3-bucket-dev-840297437975
```

**배운 점**:

- 로컬 테스트 시 `.env.json`의 BUCKET_NAME을 실제 배포된 버킷명으로 설정
- `handlers/s3.js`는 두 프로젝트 거의 동일하지만, 환경변수만 다름

---

### Step 2.12: 02→04 변환 체크리스트

```
[ ] S3 버킷을 Resources에 명시적으로 정의
[ ] IAM Role을 명시적으로 정의 (S3 권한 포함)
[ ] Pre-signed URL 생성 로직 (SDK 차이 없음)
[ ] S3 이벤트 트리거: Type: S3, Events, Filter 구조 확인
[ ] .env.json에 BUCKET_NAME, BUCKET_REGION, SIGNED_URL_EXPIRY 설정
[ ] 핸들러에서 리전 hardcoding (handlers/s3.js)
[ ] 테스트 시 실제 S3 버킷명으로 .env.json 업데이트
[ ] samconfig.toml에 Account ID 파라미터 추가 (선택사항)
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
