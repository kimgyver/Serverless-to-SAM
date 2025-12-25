# 📌 예제들의 상태: Serverless vs SAM

## ✅ Phase 1: Serverless Framework (완료)

### examples/01-hello-world

**→ `serverless.yml` = Serverless Framework**

```yaml
service: hello-world-lambda

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}
  iam:
    role:
      statements:
        - Effect: Allow
          Action: logs:*
          Resource: "*"

  environment:
    STAGE: ${self:provider.stage}
```

✅ 배포 가능 (npm run deploy)

**포함 내용**:

- 4개 HTTP 핸들러 (sayHello, greet, createMessage, divide)
- 경로 파라미터, POST 바디, 에러 처리
- 구조화된 로깅

---

### examples/02-api-gateway-s3

**→ `serverless.yml` = Serverless Framework**

```yaml
service: api-gateway-s3-lambda

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}
  iam:
    role:
      name: ApiS3Role-${self:provider.stage}
      statements:
        - Effect: Allow
          Action: [s3:ListBucket, s3:GetObject, s3:PutObject]
```

✅ 배포 가능 (npm run deploy)

**포함 내용**:

- 5개 S3 핸들러 (listFiles, uploadFile, getFile, deleteFile, processUpload)
- Pre-signed URL (PUT/GET)
- S3 이벤트 트리거
- S3 버킷 정의 (resources 섹션)

---

## ✅ Phase 2: SAM (완료)

### examples/03-hello-world-sam

**→ `template.yaml` = AWS SAM**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
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
    ...

  SayHelloFunction:
    Type: AWS::Serverless::Function
    ...
```

✅ 배포 가능 (sam deploy)

**핵심 학습**:

- Parameters: 배포 시 입력값 (Stage=dev, prod 등)
- Globals: 모든 함수 공통 설정
- IAM Role: 명시적 권한 정의
- CloudWatch Alarms: 에러 모니터링

**상세 가이드**: [examples/03-hello-world-sam/README.md](./examples/03-hello-world-sam/README.md) (약 600줄)

---

### examples/04-api-gateway-s3-sam

**→ `template.yaml` = AWS SAM + S3 연동**

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Resources:
  FileUploadBucket:
    Type: AWS::S3::Bucket

  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Policies:
      - S3Access (ListBucket, GetObject, PutObject)

  ListFilesFunction:
    Type: AWS::Serverless::Function
    Events:
      - Type: Api

  ProcessUploadFunction:
    Type: AWS::Serverless::Function
    Events:
      - Type: S3 # S3 이벤트 트리거
```

✅ 배포 가능 (sam deploy)

**핵심 학습**:

- S3 버킷 정의 및 정책 (PublicAccessBlock, HTTPS 강제)
- S3 → Lambda 권한 (AWS::Lambda::Permission)
- Pre-signed URL (안전한 파일 업로드/다운로드)
- S3 이벤트 필터 (prefix, suffix)

**상세 가이드**: [examples/04-api-gateway-s3-sam/README.md](./examples/04-api-gateway-s3-sam/README.md) (약 700줄)

---

## 🎯 왜 이 순서로 구성했나?

### 1️⃣ **Serverless Framework 먼저**

**이유**:

- 회사에서 현재 사용 중
- YAML이 더 간결하고 읽기 쉬움
- 자동 CloudFormation 생성 (내부 복잡성 숨겨짐)

**학습 효과**:

- 회사 코드 즉시 이해 가능
- 빠른 배포 경험

### 2️⃣ **SAM으로 변환하면서 배우기**

**변환 과정**:

- `service` → AWSTemplateFormatVersion + Transform
- `provider.stage` → `Parameters.Stage`
- `provider.environment` → `Globals.Function.Environment`
- `provider.iam` → 명시적 `AWS::IAM::Role`
- `functions.xxx` → `Resources.XxxFunction (AWS::Serverless::Function)`

**학습 효과**:

1. ✨ Serverless가 무엇을 숨기는지 파악
2. 🔍 실제 CloudFormation 구조 이해
3. 📚 AWS 리소스 명시적 관리법 학습

### 3️⃣ **최종 마이그레이션 가이드**

문서: `SAM-MIGRATION-GUIDE.md`

- Phase 1: 기존 serverless.yml 분석
- Phase 2: template.yaml 생성 (섹션별)
- Phase 3: 로컬 테스트
- Phase 4: AWS 배포
- 공통 패턴 및 FAQ

---

## 🎯 왜 Serverless Framework로?

**Day 1-2 학습 목표**:

> **Serverless Framework를 완벽히 이해하기**

그래야 **SAM으로 변환할 때**:

- "Serverless의 이 부분이 SAM에서 뭐가 되는지" 알 수 있음
- SERVERLESS-TO-SAM-MAPPING.md에서 변환 방법 배우기

---

## 🚀 다음 단계 (Week 2-3에서)

### Phase 1: 현재 예제 이해

```
✅ examples/01-hello-world (Serverless)
✅ examples/02-api-gateway-s3 (Serverless)
→ 이 둘을 완벽히 이해
```

### Phase 2: SAM으로 변환 (예정)

```
[ ] examples/01-hello-world/template.yaml (SAM 버전)
[ ] examples/02-api-gateway-s3/template.yaml (SAM 버전)
→ 같은 기능을 SAM으로 재작성
→ 두 버전 비교
```

### Phase 3: SAM 심화

```
[ ] SAM CLI (sam init, sam build, sam deploy)
[ ] SAM local 테스트
[ ] Globals, Parameters 활용
```

---

## 📊 비교표

| 항목                  | 현재 상태               | 향후 계획        |
| --------------------- | ----------------------- | ---------------- |
| **01-hello-world**    | Serverless Framework ✅ | SAM 변환 예정    |
| **02-api-gateway-s3** | Serverless Framework ✅ | SAM 변환 예정    |
| **학습 순서**         | 1. Serverless 완벽 이해 | 2. SAM 변환 학습 |
| **배포 방법**         | `npm run deploy`        | `sam deploy`     |

---

## 💡 왜 이 순서인가?

### Serverless Framework 먼저 배우는 이유

```
회사 현황: Serverless Framework 사용 중

문제: 구조가 복잡해서 이해 못 함
      ↓
해결: Serverless를 완벽히 이해
      ↓
      → CloudFormation이 뭔지 알게 됨
      → 각 리소스가 뭔지 알게 됨
      ↓
그 후: SAM으로 변환?
      → "아, Serverless의 이 부분이
         SAM에서 이렇게 되는구나!" 명확
```

### 반대로 하면 (SAM부터)

```
❌ SAM 배우기 → "provider가 뭐하는 거지?"
❌ CloudFormation 문법 → "왜 이렇게 복잡해?"
❌ "어차피 Serverless도 배워야 하는데..."
```

---

## 🎯 지금 하면 좋은 것

### 1️⃣ 현재 예제들 완벽히 이해

```bash
# 배포
cd examples/01-hello-world
npm run deploy

# AWS 콘솔에서 확인
# - Lambda 함수
# - API Gateway
# - CloudFormation 스택

# serverless.yml의 각 부분이 뭘 만드는지 이해
```

### 2️⃣ SERVERLESS-TO-SAM-MAPPING.md와 비교

```
"Serverless의 provider → SAM의 뭐가 되나?"
"Serverless의 functions → SAM의 뭐가 되나?"
→ 이제 명확하게 보일 거예요!
```

### 3️⃣ 회사 코드 분석

```
"기존 serverless.yml의 이 부분이
 SAM에서 어떻게 되겠다"
→ 예측 가능해짐
```

---

## 📌 요약

| 예제                  | 현재 형식            | 용도            |
| --------------------- | -------------------- | --------------- |
| **01-hello-world**    | Serverless Framework | Day 1 기본 학습 |
| **02-api-gateway-s3** | Serverless Framework | Day 2 심화 학습 |
| **목표**              | Serverless 완벽 이해 | SAM 변환의 기초 |

---

**지금 순서가 맞습니다!** ✅

- ✅ Serverless Framework 예제들 (현재)
- → SAM 변환 학습 (다음)
- → SAM 예제들 작성 (그 다음)

이 순서대로 하면 **회사의 Serverless → SAM 마이그레이션**도 자신감 있게 할 수 있어요! 🚀
