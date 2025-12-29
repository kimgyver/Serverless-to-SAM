# SAM Local + AWS S3 연결 가이드

## 📌 개요

SAM Local에서 **실제 AWS S3**에 성공적으로 연결하기 위해 필요한 3가지 핵심 변경사항을 문서화합니다.

> **이 문서의 목표**: LocalStack이 아닌 **실제 AWS 클라우드의 S3**를 로컬 Lambda 함수에서 접근하기

### ⚠️ 필수 사전 조건

이 가이드를 실행하기 **전에** 다음을 확인하세요:

| 항목          | 요구사항                                                                                   | 상태        |
| ------------- | ------------------------------------------------------------------------------------------ | ----------- |
| **IAM 권한**  | 다음 중 하나 이상 필수: `AdministratorAccess`, `AmazonS3FullAccess`, 또는 `S3SAMDevPolicy` | ⚠️ **필수** |
| **AWS 계정**  | 실제 AWS 계정 (LocalStack 아님)                                                            | ✅          |
| **S3 버킷**   | api-s3-dev-840297437975 (CloudFormation으로 생성됨)                                        | ✅          |
| **.env.json** | 환경변수 파일 (이 가이드에서 생성)                                                         | ⏳          |

#### ❌ 권한이 없으면 다음과 같은 오류가 발생합니다

```
User: arn:aws:iam::840297437975:user/jasonkim
is not authorized to perform: s3:ListBucket
on resource: arn:aws:s3:::api-s3-dev-840297437975
```

---

## 🔑 핵심 변경사항 3가지

### 1️⃣ **S3 리전 Hardcoding** (handlers/s3.js)

#### 문제점

SAM Local Docker 컨테이너는 호스트의 환경변수를 완전히 상속받지 못합니다.  
동적으로 설정된 리전은 컨테이너 내부에서 `undefined`가 될 수 있습니다.

#### ❌ 작동하지 않는 방식

```javascript
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-west-2" // 불안정 ❌
});
```

#### ✅ 작동하는 방식

```javascript
const s3Client = new S3Client({
  region: "us-west-2" // Hardcoded ✅
});
```

#### 왜 작동하는가?

- SAM Local 컨테이너가 리전을 명확하게 알 수 있음
- SDK 초기화 시점에 일관성 있게 "us-west-2" 사용
- 환경변수 전달 불일치 문제 회피

#### LocalStack 통합 지원

```javascript
let s3Client = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  const clientConfig = {
    region: "us-west-2" // AWS용
  };

  // LocalStack 사용 시 (선택사항)
  if (process.env.S3_LOCAL_ENDPOINT) {
    clientConfig.endpoint = process.env.S3_LOCAL_ENDPOINT;
    clientConfig.forcePathStyle = true;
  }

  s3Client = new S3Client(clientConfig);
  return s3Client;
};
```

**파일 위치**: `handlers/s3.js` getS3Client 함수

---

### 2️⃣ **환경변수 파일 생성** (.env.json)

#### 문제점

SAM Local은 CloudFormation의 환경변수 치환을 **완전하게 지원하지 않습니다**.

코드에서 사용하는:

```javascript
const bucketName = process.env.BUCKET_NAME;
const expirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY || "3600", 10);
```

이 값이 SAM Local 컨테이너 내부에서 제대로 해석되지 않습니다.

#### ❌ 작동하지 않는 방식

```bash
# 환경변수를 명시하지 않으면 실패
sam local invoke ListFunc \
  --parameter-overrides Stage=dev \
  --event -
```

**결과**: `undefined is not a valid S3 Bucket` 에러 발생

#### ✅ 작동하는 방식

```bash
# .env.json 파일로 명시적으로 환경변수 제공
sam local invoke ListFunc \
  --parameter-overrides Stage=dev \
  --env-vars .env.json \
  --event -
```

#### .env.json 파일 내용

**파일 위치**: `04-api-gateway-s3-sam/.env.json`

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
    "STAGE": "dev",
    "SIGNED_URL_EXPIRY": "3600"
  },
  "DelFunc": {
    "BUCKET_NAME": "api-s3-dev-840297437975",
    "BUCKET_REGION": "us-west-2",
    "STAGE": "dev",
    "SIGNED_URL_EXPIRY": "3600"
  },
  "ProcessFunc": {
    "BUCKET_NAME": "api-s3-dev-840297437975",
    "BUCKET_REGION": "us-west-2",
    "STAGE": "dev"
  }
}
```

#### 테스트 결과

| 상황             | 결과 | 파일 목록 조회                       |
| ---------------- | ---- | ------------------------------------ |
| `.env.json` 없음 | ❌   | `undefined is not a valid S3 Bucket` |
| `.env.json` 있음 | ✅   | `files: [...]` 성공                  |

#### 주의사항

- 각 Lambda 함수별로 `BUCKET_NAME` 환경변수 설정 필요
- 버킷명은 실제 AWS S3의 버킷명과 일치해야 함
- `SIGNED_URL_EXPIRY`는 선택사항 (기본값: 3600초)
- `BUCKET_REGION`은 선택사항 (기본값: us-west-2)

---

### 3️⃣ **IAM 사용자 권한 요구사항** (필수)

#### ⚠️ 중요: 다음 권한 중 **하나 이상**이 필수입니다

SAM Local에서 실제 AWS S3에 접근하려면 **로컬 머신의 IAM 사용자**에게 다음 중 **하나 이상**의 권한이 필요합니다:

| 권한                      | 범위            | 보안 수준 | 용도           |
| ------------------------- | --------------- | --------- | -------------- |
| `AdministratorAccess`     | 모든 AWS 서비스 | ⚠️ 낮음   | 개발 초기 단계 |
| `AmazonS3FullAccess`      | 모든 S3 버킷    | ⚠️ 보통   | S3 개발        |
| `S3SAMDevPolicy` (커스텀) | 특정 버킷만     | ✅ 높음   | 프로덕션 권장  |

#### ✅ 현재 상태

jasonkim 사용자는 **`AdministratorAccess`** 정책을 보유하고 있습니다:

```bash
# 권한 확인
aws iam list-groups-for-user --user-name jasonkim
# 결과: GroupName: admin (AdministratorAccess 포함)

# 또는
aws iam list-attached-user-policies --user-name jasonkim
# 결과: AmazonDynamoDBFullAccess, IAMReadOnlyAccess, LambdaSQSPolicy 등
```

따라서 **추가 권한 설정이 불필요**합니다. ✅

#### 권한 흐름 (실제 동작)

```
┌─────────────────────────────────────┐
│ 로컬 머신 (당신)                      │
│ IAM 사용자: jasonkim                │
│ 그룹: admin                         │
│ 권한: AdministratorAccess ✅        │
└────────────┬────────────────────────┘
             │ AWS 자격증명 (aws configure)
             │ (jasonkim의 Access Key)
             ▼
┌─────────────────────────────────────┐
│ SAM Local (Docker 컨테이너)         │
│ 호스트의 AWS 자격증명으로 실행       │
│ (jasonkim의 권한 = AdministratorAccess)
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ AWS S3 (클라우드)                   │
│ 버킷: api-s3-dev-840297437975      │
│ 리전: us-west-2                    │
│ ✅ 접근 가능 (admin 권한으로)       │
└─────────────────────────────────────┘
```

#### 📌 03 프로젝트(DynamoDB)와의 차이점

**03-hello-world-sam**에서는 처음에 SAM Local 테스트가 실패했습니다.

**실패 원인:**

- jasonkim 사용자가 당시 **단순 IAM 사용자**였음 (admin 그룹 미소속)
- DynamoDB 권한이 없어서 `Requested resource not found` 에러 발생
- **해결책**: `DynamoDBSAMDevPolicy` 인라인 정책을 **직접 추가**함

**현재 (04 프로젝트)와의 차이:**

- jasonkim이 이제 **`admin` 그룹**에 속함
- admin 그룹의 **`AdministratorAccess`** 정책이 자동으로 적용
- 모든 AWS 서비스(S3, DynamoDB 등)에 접근 가능
- **추가 권한 설정이 불필요**

```
시간순 IAM 권한 변화:
┌──────────────────────────────────────────┐
│ 03 프로젝트 초기 (실패 당시)               │
│ jasonkim: DynamoDB 권한 없음 ❌            │
│ 결과: SAM Local 테스트 실패                │
└──────────────────────────────────────────┘
            ↓ (DynamoDBSAMDevPolicy 추가)
┌──────────────────────────────────────────┐
│ 03 프로젝트 이후                           │
│ jasonkim: DynamoDB 권한 있음 ✅            │
│ 결과: SAM Local 테스트 성공                │
└──────────────────────────────────────────┘
            ↓ (jasonkim → admin 그룹 추가)
┌──────────────────────────────────────────┐
│ 04 프로젝트 (현재)                        │
│ jasonkim: admin 그룹 (모든 권한) ✅       │
│ 결과: SAM Local 테스트 성공                │
└──────────────────────────────────────────┘
```

#### ⚠️ 향후 다른 사용자를 위한 참고사항

만약 **다른 IAM 사용자**로 SAM Local을 실행하는 경우, 그 사용자에게 S3 권한을 추가해야 합니다.

(admin 그룹 미소속인 경우)

**옵션 A: 최소 권한 (권장, 안전) 🔒**

```bash
aws iam put-user-policy \
  --user-name <NEW_USER> \
  --policy-name S3SAMDevPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:HeadObject",
          "s3:GetObjectVersion"
        ],
        "Resource": [
          "arn:aws:s3:::api-s3-dev-840297437975",
          "arn:aws:s3:::api-s3-dev-840297437975/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:us-west-2:*:log-group:/aws/lambda/*"
      }
    ]
  }'
```

**옵션 B: 전체 S3 접근 (광범위) 🔓**

```bash
aws iam attach-user-policy \
  --user-name <NEW_USER> \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

#### 권한 확인 (검증 용도)

```bash
# 직접 가진 정책 확인
aws iam list-attached-user-policies --user-name jasonkim

# 그룹을 통해 상속된 권한
aws iam list-groups-for-user --user-name jasonkim
aws iam list-attached-group-policies --group-name admin
```

#### 테스트 결과

| IAM 권한       | 결과 | 파일 목록 조회       |
| -------------- | ---- | -------------------- |
| 없음           | ❌   | `Access Denied` 에러 |
| 있음 (S3 권한) | ✅   | `files: [...]` 성공  |

---

## ⚠️ 필수 권한 요구사항

### **반드시 명시**: 다음 중 하나 이상의 권한이 필수입니다

SAM Local에서 **실제 AWS S3에 접근**하려면, 로컬 IAM 사용자가 다음 중 **하나 이상**의 권한을 반드시 가져야 합니다:

```
┌────────────────────────────────────────┐
│ SAM Local + AWS S3 테스트 가능 조건      │
├────────────────────────────────────────┤
│ 필수 권한 (3가지 중 선택):              │
│                                        │
│ 1. AdministratorAccess                │
│    └─ 모든 AWS 서비스 접근            │
│    └─ 개발 초기 단계 권장             │
│                                        │
│ 2. AmazonS3FullAccess                 │
│    └─ 모든 S3 버킷 접근               │
│    └─ S3 전용 개발 권장               │
│                                        │
│ 3. S3SAMDevPolicy (커스텀)            │
│    └─ 특정 S3 버킷만 접근             │
│    └─ 프로덕션 환경 권장              │
└────────────────────────────────────────┘

권한 없음 = 테스트 불가능 ❌
```

#### 권한이 없을 때의 오류

```bash
# 권한이 없는 상태에서 SAM Local 실행
$ sam local invoke ListFunc --env-vars .env.json --event -

❌ Error:
User: arn:aws:iam::840297437975:user/jasonkim
is not authorized to perform: s3:ListBucket
on resource: arn:aws:s3:::api-s3-dev-840297437975
```

#### 권한 추가 방법

**옵션 1: admin 그룹 추가 (가장 빠름, 권장하지 않음) 🔓**

```bash
aws iam add-user-to-group \
  --user-name <USER_NAME> \
  --group-name admin
# 결과: 모든 AWS 서비스 접근 가능
```

**옵션 2: AmazonS3FullAccess 정책 추가 (S3 전용) 🔓**

```bash
aws iam attach-user-policy \
  --user-name <USER_NAME> \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
# 결과: 모든 S3 버킷 접근 가능
```

**옵션 3: 최소 권한 정책 추가 (권장, 안전) 🔒**

```bash
aws iam put-user-policy \
  --user-name <USER_NAME> \
  --policy-name S3SAMDevPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:HeadObject",
          "s3:GetObjectVersion"
        ],
        "Resource": [
          "arn:aws:s3:::api-s3-dev-840297437975",
          "arn:aws:s3:::api-s3-dev-840297437975/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:us-west-2:*:log-group:/aws/lambda/*"
      }
    ]
  }'
# 결과: api-s3-dev-840297437975 버킷만 접근 가능
```

---

## 🧪 통합 테스트

### 3가지 변경사항이 모두 적용된 상태에서 테스트

```bash
# 빌드
sam build

# 개별 함수 테스트 - ListFiles
sam local invoke ListFunc \
  --parameter-overrides Stage=dev \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "httpMethod": "GET",
  "path": "/files",
  "queryStringParameters": null
}
EOF

# 개별 함수 테스트 - UploadFile
sam local invoke UploadFunc \
  --parameter-overrides Stage=dev \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "httpMethod": "POST",
  "path": "/files/upload",
  "body": "{\"fileName\":\"test.txt\"}"
}
EOF
```

### ✅ 성공 응답 (ListFiles)

```json
{
  "statusCode": 200,
  "body": {
    "bucket": "api-s3-dev-840297437975",
    "fileCount": 2,
    "files": [
      {
        "key": "test-file-1.txt",
        "size": 1024,
        "lastModified": "2025-12-29T10:30:00.000Z",
        "storageClass": "STANDARD"
      },
      {
        "key": "test-file-2.txt",
        "size": 2048,
        "lastModified": "2025-12-29T10:35:00.000Z",
        "storageClass": "STANDARD"
      }
    ],
    "prefix": "/"
  }
}
```

### ✅ 성공 응답 (UploadFile)

```json
{
  "statusCode": 200,
  "body": {
    "uploadUrl": "https://api-s3-dev-840297437975.s3.us-west-2.amazonaws.com/uploads/1766963522932-test.txt?X-Amz-Algorithm=...",
    "bucket": "api-s3-dev-840297437975",
    "key": "uploads/1766963522932-test.txt",
    "expiresIn": 3600,
    "instructions": "Use PUT request with the uploadUrl to upload file"
  }
}
```

---

## 📝 변경사항 요약

| #   | 변경사항             | 파일               | 내용                  | 필수여부 |
| --- | -------------------- | ------------------ | --------------------- | -------- |
| 1   | S3 리전 Hardcoding   | `handlers/s3.js`   | `region: "us-west-2"` | ✅ 필수  |
| 2   | 환경변수 파일 생성   | `.env.json` (신규) | `BUCKET_NAME` 등 설정 | ✅ 필수  |
| 3   | IAM 사용자 권한 추가 | AWS 계정           | S3 접근 권한 부여     | ✅ 필수  |

---

## 🔄 LocalStack vs AWS S3

### SAM Local + LocalStack (로컬 완전 폐쇄)

```
당신의 컴퓨터
  ↓
SAM Local + LocalStack (Docker)
  ↓
로컬 가상 S3
```

- ✅ AWS 자격증명 불필요
- ✅ 빠른 실행
- ❌ 실제 AWS 환경과 차이 가능

### SAM Local + AWS S3 (이 가이드) ⭐

```
당신의 컴퓨터 (IAM 권한 필요)
  ↓
SAM Local (Docker)
  ↓
실제 AWS S3
```

- ✅ 실제 AWS 환경과 동일
- ✅ 클라우드 배포 전 최종 테스트
- ❌ AWS 자격증명 필요
- ❌ AWS 비용 발생 (매우 적음, 테스트용)

---

## 🚀 다음 단계

### 1단계: 3가지 변경사항 모두 적용 ✅

```bash
# handlers/s3.js 리전 hardcoding 확인
grep "region: \"us-west-2\"" handlers/s3.js

# .env.json 파일 생성 확인
test -f .env.json && echo "✅ .env.json exists"

# IAM 권한 확인
aws iam get-user-policy --user-name jasonkim --policy-name S3SAMDevPolicy
```

### 2단계: SAM Local로 개발/테스트

```bash
# 개별 함수 테스트
sam local invoke ListFunc --env-vars .env.json --event -

# 또는 API Gateway로 로컬 서버 실행
sam local start-api --env-vars .env.json --port 3000
```

### 3단계: CloudFormation으로 AWS에 배포

```bash
sam build
sam deploy
```

### 4단계: 클라우드에서 최종 테스트

```bash
# 배포된 API 엔드포인트 확인
aws cloudformation describe-stacks \
  --stack-name api-s3-fileupload-sam-dev \
  --region us-west-2 \
  --query 'Stacks[0].Outputs'

# API 호출
curl https://w4tjnuge4j.execute-api.us-west-2.amazonaws.com/dev/files
```

---

## ❓ FAQ

### Q1: 왜 리전을 hardcoding해야 하나요?

A: SAM Local Docker 컨테이너는 호스트의 환경변수를 완전히 상속받지 못합니다. 동적 설정은 컨테이너 내부에서 `undefined`가 될 수 있어서 SDK 초기화에 실패합니다.

### Q2: .env.json 파일을 항상 필요한가요?

A: 예. SAM Local은 CloudFormation 변수 치환을 지원하지 않으므로, 환경변수를 명시적으로 제공해야 합니다.

### Q3: IAM 권한은 왜 필요한가요?

A: SAM Local은 당신의 AWS 자격증명으로 실행됩니다. 따라서 IAM 사용자(당신)가 S3 버킷에 접근할 권한을 가져야 합니다.

### Q4: 프로덕션에서도 이렇게 설정해야 하나요?

A: 아니요. 프로덕션에서는:

- Lambda 함수의 IAM Role이 자동으로 권한을 제공 (template.yaml에서 설정)
- IAM 사용자 권한은 필요 없음
- 리전을 hardcoding할 필요도 없음 (자동으로 처리)

### Q5: LocalStack과 AWS S3를 동시에 사용할 수 있나요?

A: 예. 코드에서 `S3_LOCAL_ENDPOINT` 환경변수 확인하는 로직이 있으므로:

```bash
# LocalStack 테스트
S3_LOCAL_ENDPOINT=http://localhost:4566 npm test

# AWS S3 테스트
sam local invoke ListFunc --env-vars .env.json --event -
```

### Q6: 실제 S3 비용이 얼마나 드나요?

A: ListBucket, GetObject, HeadObject는 거의 무료입니다.

- ListBucket: $0.005 per 1,000 requests
- GetObject: $0.0004 per 1,000 requests
- HeadObject: $0.0004 per 1,000 requests

테스트용으로는 월 1달러 미만입니다.

---

## 📚 참고자료

- [AWS SAM Local Testing](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-local-testing.html)
- [S3 IAM Permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html)
- [AWS SDK for JavaScript - S3Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [S3 Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

---

**최종 수정일**: 2025-12-29  
**작성자**: SAM Local AWS S3 연동 테스트  
**상태**: ✅ DynamoDB 가이드 기반 작성
