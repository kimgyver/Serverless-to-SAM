# SAM Example 04: API Gateway + S3 Integration

**완성도**: 100% ✅ | **상태**: 프로덕션 준비 완료 🚀

---

## 📌 프로젝트 개요

AWS SAM을 사용하여 **API Gateway + Lambda + S3** 통합 프로젝트입니다.

### 학습 목표

- ✅ S3 버킷을 CloudFormation으로 정의
- ✅ Lambda → S3 권한 관리 (IAM Policy)
- ✅ Pre-signed URL 생성 (안전한 파일 업로드/다운로드)
- ✅ S3 이벤트 트리거
- ✅ AWS SDK v3 마이그레이션

---

## 🏗️ 아키텍처

```
API Gateway (5개 엔드포인트)
├── GET  /files              → ListFunc (파일 목록)
├── POST /files/upload       → UploadFunc (업로드 URL)
├── GET  /files/{key}        → GetFunc (다운로드 URL)
├── DELETE /files/{key}      → DelFunc (파일 삭제)
└── S3 Event (자동)          → ProcessFunc (이벤트 처리)
     ↓
Lambda Functions (AWS SDK v3)
     ↓
S3 Bucket (api-s3-dev-ACCOUNT_ID)
```

---

## 📂 프로젝트 구조

```
04-api-gateway-s3-sam/
├── template.yaml          # SAM CloudFormation 템플릿
├── handlers/
│   └── s3.js             # 5개 Lambda 핸들러
├── test/                 # 테스트 스크립트
│   ├── localstack.test.js        # LocalStack 테스트 (15개)
│   ├── sam-local.test.js         # SAM Local 테스트 (5개)
│   ├── aws-lambda.test.sh        # AWS Lambda 라이브 테스트 (7개)
│   └── README.md                 # 테스트 가이드
├── .env.json             # SAM Local 환경 변수
├── package.json          # npm 스크립트 + 의존성
├── samconfig.toml        # SAM 배포 설정
└── README.md             # 이 파일
```

---

## ⚙️ Stage별 설정 관리 (핵심 학습)

이 프로젝트는 **CloudFormation Mappings + !FindInMap**을 사용하여 Stage별 설정을 효율적으로 관리합니다.

### 🎯 문제: Serverless Framework vs SAM

**Serverless Framework 방식:**

```yaml
custom:
  stages:
    dev:
      memorySize: 256
      timeout: 30
    prod:
      memorySize: 1024
      timeout: 120

functions:
  myFunction:
    memorySize: ${self:custom.stages.${self:provider.stage}.memorySize}
```

**SAM/CloudFormation 방식:**

```yaml
Mappings:
  StageConfig:
    dev:
      MemorySize: 256
      Timeout: 30
    prod:
      MemorySize: 1024
      Timeout: 120

Parameters:
  Stage:
    Type: String
    Default: dev

Functions:
  MyFunction:
    Properties:
      MemorySize: !FindInMap [StageConfig, !Ref Stage, MemorySize]
      Timeout: !FindInMap [StageConfig, !Ref Stage, Timeout]
```

### 📊 !FindInMap이란?

```
!FindInMap [TableName, RowKey, ColumnKey]
           ↓          ↓        ↓
         표 이름    행 선택   열 선택
```

**동작 원리:**

```
Mappings:
  StageConfig:        ← TableName
    dev:              ← RowKey (Stage 파라미터)
      Timeout: 30     ← ColumnKey (Timeout)
      MemorySize: 256 ← ColumnKey (MemorySize)

!FindInMap [StageConfig, dev, Timeout]
  → Mappings.StageConfig.dev.Timeout
  → 30
```

**실제 사용:**

```bash
# dev 환경 배포
sam deploy --parameter-overrides Stage=dev

# prod 환경 배포
sam deploy --parameter-overrides Stage=prod
```

### 📋 현재 설정 (template.yaml)

| Stage   | Timeout | MemorySize | LogRetention | Lifecycle | LogLevel |
| ------- | ------- | ---------- | ------------ | --------- | -------- |
| dev     | 30초    | 256MB      | 3일          | 7일       | INFO     |
| staging | 60초    | 512MB      | 7일          | 15일      | INFO     |
| prod    | 120초   | 1024MB     | 30일         | 90일      | WARN     |

**각 Stage마다:**

- Lambda 함수의 메모리/타임아웃이 자동으로 조정됨
- S3 Lifecycle 정책이 달라짐 (비용 최적화)
- 로그 보관 기간이 달라짐
- X-Ray 추적 활성화 여부가 달라짐 (staging/prod만 활성화)

---

## 🚀 빠른 시작

### 0️⃣ 준비 (LocalStack 시작)

```bash
# LocalStack 컨테이너 시작 (처음 한 번만)
docker-compose up -d

# LocalStack 상태 확인
curl -s http://localhost:4566/_localstack/health | jq '.services.s3'
# 출력: "available" 이면 준비 완료!

# 종료할 때:
docker-compose down
```

### 1️⃣ 테스트 실행

```bash
# LocalStack 테스트 (15개 - Docker 필요)
npm run test:localstack

# SAM Local 테스트 (5개 - AWS 자격증명 필요)
npm run test:sam-local

# AWS Lambda 라이브 테스트 (7개 - 배포된 함수 필요)
npm run test:aws-lambda

# 전체 테스트 실행 (27개 모두)
npm run test:all
```

**테스트 결과**: ✅ 27/27 통과

### 2️⃣ 로컬 개발

```bash
# SAM Local API 시작 (포트 3000)
npm run local

# 또는 Docker 네트워크 사용 (S3 연동)
npm run local:s3
```

### 3️⃣ 배포 (Stage별 설정 적용)

**SAM은 배포 시 Stage 파라미터를 지정하면 Mappings 테이블에서 해당 행의 값을 자동으로 적용합니다:**

```bash
# 첫 배포 (대화형 - 설정값 입력)
npm run deploy

# 개발 환경 배포 (개발용 설정 자동 적용)
npm run deploy-dev
# 실제 명령: sam deploy --guided --parameter-overrides Stage=dev

# 스테이징 환경 배포
npm run deploy-staging
# 실제 명령: sam deploy --parameter-overrides Stage=staging

# 프로덕션 환경 배포
npm run deploy-prod
# 실제 명령: sam deploy --parameter-overrides Stage=prod --capabilities CAPABILITY_NAMED_IAM
```

**각 Stage별 적용되는 설정** (template.yaml의 Mappings에서):

| 설정                | dev    | staging | prod    |
| ------------------- | ------ | ------- | ------- |
| **MemorySize**      | 256 MB | 512 MB  | 1024 MB |
| **Timeout**         | 30초   | 60초    | 120초   |
| **LogRetention**    | 3일    | 7일     | 30일    |
| **S3 Lifecycle**    | 7일    | 15일    | 90일    |
| **X-Ray Tracing**   | 비활성 | 활성    | 활성    |
| **CloudWatch 로그** | 최소   | 중간    | 상세    |

```yaml
# template.yaml의 Mappings 구조
Mappings:
  StageConfig:
    dev:
      MemorySize: 256
      Timeout: 30
      LogRetentionDays: 3
      LifecycleDays: 7
      EnableXRay: "false"
    staging:
      MemorySize: 512
      Timeout: 60
      LogRetentionDays: 7
      LifecycleDays: 15
      EnableXRay: "true"
    prod:
      MemorySize: 1024
      Timeout: 120
      LogRetentionDays: 30
      LifecycleDays: 90
      EnableXRay: "true"
```

**배포 후 확인:**

```bash
# 배포된 Stack 확인
aws cloudformation describe-stacks --stack-name api-s3-fileupload-sam-dev

# 스택의 리소스 확인
aws cloudformation list-stack-resources --stack-name api-s3-fileupload-sam-dev

# API 엔드포인트 확인
aws cloudformation describe-stacks --stack-name api-s3-fileupload-sam-dev \
  --query 'Stacks[0].Outputs' --output table
```

---

## 📋 Lambda 함수 목록

| 함수        | 메서드     | 경로            | 설명                         |
| ----------- | ---------- | --------------- | ---------------------------- |
| ListFunc    | GET        | `/files`        | S3 파일 목록 조회            |
| UploadFunc  | POST       | `/files/upload` | 업로드 Pre-signed URL 생성   |
| GetFunc     | GET        | `/files/{key}`  | 다운로드 Pre-signed URL 생성 |
| DelFunc     | DELETE     | `/files/{key}`  | S3 파일 삭제                 |
| ProcessFunc | (S3 Event) | -               | S3 이벤트 처리               |

---

## 🚀 Stage별 성능 특성

**메모리와 타임아웃이 Stage별로 다르므로, 같은 코드도 stage별로 다른 성능을 보입니다:**

### 개발 환경 (dev) - 빠른 반복, 최소 비용

```
- Lambda 메모리: 256 MB
- Cold start: ~1초 (메모리 부족 시 더 길어질 수 있음)
- 최대 실행 시간: 30초
- 사용 시나리오: 로컬 테스트 후 빠른 검증
```

### 스테이징 환경 (staging) - 성능 검증

```
- Lambda 메모리: 512 MB
- Cold start: ~500ms
- 최대 실행 시간: 60초
- 사용 시나리오: 실제 환경과 유사한 성능 테스트
- X-Ray 활성화: 성능 병목 지점 분석 가능
```

### 프로덕션 환경 (prod) - 고성능, 안정성

```
- Lambda 메모리: 1024 MB
- Cold start: ~300ms
- 최대 실행 시간: 120초
- 사용 시나리오: 실제 사용자 트래픽 처리
- X-Ray 활성화: 상세한 성능 추적 가능
- 로그 보관: 30일 (운영 사후분석 가능)
```

**💡 팁:** 스테이징과 프로덕션에서 충분한 메모리를 할당하면:

- Cold start 시간 단축 (AWS Lambda는 메모리에 따라 CPU도 비례 할당)
- 더 빠른 코드 실행으로 전체 요청 응답시간 단축
- S3 대용량 파일 다운로드/업로드 시 제한 시간 여유

---

## 🔑 핵심 기술

### Pre-signed URL

```javascript
const command = new GetObjectCommand({ Bucket, Key });
const url = await getSignedUrl(client, command, { expiresIn: 3600 });
```

S3 객체에 대한 임시 접근 권한을 생성합니다.

### S3 이벤트 트리거

```yaml
Events:
  ProcessUploadEvent:
    Type: S3
    Properties:
      Bucket: !Ref S3Bucket
      Events: s3:ObjectCreated:*
```

### IAM 권한 관리

```yaml
Policies:
  - PolicyName: S3Access
    PolicyDocument:
      Statement:
        - Effect: Allow
          Action: s3:*
          Resource:
            - !GetAtt S3Bucket.Arn
            - !Sub "${S3Bucket.Arn}/*"
```

---

## 📊 배포 상태

| 항목                 | 상태 | 상세                                                       |
| -------------------- | ---- | ---------------------------------------------------------- |
| CloudFormation Stack | ✅   | api-s3-fileupload-sam-dev                                  |
| S3 Bucket            | ✅   | api-s3-dev-840297437975                                    |
| Lambda Functions     | ✅   | 5개 모두 배포됨                                            |
| API Gateway          | ✅   | https://w4tjnuge4j.execute-api.us-west-2.amazonaws.com/dev |
| 테스트               | ✅   | 27/27 통과                                                 |

---

## 🧪 테스트 전략

3가지 테스트 방식으로 다양한 환경을 검증합니다:

### LocalStack 테스트 (15개)

- 환경: 로컬 Docker
- 특징: 빠른 피드백, 비용 없음
- 용도: 개발 중 테스트

### SAM Local 테스트 (5개)

- 환경: 로컬 Lambda + 실제 AWS S3
- 특징: 실제 AWS 서비스 사용
- 용도: 배포 전 검증

### AWS Lambda 라이브 테스트 (7개)

- 환경: 배포된 실제 Lambda + API Gateway
- 특징: 프로덕션 환경 검증
- 용도: 배포 후 검증

---

## 💡 주요 학습 포인트

1. **AWS SDK v3 마이그레이션**

   - v2 `aws-sdk` → v3 `@aws-sdk/*`로 완전 전환
   - 더 작은 번들 크기, 더 빠른 성능

2. **Pre-signed URL 활용**

   - 클라이언트가 직접 S3에 업로드/다운로드
   - Lambda 거쳐갈 필요 없음 (비용 절감)

3. **IAM 권한 관리**

   - CloudFormation으로 선언적 정의
   - 최소 권한 원칙 적용

4. **테스트 자동화**
   - LocalStack: 로컬 테스트
   - SAM Local: 통합 테스트
   - AWS: 라이브 테스트

---

## 📚 더 알아보기

- [SAM 개발자 가이드](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS SDK v3 마이그레이션](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html)
- [S3 Pre-signed URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/presigned-url.html)
- [LocalStack 문서](https://docs.localstack.cloud/)

---

**최종 업데이트**: 2025-12-29 | **상태**: ✅ Production Ready

---

## 🔧 주요 SAM 개념 (template.yaml에서)

### 1️⃣ **S3 버킷 정의**

```yaml
FileUploadBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub "${BucketPrefix}-uploads-${Stage}-${AWS::AccountId}"
    VersioningConfiguration:
      Status: Enabled
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
```

**분석**:

- **BucketName**: `my-app-uploads-dev-123456789012` 형태
  - 전역 고유성 보장: AWS 계정 ID 포함
- **VersioningConfiguration**: 파일 버전 관리 활성화
- **PublicAccessBlockConfiguration**: 공개 접근 차단 (보안)

### 2️⃣ **S3 버킷 정책 (Bucket Policy)**

```yaml
FileUploadBucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    Bucket: !Ref FileUploadBucket
    PolicyText:
      Version: "2012-10-17"
      Statement:
        - Sid: DenyInsecureConnections
          Effect: Deny
          Principal: "*"
          Action: "s3:*"
          Resource:
            - !GetAtt FileUploadBucket.Arn
            - !Sub "${FileUploadBucket.Arn}/*"
          Condition:
            Bool:
              "aws:SecureTransport": "false"
```

**의미**: HTTPS만 허용 (HTTP 차단)

- Principal: '\*' = 모든 사용자
- Action: 's3:\*' = 모든 S3 작업
- Condition: SecureTransport=false 인 경우 Deny

### 3️⃣ **Lambda 권한 정책 (IAM Role)**

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
    Policies:
      - PolicyName: S3Access
        PolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Action:
                - s3:ListBucket
                - s3:GetBucketLocation
              Resource: !GetAtt FileUploadBucket.Arn
            - Effect: Allow
              Action:
                - s3:GetObject
                - s3:PutObject
                - s3:DeleteObject
              Resource: !Sub "${FileUploadBucket.Arn}/*"
```

**분석**:

| 권한              | 대상       | 의미                   |
| ----------------- | ---------- | ---------------------- |
| ListBucket        | Bucket ARN | 버킷 내 파일 목록 조회 |
| GetBucketLocation | Bucket ARN | 버킷 지역 정보 조회    |
| GetObject         | `Bucket/*` | 파일 읽기              |
| PutObject         | `Bucket/*` | 파일 업로드            |
| DeleteObject      | `Bucket/*` | 파일 삭제              |

**주의**: 버킷 권한과 객체 권한의 리소스 구조가 다름!

```
버킷 권한:       arn:aws:s3:::my-bucket
객체 권한:       arn:aws:s3:::my-bucket/*
```

### 4️⃣ **S3 이벤트 트리거**

```yaml
ProcessUploadFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: s3.processUpload
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
                  Value: .json
```

**의미**:

- **Type: S3**: S3 이벤트로 트리거
- **Events**: 어떤 이벤트에 반응할지
  - `s3:ObjectCreated:*` = 파일 생성 (PutObject, PostObject, CompleteMultipartUpload)
- **Filter**: 조건부 트리거
  - prefix: `uploads/` 디렉토리 내에만
  - suffix: `.json` 파일만

### 5️⃣ **S3 → Lambda 권한 허용**

```yaml
S3InvokeLambdaPermission:
  Type: AWS::Lambda::Permission
  Properties:
    FunctionName: !Ref ProcessUploadFunction
    Action: lambda:InvokeFunction
    Principal: s3.amazonaws.com
    SourceArn: !GetAtt FileUploadBucket.Arn
```

**의미**: S3 서비스가 Lambda 함수를 호출할 수 있도록 명시적 권한 부여

---

## 🚀 배포 및 실행

### Step 1: 사전 요구사항

```bash
# npm 의존성 설치
npm install

# SAM 빌드
sam build
```

### Step 2: 로컬 테스트

```bash
npm run local
```

엔드포인트:

```
Mounting ListFilesFunction at http://127.0.0.1:3000/files [GET]
Mounting UploadFileFunction at http://127.0.0.1:3000/files/upload [POST]
Mounting GetFileFunction at http://127.0.0.1:3000/files/{key} [GET]
Mounting DeleteFileFunction at http://127.0.0.1:3000/files/{key} [DELETE]
```

**주의**: 로컬에서는 S3 이벤트 트리거 테스트 불가 (AWS에 배포해야 함)

### Step 3: API 테스트 (로컬)

#### 테스트 1: 파일 목록 조회

```bash
curl http://localhost:3000/files

# Response:
{
  "bucket": "my-app-uploads-dev-123456789012",
  "fileCount": 0,
  "files": [],
  "prefix": "/",
  "isTruncated": false
}
```

#### 테스트 2: 업로드 Pre-signed URL 생성

```bash
curl -X POST http://localhost:3000/files/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.txt"}'

# Response:
{
  "uploadUrl": "https://s3.amazonaws.com/my-app-uploads-dev-123456789012/uploads/1705318200000-test.txt?...",
  "bucket": "my-app-uploads-dev-123456789012",
  "key": "uploads/1705318200000-test.txt",
  "expiresIn": 3600,
  "instructions": "Use PUT request with the uploadUrl to upload file"
}
```

**실제 업로드** (Pre-signed URL 사용):

```bash
UPLOAD_URL="https://s3.amazonaws.com/..."

# 파일 업로드 (PUT)
curl -X PUT $UPLOAD_URL \
  --data-binary @myfile.txt \
  -H "Content-Type: text/plain"
```

#### 테스트 3: 다운로드 Pre-signed URL 생성

```bash
curl http://localhost:3000/files/uploads/1705318200000-test.txt

# Response:
{
  "downloadUrl": "https://s3.amazonaws.com/...",
  "bucket": "my-app-uploads-dev-123456789012",
  "key": "uploads/1705318200000-test.txt",
  "expiresIn": 3600,
  "instructions": "Use GET request with the downloadUrl to download file"
}
```

#### 테스트 4: 파일 삭제

```bash
curl -X DELETE http://localhost:3000/files/uploads/1705318200000-test.txt

# Response:
{
  "message": "File deleted successfully",
  "bucket": "my-app-uploads-dev-123456789012",
  "key": "uploads/1705318200000-test.txt"
}
```

### Step 4: AWS에 배포

```bash
# 첫 배포
npm run deploy

# 또는 직접 명령
sam deploy --guided \
  --parameter-overrides \
    Stage=dev \
    BucketPrefix=my-app
```

배포 후:

```bash
# 스택 출력 확인
aws cloudformation describe-stacks \
  --stack-name api-gateway-s3-sam-dev \
  --query 'Stacks[0].Outputs'

# 또는 AWS Console에서 확인
# CloudFormation > Stacks > api-gateway-s3-sam-dev > Outputs
```

---

## 💡 각 함수별 설명

### 1️⃣ ListFilesFunction

```javascript
exports.listFiles = async (event, context) => {
  const s3 = new AWS.S3({ region: process.env.BUCKET_REGION });

  const params = {
    Bucket: process.env.BUCKET_NAME,
    MaxKeys: 100
  };

  // Query parameter: /files?prefix=uploads/
  if (event.queryStringParameters?.prefix) {
    params.Prefix = event.queryStringParameters.prefix;
  }

  const data = await s3.listObjectsV2(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      bucket: process.env.BUCKET_NAME,
      fileCount: data.Contents?.length || 0,
      files:
        data.Contents?.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified
        })) || []
    })
  };
};
```

**핵심**:

- `listObjectsV2()`: S3 파일 목록 조회
- `Prefix`: 디렉토리 경로 필터링 (선택적)

**테스트**:

```bash
curl "http://localhost:3000/files?prefix=uploads/"
```

---

### 2️⃣ UploadFileFunction - Pre-signed URL

```javascript
exports.uploadFile = async (event, context) => {
  const { fileName, contentType } = JSON.parse(event.body);

  const s3 = new AWS.S3({ region: process.env.BUCKET_REGION });

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: `uploads/${Date.now()}-${fileName}`,
    ContentType: contentType || "application/octet-stream",
    Expires: parseInt(process.env.SIGNED_URL_EXPIRY || "3600", 10)
  };

  const uploadUrl = s3.getSignedUrl("putObject", params);

  return {
    statusCode: 200,
    body: JSON.stringify({
      uploadUrl,
      bucket: process.env.BUCKET_NAME,
      key: params.Key,
      expiresIn: params.Expires
    })
  };
};
```

**핵심**:

- `getSignedUrl('putObject', params)`: PUT 권한의 임시 URL 생성
- URL은 3600초(1시간) 동안 유효
- 클라이언트가 AWS 자격증명 없이 파일 업로드 가능

**보안 이점**:

1. 클라이언트에게 AWS 액세스 키 노출 없음
2. 시간 제한 (1시간 유효)
3. 특정 파일(Key)에만 접근 가능

---

### 3️⃣ GetFileFunction - 다운로드 URL

```javascript
exports.getFile = async (event, context) => {
  const { key } = event.pathParameters;

  const s3 = new AWS.S3({ region: process.env.BUCKET_REGION });

  // 파일 존재 여부 확인
  try {
    await s3
      .headObject({ Bucket: process.env.BUCKET_NAME, Key: key })
      .promise();
  } catch (error) {
    if (error.code === "NotFound") {
      return { statusCode: 404, body: JSON.stringify({ error: "Not Found" }) };
    }
    throw error;
  }

  // 다운로드 URL 생성 (GET)
  const downloadUrl = s3.getSignedUrl("getObject", {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    Expires: parseInt(process.env.SIGNED_URL_EXPIRY || "3600", 10)
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ downloadUrl, key })
  };
};
```

**핵심**:

- `headObject()`: 파일 존재 여부만 확인 (메타데이터 조회)
- `getSignedUrl('getObject', params)`: GET 권한의 임시 URL
- 404 처리: 존재하지 않는 파일

---

### 4️⃣ DeleteFileFunction

```javascript
exports.deleteFile = async (event, context) => {
  const { key } = event.pathParameters;

  const s3 = new AWS.S3({ region: process.env.BUCKET_REGION });

  await s3
    .deleteObject({
      Bucket: process.env.BUCKET_NAME,
      Key: key
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "File deleted", key })
  };
};
```

**주의**: `deleteObject()`는 파일이 없어도 에러 없음 (멱등성)

---

### 5️⃣ ProcessUploadFunction - S3 이벤트 처리

```javascript
exports.processUpload = async (event, context) => {
  const logger = createLogger("ProcessUpload");

  for (const record of event.Records) {
    const { bucket, object } = record.s3;
    const bucketName = bucket.name;
    const key = decodeURIComponent(object.key.replace(/\+/g, " "));

    logger.log("Processing S3 event", { bucket: bucketName, key });

    try {
      // 메타데이터 조회
      const headResponse = await s3
        .headObject({ Bucket: bucketName, Key: key })
        .promise();

      // JSON 파일이면 내용 읽기
      if (key.endsWith(".json")) {
        const getResponse = await s3
          .getObject({ Bucket: bucketName, Key: key })
          .promise();
        const content = JSON.parse(getResponse.Body.toString());

        logger.log("Parsed JSON content", { content });
        // 여기서 추가 처리 (예: DB 저장, 알림 발송 등)
      }
    } catch (error) {
      logger.error("Processing failed", error);
      // S3 이벤트는 재시도 없음 (Lambda가 성공 반환하면 끝)
    }
  }

  return { statusCode: 200 };
};
```

**이벤트 구조**:

```javascript
{
  Records: [
    {
      s3: {
        bucket: { name: "my-bucket" },
        object: { key: "uploads/1234-file.json" }
      },
      eventName: "s3:ObjectCreated:PutObject"
    }
  ];
}
```

**특이점**:

1. **비동기 처리**: S3 이벤트는 이벤트 소스 매핑(Event Source Mapping)으로 자동 호출
2. **재시도 없음**: Lambda가 정상 종료하면 성공 (별도의 Dead Letter Queue 필요)
3. **URL 디코딩**: `decodeURIComponent(key.replace(/\+/g, ' '))` 필수

---

## 🔐 보안 체크리스트

### ✅ IAM 권한 최소화

```yaml
# ❌ 나쁜 예: 모든 버킷 권한
- Effect: Allow
  Action: "s3:*"
  Resource: "*"

# ✅ 좋은 예: 특정 버킷만
- Effect: Allow
  Action:
    - s3:GetObject
    - s3:PutObject
  Resource: !Sub "${FileUploadBucket.Arn}/*"
```

### ✅ S3 버킷 공개 차단

```yaml
PublicAccessBlockConfiguration:
  BlockPublicAcls: true
  BlockPublicPolicy: true
  IgnorePublicAcls: true
  RestrictPublicBuckets: true
```

### ✅ HTTPS만 허용

```yaml
Condition:
  Bool:
    "aws:SecureTransport": "false"
```

### ✅ Pre-signed URL 만료 시간 설정

```javascript
Expires: 3600; // 1시간
```

---

## 📊 모니터링

### CloudWatch Logs

```bash
# ListFilesFunction 로그 확인
aws logs tail /aws/lambda/s3-list-files-dev --follow

# 또는 SAM
sam logs --name ListFilesFunction --stack-name api-gateway-s3-sam-dev --tail
```

### 에러 모니터링

```bash
# 함수 에러 조회
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=s3-list-files-dev \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-16T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### S3 이벤트 확인

```bash
# Lambda 이벤트 소스 매핑 확인
aws lambda list-event-source-mappings \
  --function-name s3-process-upload-dev

# S3 알림 설정 확인
aws s3api get-bucket-notification-configuration \
  --bucket my-app-uploads-dev-123456789012
```

---

## 🔄 Serverless Framework 예제와 비교

### serverless.yml (Framework)

```yaml
provider:
  name: aws
  runtime: nodejs18.x
  iam:
    role:
      statements:
        - Effect: Allow
          Action: "s3:*"
          Resource:
            - !GetAtt MyBucket.Arn
            - !Sub "${MyBucket.Arn}/*"

functions:
  listFiles:
    handler: handlers/s3.listFiles
    events:
      - http:
          path: files
          method: get

  processUpload:
    handler: handlers/s3.processUpload
    events:
      - s3:
          bucket: my-bucket
          event: s3:ObjectCreated:*

resources:
  Resources:
    MyBucket:
      Type: AWS::S3::Bucket
```

### template.yaml (SAM)

```yaml
Globals:
  Function:
    Runtime: nodejs18.x

Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      Policies:
        - Effect: Allow
          Action: "s3:*"
          Resource:
            - !GetAtt FileUploadBucket.Arn
            - !Sub "${FileUploadBucket.Arn}/*"

  FileUploadBucket:
    Type: AWS::S3::Bucket

  ListFilesFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: s3.listFiles
      Role: !GetAtt LambdaExecutionRole.Arn
      Events:
        HttpEvent:
          Type: Api
          Properties:
            Path: /files
            Method: GET

  ProcessUploadFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: s3.processUpload
      Events:
        S3Event:
          Type: S3
          Properties:
            Bucket: !Ref FileUploadBucket
            Events: s3:ObjectCreated:*
```

**차이점**:

| 항목      | Framework             | SAM                          |
| --------- | --------------------- | ---------------------------- |
| IAM 정의  | `provider.iam`        | `AWS::IAM::Role` 명시적      |
| S3 버킷   | `resources.Resources` | `Resources.FileUploadBucket` |
| S3 이벤트 | `events: [s3: {...}]` | `Events.S3Event.Type: S3`    |
| S3 권한   | 자동 추가             | `Lambda::Permission` 명시적  |

---

## 🛠️ 자주 하는 질문 (FAQ)

### Q1: Pre-signed URL의 보안은?

A: Pre-signed URL은 다음을 보장합니다:

1. **자격증명 불필요**: AWS 액세스 키 노출 안 함
2. **시간 제한**: 3600초 후 만료
3. **작업 제한**: PUT, GET 등 특정 작업만 가능
4. **리소스 제한**: 특정 파일(Key)에만 접근

### Q2: S3 이벤트가 실행되지 않으면?

체크리스트:

```bash
# 1. S3 알림 설정 확인
aws s3api get-bucket-notification-configuration --bucket my-bucket

# 2. Lambda 권한 확인
aws lambda get-policy --function-name my-function

# 3. 이벤트 필터 확인
# - Key prefix/suffix 조건 확인
# - 파일이 조건과 매치되는지 확인

# 4. Lambda 로그 확인
aws logs tail /aws/lambda/my-function --follow
```

### Q3: 대용량 파일 업로드하려면?

Pre-signed URL 크기 제한:

- URL 길이 제한: 일반적으로 ~2000자
- 파일 크기 제한: Pre-signed URL은 제한 없음 (S3는 5GB/PUT 제한)

대용량(> 100MB) 권장:

```javascript
// 멀티파트 업로드 (Multipart Upload)
const params = {
  Bucket: bucket,
  Key: key,
  Expires: 3600
};

const uploadUrl = s3.getSignedUrl("putObject", params);
// 클라이언트: 여러 부분으로 나눠서 업로드
```

### Q4: Pre-signed URL 생성 후 파일이 없으면?

안전함. `getFile()`에서 `headObject()` 확인:

```javascript
try {
  await s3.headObject({ Bucket, Key }).promise();
} catch (error) {
  if (error.code === "NotFound") {
    return 404;
  }
}
```

---

## ⚡ CloudFormation 고급: 조건부 리소스 (!If)

**Stage에 따라 특정 리소스나 속성을 선택적으로 활성화합니다:**

```yaml
# 1️⃣ Conditions 섹션 - 조건 정의
Conditions:
  EnableXRay: !Equals
    - !FindInMap [StageConfig, !Ref Stage, EnableXRay]
    - "true"

# 2️⃣ Lambda 함수에 적용 - X-Ray 활성화 여부 결정
ListFunc:
  Type: AWS::Serverless::Function
  Properties:
    Handler: handlers/hello.handler
    # Condition을 만족할 때만 이 값 적용
    Tracing: !If [EnableXRay, Active, PassThrough]
    # Mappings에서 값 조회 (모든 stage에 적용)
    Timeout: !FindInMap [StageConfig, !Ref Stage, Timeout]
```

**동작 방식:**

| Stage   | Condition 결과 | Tracing 값  | 의미                         |
| ------- | -------------- | ----------- | ---------------------------- |
| dev     | false          | PassThrough | X-Ray 비활성화 (비용 절감)   |
| staging | true           | Active      | X-Ray 활성화 (성능 추적)     |
| prod    | true           | Active      | X-Ray 활성화 (운영 모니터링) |

```javascript
// 📌 핵심 학습:
// !FindInMap: 테이블에서 값 조회 (모든 stage에 값 필요)
// !If: 조건에 따라 다른 값 선택 (특정 stage만 다르게 처리)

// 예:
Timeout: !FindInMap [...] // ✅ 모든 stage에 다른 값
Tracing: !If [EnableXRay, ...] // ✅ dev는 다르게, staging/prod는 같음
```

---

## 📚 참고자료

- [AWS SDK S3 API 레퍼런스](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [SAM S3 이벤트 설정](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html#sam-function-s3eventsource)
- [Pre-signed URL 보안](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [S3 버킷 정책 예제](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html)
- [CloudFormation Conditions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html)
- [CloudFormation Intrinsic Functions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html)

---

## 🎯 다음 단계

1. ✅ 로컬에서 `npm run local` 후 Pre-signed URL 테스트
2. ✅ AWS에 배포 후 실제 S3 업로드 테스트
3. ✅ CloudWatch Logs에서 S3 이벤트 처리 확인
4. 👉 **다음**: CI/CD 파이프라인 (GitHub Actions → SAM Deploy)
