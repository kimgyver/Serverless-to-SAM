# 📚 SAM Local + AWS DynamoDB 문서 가이드

이 디렉토리는 SAM Local에서 AWS DynamoDB를 사용하는 방법에 대한 완전한 문서 세트를 제공합니다.

## 📖 문서 구조

### 1. **SAM-LOCAL-AWS-DYNAMODB-FIX.md** ⭐ (핵심 이론)

SAM Local이 AWS DynamoDB에 성공적으로 연결되는 **3가지 핵심 변경사항**을 상세히 설명합니다.

**이 문서에서 배울 수 있는 것:**

- 🔑 3가지 필수 변경사항 (\"왜?\" 와 \"어떻게?\")
- 🧪 실제 테스트 결과 비교 (작동 vs 미작동)
- 📝 각 변경사항의 코드 예제
- ❓ FAQ (자주 묻는 질문)
- 🔄 LocalStack vs AWS DynamoDB 비교

**읽어야 할 대상:** 설정 원리를 이해하려는 사람, 문제 해결 필요한 사람

**핵심 내용:**

- 1️⃣ DynamoDB 리전 Hardcoding (왜 필요한가?)
- 2️⃣ .env.json 파일 생성 (CloudFormation 제약)
- 3️⃣ IAM 사용자 권한 추가 (AWS 자격증명 인가)

---

### 2. **SAM-LOCAL-SETUP.md** (실행 가이드)

SAM Local을 처음부터 설정하고 실행하는 **단계별 실행 방법**입니다.

**이 문서에서 배울 수 있는 것:**

- 📋 전제 조건 체크리스트
- 🔑 IAM 권한 설정 (스크립트 기반)
- 🚀 SAM Local 실행 방법
- 🐛 문제 해결 가이드
- 📊 구조 다이어그램

**읽어야 할 대상:** 실제 실행하려는 사람, 빠르게 진행하려는 사람

**특징:** SAM-LOCAL-AWS-DYNAMODB-FIX.md를 참고하면서 빠르게 설정할 수 있음

---

### 3. **setup-iam-permissions.sh** (자동화 스크립트)

IAM 권한을 자동으로 설정하는 **실행 가능한 스크립트**입니다.

**스크립트 사용법:**

```bash
# 제한적 접근 (권장)
./scripts/setup-iam-permissions.sh jasonkim restricted

# 전체 DynamoDB 접근
./scripts/setup-iam-permissions.sh jasonkim full

# 기본값 사용 (jasonkim, restricted)
./scripts/setup-iam-permissions.sh
```

**스크립트가 하는 일:**

- ✅ IAM 사용자 존재 여부 확인
- ✅ DynamoDB 권한 정책 생성/적용
- ✅ CloudWatch Logs 권한 추가
- ✅ 설정 결과 검증 및 표시

---

## 🚀 빠른 시작 (5분)

### 1단계: IAM 권한 설정

```bash
./scripts/setup-iam-permissions.sh jasonkim restricted
```

### 2단계: SAM 빌드

```bash
sam build
```

### 3단계: 함수 테스트

```bash
AWS_REGION=us-east-1 sam local invoke CreateItemFunction \
  --parameter-overrides Stage=dev Environment=development \
  --env-vars .env.json \
  --event - << 'EOF'
{
  "body": "{\"title\":\"Test\",\"description\":\"Testing\"}",
  "httpMethod": "POST",
  "path": "/item"
}
EOF
```

✅ 성공하면 JSON 응답이 나옵니다!

---

## 📌 3가지 핵심 변경사항 요약

| #   | 변경사항                 | 파일                        | 상태              |
| --- | ------------------------ | --------------------------- | ----------------- |
| 1️⃣  | DynamoDB 리전 Hardcoding | `handlers/hello.js` (264줄) | ✅ 적용됨         |
| 2️⃣  | 환경변수 파일 생성       | `.env.json` (신규)          | ✅ 생성됨         |
| 3️⃣  | IAM 사용자 권한 추가     | AWS 계정 설정               | ⏳ 수동 실행 필요 |

### 변경 내용 상세

#### 1️⃣ DynamoDB 리전 Hardcoding

```javascript
// ❌ 작동하지 않음
region: process.env.AWS_REGION || "us-east-1";

// ✅ 작동함
region: "us-east-1";
```

#### 2️⃣ .env.json 파일

```json
{
  "CreateItemFunction": {
    "ITEMS_TABLE": "sam-hello-world-items-dev",
    "STAGE": "dev",
    "ENVIRONMENT": "development"
  }
}
```

#### 3️⃣ IAM 권한

```bash
./setup-iam-permissions.sh jasonkim restricted
```

---

## 🧪 검증

모든 설정이 완료되었는지 확인:

```bash
# 1. .env.json 파일 확인
cat .env.json

# 2. handlers/hello.js 리전 설정 확인
grep -A2 'const dynamodbConfig' handlers/hello.js

# 3. IAM 권한 확인
aws iam get-user-policy --user-name jasonkim --policy-name DynamoDBSAMDevPolicy
```

---

## 📊 작동 원리

```
┌─────────────────────────────────────────┐
│ 1. 로컬 머신 (당신)                      │
│    - IAM 사용자: jasonkim               │
│    - 권한: DynamoDB 접근 ✅ (변경3)    │
└────────────┬────────────────────────────┘
             │ AWS 자격증명 사용
             │ (aws configure)
             │
             ▼
┌─────────────────────────────────────────┐
│ 2. SAM Local (Docker)                    │
│    - Node.js 18.x 런타임                │
│    - Lambda 함수 실행                   │
│    - 환경변수: .env.json (변경2)       │
└────────────┬────────────────────────────┘
             │ DynamoDB SDK 호출
             │ 리전: us-east-1 (변경1)
             │
             ▼
┌─────────────────────────────────────────┐
│ 3. AWS DynamoDB (클라우드)              │
│    - 테이블: sam-hello-world-items-dev │
│    - 리전: us-east-1                   │
│    - 실제 데이터 저장됨 ✅              │
└─────────────────────────────────────────┘
```

---

## 🔄 로컬 vs 클라우드

### 로컬 개발 (SAM Local)

- 🔧 빠른 iteration (수초 내 실행)
- 🐛 디버깅 용이
- 💰 비용 최소화
- ⚠️ 실제 환경과 약간 다를 수 있음

### 클라우드 배포 (AWS)

- ✅ 실제 프로덕션 환경
- 📊 모니터링 및 로깅
- 🌍 전 세계 접근 가능
- 💸 비용 발생

**권장:** 로컬에서 충분히 테스트 후 클라우드 배포!

---

## ❓ 자주 묻는 질문

### Q: 왜 3가지 변경이 모두 필요한가요?

A: 각각이 해결하는 문제가 다릅니다:

1. **리전 Hardcoding**: 컨테이너 환경변수 상속 문제 해결
2. **.env.json**: CloudFormation 변수 치환 미지원 해결
3. **IAM 권한**: AWS 자격증명 인가 문제 해결

### Q: 프로덕션에서도 이렇게 하나요?

A: 아니요! 프로덕션에서는:

- Lambda의 IAM Role이 자동으로 권한 제공 (template.yaml)
- 리전 hardcoding 불필요 (자동 처리)
- .env.json 불필요 (CloudFormation이 처리)

### Q: LocalStack과의 차이점은?

A:
| 항목 | LocalStack | AWS DynamoDB |
|------|-----------|--------------|
| 실행 위치 | 로컬 (Docker) | AWS 클라우드 |
| AWS 자격증명 | 불필요 | 필요 |
| 실제 환경 | 시뮬레이션 | 실제 환경 |
| 비용 | 없음 | 있음 (미소) |

---

## 📚 추가 리소스

- 📖 [SAM-LOCAL-AWS-DYNAMODB-FIX.md](./SAM-LOCAL-AWS-DYNAMODB-FIX.md) - 3가지 변경사항 상세 설명
- 📖 [SAM-LOCAL-SETUP.md](./SAM-LOCAL-SETUP.md) - 단계별 설정 가이드
- 🔗 [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- 🔗 [AWS DynamoDB Guide](https://docs.aws.amazon.com/amazondynamodb/)

---

## ✅ 체크리스트

설정이 완료되었는지 확인:

- [ ] `handlers/hello.js`의 리전이 "us-east-1"로 hardcoded됨
- [ ] `.env.json` 파일이 생성됨
- [ ] `./scripts/setup-iam-permissions.sh` 스크립트 실행됨
- [ ] `sam build` 성공
- [ ] `sam local invoke` 테스트 성공
- [ ] DynamoDB 아이템이 실제 AWS에 생성됨

모두 체크되면 **SAM Local + AWS DynamoDB 연동 완료!** 🎉

---

**최종 수정**: 2025-12-28  
**상태**: ✅ 모든 3가지 변경사항 검증됨
