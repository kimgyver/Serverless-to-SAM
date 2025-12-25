# 🎯 Example 02: API Gateway + S3 Lambda (Day 2 실습)

## 📌 이 예제의 목표

- API Gateway 트리거 심화
- S3 이벤트 트리거 이해
- IAM 권한 설정 (S3 접근)
- Pre-signed URL 활용
- `resources` 섹션으로 S3 버킷 생성

---

## 📁 구조

```
02-api-gateway-s3/
├── serverless.yml        ← API GW + S3 통합 설정
├── package.json
├── handlers/
│   └── s3.js             ← 5개 함수 (API GW + S3 이벤트)
└── README.md
```

---

## 🚀 빠른 시작

### 1️⃣ 설치

```bash
cd examples/02-api-gateway-s3
npm install
```

### 2️⃣ 로컬 테스트 (S3 에뮬레이터 포함)

```bash
npm run offline
```

### 3️⃣ API 호출 (다른 터미널)

```bash
# 1. 파일 목록 조회
curl http://localhost:3000/dev/files

# 2. 업로드용 Pre-signed URL 생성
curl -X POST http://localhost:3000/dev/files/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"document.json","contentType":"application/json"}'

# 3. 다운로드용 Pre-signed URL 생성
curl http://localhost:3000/dev/files/uploads/test.json

# 4. 파일 삭제
curl -X DELETE http://localhost:3000/dev/files/uploads/test.json

# 5. Prefix로 필터링
curl "http://localhost:3000/dev/files?prefix=uploads/"
```

### 4️⃣ AWS에 배포

```bash
npm run deploy

# 또는 특정 리전/스테이지
serverless deploy --stage prod --region ap-southeast-2
```

### 5️⃣ AWS 배포 후 실제 API 호출

```bash
# 배포 후 출력된 endpoint 사용
# 예: https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/

curl https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/files
```

---

## 📖 serverless.yml 상세 분석

### 1️⃣ IAM 권한 확장

```yaml
provider:
  iam:
    role:
      statements:
        # Lambda → CloudWatch Logs (필수)
        - Effect: Allow
          Action:
            - logs:*
          Resource: "*"

        # Lambda → S3 버킷 목록 조회
        - Effect: Allow
          Action:
            - s3:ListBucket
          Resource: !GetAtt UploadBucket.Arn

        # Lambda → S3 객체 읽기/쓰기
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
            - s3:DeleteObject
          Resource: !Sub "${UploadBucket.Arn}/*"
```

**핵심:**

- `!GetAtt UploadBucket.Arn` = CloudFormation 함수 (Bucket의 ARN 가져오기)
- `!Sub` = 문자열 치환 (변수 삽입)
- 각 권한이 정확히 무엇을 허용하는지 명시

### 2️⃣ 환경 변수로 S3 버킷 이름 전달

```yaml
environment:
  BUCKET_NAME: !Ref UploadBucket
  BUCKET_REGION: ${self:provider.region}
```

- 코드에서: `process.env.BUCKET_NAME` 사용
- Lambda 함수가 배포된 후 실제 버킷 이름을 받음

### 3️⃣ 다양한 이벤트 타입

```yaml
functions:
  listFiles:
    events:
      - http: ... # API Gateway

  processUpload:
    events:
      - s3: # S3 이벤트 트리거
          bucket: !Ref UploadBucket
          event: s3:ObjectCreated:*
          rules:
            - prefix: uploads/
            - suffix: .json
```

### 4️⃣ Resources 섹션 (CloudFormation)

```yaml
resources:
  Resources:
    UploadBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: api-s3-bucket-${self:provider.stage}-${aws:accountId}
        VersioningConfiguration:
          Status: Enabled
        LifecycleConfiguration:
          Rules:
            - Id: DeleteOldVersions
              NoncurrentVersionExpirationInDays: 30
              Status: Enabled

    UploadBucketCorsConfiguration:
      Type: AWS::S3::BucketCorsConfiguration
      Properties:
        Bucket: !Ref UploadBucket
        CorsConfiguration:
          CorsRules:
            - AllowedMethods: [GET, PUT, POST]
              AllowedOrigins: ["*"]
```

**CloudFormation 문법:**

- `!Ref UploadBucket` = 위에서 정의한 리소스 참조
- `!GetAtt` = 리소스의 속성 가져오기
- `${aws:accountId}` = AWS 계정 ID (Serverless 변수)

### 5️⃣ Outputs (배포 결과)

```yaml
Outputs:
  UploadBucketName:
    Value: !Ref UploadBucket
    Export:
      Name: !Sub "${AWS::StackName}-BucketName"
```

배포 후:

```
Outputs:
UploadBucketName: api-s3-bucket-dev-123456789012
```

---

## 🔍 handlers/s3.js 상세 분석

### 1️⃣ S3 클라이언트 초기화

```javascript
const AWS = require("aws-sdk");
const s3 = new AWS.S3({
  region: process.env.BUCKET_REGION
});
const bucketName = process.env.BUCKET_NAME;
```

**중요:**

- `require('aws-sdk')`는 Lambda 런타임에 이미 포함됨 (별도 설치 불필요)
- 환경변수로 버킷 이름 받기

### 2️⃣ 버킷 내 파일 목록 조회

```javascript
const data = await s3
  .listObjectsV2({
    Bucket: bucketName,
    MaxKeys: 100,
    Prefix: "uploads/" // 특정 폴더만
  })
  .promise();

// Contents는 배열: [{ Key, Size, LastModified }, ...]
```

### 3️⃣ Pre-signed URL (업로드)

```javascript
const uploadUrl = s3.getSignedUrl("putObject", {
  Bucket: bucketName,
  Key: `uploads/${fileName}`,
  ContentType: "application/json",
  Expires: 3600 // 1시간
});
```

**사용 시나리오:**

1. 클라이언트가 `/files/upload` 호출
2. 서버가 Pre-signed URL 반환
3. 클라이언트가 직접 S3에 PUT 요청
4. 서버는 개입 안 함 (네트워크 절약)

### 4️⃣ Pre-signed URL (다운로드)

```javascript
const downloadUrl = s3.getSignedUrl("getObject", {
  Bucket: bucketName,
  Key: filename,
  Expires: 3600
});
```

### 5️⃣ S3 이벤트 트리거

```javascript
exports.processUploadHandler = async (event, context) => {
  // event.Records = S3 파일 업로드 이벤트
  // [
  //   {
  //     s3: {
  //       bucket: { name: 'my-bucket' },
  //       object: { key: 'uploads/file.json' }
  //     },
  //     eventName: 's3:ObjectCreated:Put'
  //   }
  // ]

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    // 파일 처리 로직
  }
};
```

---

## 📊 배포 후 생성 리소스

### CloudFormation 스택

```
api-gateway-s3-lambda-dev
├── Lambda Functions
│   ├── api-gateway-s3-lambda-dev-listFiles
│   ├── api-gateway-s3-lambda-dev-uploadFile
│   ├── api-gateway-s3-lambda-dev-getFile
│   ├── api-gateway-s3-lambda-dev-deleteFile
│   └── api-gateway-s3-lambda-dev-processUpload
├── API Gateway
│   ├── /files (GET, POST)
│   └── /files/{filename} (GET, DELETE)
├── S3 Bucket
│   └── api-s3-bucket-dev-[account-id]
│       ├── CORS 설정
│       ├── Versioning 활성화
│       └── Lifecycle Rules (30일 후 구 버전 삭제)
├── IAM Role
│   └── ApiS3Role-dev (S3 권한 포함)
└── CloudWatch Logs
    └── /aws/lambda/api-gateway-s3-lambda-dev-*
```

---

## 🧪 테스트 전략

### 로컬 테스트 (serverless-offline)

```bash
# 터미널 1: 오프라인 서버 시작
npm run offline

# 터미널 2: API 호출
# 1. 파일 목록 (빈 버킷)
curl http://localhost:3000/dev/files

# 2. Pre-signed URL 생성
curl -X POST http://localhost:3000/dev/files/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.json"}'

# 응답:
# {
#   "uploadUrl": "http://localhost:9000/api-s3-bucket-dev-...",
#   "key": "uploads/...",
#   ...
# }

# 3. Pre-signed URL로 실제 업로드 (curl)
curl -X PUT "http://localhost:9000/api-s3-bucket-dev-..." \
  -d '{"test":"data"}'

# 4. 파일 목록 다시 조회
curl http://localhost:3000/dev/files
```

### AWS 배포 후 테스트

```bash
# 배포
npm run deploy

# 콘솔 출력에서 endpoint 확인
# endpoint: POST - https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/files

# AWS Lambda 콘솔에서도 테스트 가능
# - 함수 선택 → "Test" 버튼
# - 테스트 이벤트 작성 (API Gateway 형식)
```

---

## 💡 중요 개념

### Pre-signed URL이란?

```
일반적인 S3 접근:
Client → API Server → S3
비용: 서버가 데이터 중계 (대역폭 소비)

Pre-signed URL 방식:
1. Server: "이 URL로 PUT하면 됨" (시간 제한)
2. Client → S3 (직접)
비용: 서버 부담 감소, 빠른 업로드
```

### S3 이벤트 트리거 vs API Gateway

```
API Gateway 트리거:
- 동기: 클라이언트가 호출할 때
- 응답 필요

S3 이벤트 트리거:
- 비동기: 파일 업로드 시 자동 호출
- 응답 필요 없음
```

---

## 🔗 다음 단계

- **Day 2 심화**: DynamoDB, SQS 추가
- **마이그레이션**: 이 serverless.yml을 SAM template.yaml로 변환

---

## 📝 자주 묻는 질문 (FAQ)

### Q: Pre-signed URL의 보안은?

**A:** 시간 제한(기본 1시간)이 있고, URL 자체가 credential 역할. 외부에 공개되면 위험.

### Q: S3 이벤트가 Lambda를 호출하지 않음

**A:** S3 이벤트 알림 설정 확인. CloudFormation에서 자동 설정되지만, 버킷 정책도 확인해야 함.

### Q: 로컬에서 S3 이벤트 테스트?

**A:** serverless-s3-local 플러그인 사용 (제한적). AWS에서만 완벽하게 테스트 가능.

---

이제 **Day 1-2 완성!** 🎉
