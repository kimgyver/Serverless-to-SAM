# 🚀 Serverless Framework → SAM 완벽 학습 가이드

> **최종 완성**: Serverless Framework에서 SAM으로의 마이그레이션 완전 학습 자료
>
> ✅ Week 1: Serverless Framework 마스터 (완료)  
> ✅ Week 2-3: SAM 마이그레이션 (완료)

---

## ⚡ 읽기 전에 꼭 먼저 보세요!

👉 **[00-학습순서.md](./00-학습순서.md)**

- 12개 문서 중 "정확히 어떤 순서로" 읽을지 3분 안에 알려줍니다
- 당신의 상황에 맞는 3가지 경로 제시
- Day별 구체적인 학습 계획 포함

**정확한 학습 순서를 모르면 헷갈리니까 이것부터 보세요!** ⬆️

---

## 📖 이 저장소는?

**Serverless Framework에서 AWS SAM으로 마이그레이션**하기 위한 완전한 학습 자료입니다.

- ✅ Serverless Framework 개념 완벽 이해 (4개 핸들러 실습)
- ✅ SAM 완전 이해 (4개 핸들러 실습)
- ✅ 4개 배포 가능한 예제 (Serverless 2개 + SAM 2개)
- ✅ 9단계 마이그레이션 완전 가이드
- ✅ CloudFormation 핵심 개념 5가지

---

## 🎯 학습 경로

### **Week 1: Serverless Framework 마스터** ✅ 완료

| 주제                           | 시간      | 자료                                                           |
| ------------------------------ | --------- | -------------------------------------------------------------- |
| Serverless Framework 이론      | 1시간     | [01-SERVERLESS-BASICS.md](./01-SERVERLESS-BASICS.md)           |
| CloudFormation 5가지           | 1시간     | [CLOUDFORMATION-CHEATSHEET.md](./CLOUDFORMATION-CHEATSHEET.md) |
| 예제 1: Hello World (4 핸들러) | 2시간     | [examples/01-hello-world/](./examples/01-hello-world/)         |
| 예제 2: API + S3 (5 핸들러)    | 2시간     | [examples/02-api-gateway-s3/](./examples/02-api-gateway-s3/)   |
| 빠른 참고                      | 필요할 때 | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)                     |

### **Week 2-3: SAM 마이그레이션** ✅ 완료

| 주제                                     | 시간  | 자료                                                                 |
| ---------------------------------------- | ----- | -------------------------------------------------------------------- |
| Serverless → SAM 변환 맵핑               | 1시간 | [SERVERLESS-TO-SAM-MAPPING.md](./SERVERLESS-TO-SAM-MAPPING.md)       |
| 완전한 마이그레이션 프로세스 (Phase 1-4) | 2시간 | [SAM-MIGRATION-GUIDE.md](./SAM-MIGRATION-GUIDE.md)                   |
| 예제 3: SAM 기본 (4 핸들러)              | 2시간 | [examples/03-hello-world-sam/](./examples/03-hello-world-sam/)       |
| 예제 4: SAM + S3 (5 핸들러)              | 2시간 | [examples/04-api-gateway-s3-sam/](./examples/04-api-gateway-s3-sam/) |
| 완료 요약                                | 30분  | [SAM-COMPLETION-GUIDE.md](./SAM-COMPLETION-GUIDE.md)                 |

---

## 🔑 핵심 개념 (꼭 알아야 할 것)

### ⚠️ 혼동하는 사람들을 위한 핵심 질문

**"Serverless와 SAM 모두 CloudFormation으로 변환되는데, 왜 문법이 다르지?"**

👉 **[CloudFormation-정확한-관계도.md](./CloudFormation-정확한-관계도.md)**

- 3가지 도구의 정확한 관계 설명
- 왜 문법이 다른지 이해
- 추상화 레벨 비교
- 변환 과정 상세 분석

**헷갈리면 이 파일부터 읽으세요!** ⬆️

---

### CloudFormation 5가지

- **`!Ref`** - 리소스 ID/이름 참조
- **`!GetAtt`** - 리소스 속성 (ARN 등) 가져오기
- **`!Sub`** - 문자열 변수 삽입
- **`Parameters`** - 배포 시 입력값
- **`Globals`** - 모든 함수 공통 설정

👉 [CLOUDFORMATION-CHEATSHEET.md](./CLOUDFORMATION-CHEATSHEET.md) 상세 설명

---

## 📁 폴더 구조

```
sam-learning/
│
├── 📄 README.md                          ← 지금 보는 파일
├── 📄 00-LEARNING-ROADMAP.md             ← 전체 로드맵
├── 📄 01-SERVERLESS-BASICS.md            ← Day 1 완전 가이드
├── 📄 QUICK-REFERENCE.md                 ← 빠른 참고
├── 📄 SERVERLESS-TO-SAM-MAPPING.md       ← 변환 맵핑 (🌟 중요!)
│
├── 📁 examples/                          ← 실습 프로젝트들
│   ├── 01-hello-world/                   ← Day 1-1: 기본 Lambda + API GW
│   │   ├── serverless.yml
│   │   ├── handlers/hello.js
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── 02-api-gateway-s3/                ← Day 1-2: API GW + S3 이벤트
│       ├── serverless.yml
│       ├── handlers/s3.js
│       ├── package.json
│       └── README.md
│
├── 📁 comparison/                        ← SAM과의 비교 (예정)
│   └── serverless-vs-sam.md
│
└── 📁 checklists/                        ← 체크리스트들
    ├── deployment-checklist.md
    └── troubleshooting.md
```

---

## 🚀 빠른 시작 (Week 1 기준: 5분 안내)

### 학습 순서

```
Step 1: 문서 읽기 (Week 1)
  1️⃣ 이 파일 (README.md)
  2️⃣ 01-SERVERLESS-BASICS.md
  3️⃣ CLOUDFORMATION-CHEATSHEET.md (기본 개념)
  4️⃣ QUICK-REFERENCE.md (CLI & 패턴)

Step 2: 예제 배포 (Week 1)
  1️⃣ examples/01-hello-world (npm run deploy)
  2️⃣ examples/02-api-gateway-s3 (npm run deploy)

Step 3: 변환 학습 (Week 2-3)
  1️⃣ SERVERLESS-TO-SAM-MAPPING.md (섹션별 변환)
  2️⃣ SAM-MIGRATION-GUIDE.md (4단계 프로세스)

Step 4: SAM 배포 (Week 2-3)
  1️⃣ examples/03-hello-world-sam (sam deploy)
  2️⃣ examples/04-api-gateway-s3-sam (sam deploy)

Step 5: 마무리 (Week 2-3)
  1️⃣ SAM-COMPLETION-GUIDE.md (종합 정리)
```

### 각 예제 빠른 배포

```bash
# Week 1: Serverless Framework

# Example 1: Hello World
cd examples/01-hello-world
npm install
npm run offline              # 로컬 테스트
npm run deploy               # AWS 배포

# Example 2: API Gateway + S3
cd examples/02-api-gateway-s3
npm install
npm run offline              # 로컬 테스트
npm run deploy               # AWS 배포

---

# Week 2-3: SAM (CloudFormation) ⭐ NEW

# Example 3: Hello World (SAM)
cd examples/03-hello-world-sam
npm install
sam build
sam deploy --guided          # 첫 배포 시 --guided

# Example 4: API Gateway + S3 (SAM)
cd examples/04-api-gateway-s3-sam
npm install
sam build
sam deploy                    # 이후 배포 (설정 재사용)
```

---

## 🎓 Week 1-3 핵심 개념

### Week 1: Serverless Framework

#### 1️⃣ Service = CloudFormation 스택

```yaml
service: my-api
# 배포 시: my-api-dev, my-api-prod 등 스택 생성
```

#### 2️⃣ Provider = 모든 Lambda의 기본 설정

```yaml
provider:
  iam:
    role.statements    # 권한 정의 (모든 함수 공유)
  environment          # 환경변수 (모든 함수 공유)
```

#### 3️⃣ Functions = Lambda 배치

```yaml
functions:
  myFunc:
    handler: path.js
    events: # 언제/어떻게 실행되는가
      - http: GET /path
      - s3: bucket-name
      - schedule: cron(...)
```

#### 4️⃣ Events = 다양한 트리거

| 이벤트   | 동작   | 예시             |
| -------- | ------ | ---------------- |
| http     | 동기   | API 호출         |
| s3       | 비동기 | 파일 업로드 감지 |
| sqs      | 비동기 | 큐 메시지 처리   |
| schedule | 비동기 | 매일 정시 실행   |

#### 5️⃣ Resources = CloudFormation 리소스

```yaml
resources:
  Resources:
    MyTable: # DynamoDB, S3, etc
      Type: AWS::DynamoDB::Table
```

### Week 2-3: SAM (CloudFormation) ⭐ NEW

#### 1️⃣ `!Ref` - 리소스 참조

```yaml
bucket: !Ref S3Bucket # S3Bucket 리소스 ID 가져오기
```

#### 2️⃣ `!GetAtt` - 리소스 속성

```yaml
BucketArn: !GetAtt S3Bucket.Arn # ARN 같은 속성 가져오기
```

#### 3️⃣ `!Sub` - 문자열 변수 삽입

```yaml
Resource: !Sub "arn:aws:s3:::${BucketName}/*"
```

#### 4️⃣ `Parameters` - 배포 입력값

```yaml
Parameters:
  Stage:
    Type: String
    Default: dev
    AllowedValues: [dev, prod]
```

#### 5️⃣ `Globals` - 공통 설정

```yaml
Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    MemorySize: 256
```

👉 자세한 설명: [CLOUDFORMATION-CHEATSHEET.md](./CLOUDFORMATION-CHEATSHEET.md)

---

## 📊 배운 후 할 수 있는 것

### Week 1: Serverless Framework ✅ 완료

- [x] serverless.yml의 모든 섹션 의미 이해
- [x] Lambda handler 함수 시그니처 작성
- [x] API Gateway와 Lambda 통합
- [x] S3, SQS, DynamoDB 이벤트 트리거
- [x] IAM 권한 설정
- [x] 프로젝트 배포 (dev/prod)
- [x] CloudWatch Logs 확인

### Week 2-3: SAM (CloudFormation) ✅ 완료 ⭐ NEW

- [x] template.yaml 작성 및 배포
- [x] CloudFormation 명시적 리소스 정의
- [x] SAM CLI (sam build, sam deploy)
- [x] Serverless → SAM 변환 과정
- [x] 각 섹션의 맵핑 이해
- [x] S3 bucket + IAM role 직접 정의
- [x] 두 프레임워크 비교 분석

---

## 🔑 학습의 의미

### Serverless Framework vs SAM

```
[Serverless Framework]
├─ ✅ 장점:
│  ├─ 빠른 개발 (간단한 문법)
│  ├─ 풍부한 플러그인
│  └─ 배우기 쉬움
│
└─ ❌ 한계:
   ├─ CloudFormation 자동 생성 (숨겨짐)
   ├─ 리소스 구조 파악 어려움
   └─ AWS 표준 도구 아님

        ↓↓↓ [이 학습 자료] ↓↓↓

[AWS SAM]
├─ ✅ 이점:
│  ├─ CloudFormation 직접 노출 (명확함)
│  ├─ AWS 공식 도구 (표준)
│  └─ Infrastructure as Code 이해
│
└─ 📊 특징:
   ├─ 로직은 동일 ✅ (handler)
   ├─ IaC 방식만 다름 🔄
   │  ├─ serverless.yml → template.yaml
   │  ├─ 리소스 직접 정의
   │  └─ CloudFormation 문법
   └─ 결과는 같은 Lambda 함수
```

### 핵심 학습 목표

> **"로직은 100% 유지하고, 배포 방식만 AWS 표준으로 변경"**

- handler 함수: **완전 동일**
- Lambda 함수: **동일한 결과**
- 코드 구조: **더 명확한 리소스 정의**

---

## 🎬 Week 1-3 학습 계획

### Week 1: Serverless Framework 마스터 (12-16시간) ✅ 완료

```
🕐 Day 1 (6-8시간)
  1️⃣ 이론 (2시간) → 01-SERVERLESS-BASICS.md 읽기
  2️⃣ Example 01 (2시간) → examples/01-hello-world/ 배포
  3️⃣ 심화 (2시간) → QUICK-REFERENCE.md 참고

🕐 Day 2 (6-8시간)
  1️⃣ Example 02 (3시간) → examples/02-api-gateway-s3/ 배포
  2️⃣ SAM 맵핑 학습 (2시간) → SERVERLESS-TO-SAM-MAPPING.md 읽기
  3️⃣ 자유 학습 (1-2시간) → 예제 수정 & 질문 정리
```

**Week 1 완료 기준:**

- ✅ Serverless Framework 개념 완벽 이해
- ✅ 2개 예제 배포 성공 (01, 02)
- ✅ CloudFormation 기초 이해 (이론)

---

### Week 2-3: SAM으로 전환 (12-16시간) ✅ 완료 ⭐ NEW

```
🕐 Day 3-4 (6-8시간) - SAM 기초
  1️⃣ 이론 (2시간) → SAM-MIGRATION-GUIDE.md (Phase 1-2)
  2️⃣ Example 03 (2시간) → examples/03-hello-world-sam/ 배포
  3️⃣ 개념 정리 (1-2시간) → CLOUDFORMATION-CHEATSHEET.md 깊이 학습

🕐 Day 5-6 (6-8시간) - SAM 심화
  1️⃣ Example 04 (3시간) → examples/04-api-gateway-s3-sam/ 배포
  2️⃣ 마이그레이션 과정 (2시간) → SAM-MIGRATION-GUIDE.md (Phase 3-4)
  3️⃣ 비교 분석 (1-2시간) → 회사 코드 검토
```

**Week 2-3 완료 기준:**

- ✅ SAM 프로젝트 구조 완벽 이해
- ✅ 2개 SAM 예제 배포 성공 (03, 04)
- ✅ Serverless ↔ SAM 변환 프로세스 숙달
- ✅ 회사 마이그레이션 준비 완료

```

---

## 🧠 학습 팁 (Week 1-3)

### 📖 읽기

- **한 번에 다 읽지 말 것** - 문서는 참고용
- **예제 코드 보며 다시 읽기** - 이해 안 되면 코드부터 보세요
- **각 예제의 README.md 필수** - 가장 실용적인 가이드
- **CHEATSHEET 북마크** - 자주 참고할 일반적인 것들

### 💻 실습

- **직접 손으로 배포하기** - 읽기만으로는 절대 안 됨
- **AWS 콘솔 열어두기** - 배포 후 실제 리소스 확인
- **CloudFormation 탭 보기** - "아, 이게 생겼구나!" 경험
- **로그 확인하기** - CloudWatch에서 실행 흐름 추적

### 🔄 비교 학습 (Week 2-3)

- **01 vs 03 비교** - "Serverless vs SAM" 동일한 로직
- **02 vs 04 비교** - S3 권한이 어떻게 다르게 표현되는가
- **template.yaml vs serverless.yml** - 섹션별 맵핑
- **두 가지 패턴 동시에 기억** - 둘 다 할 수 있어야 합니다

### 📋 정리

- **자신의 말로 쓰기** - 가장 효과적인 학습법
- **아직 헷갈리는 것 정리** - Week 2-3 시작 전 명확히
- **회사 코드와 비교** - "이건 어디 있지?" 찾기 연습
- **질문 작성** - 그룹 세션용 질문 준비

---

## ❓ 자주 묻는 질문 (FAQ)

### Q: SAM과 Serverless Framework의 차이가 뭔가요?

**A:**

- **Serverless Framework**: CloudFormation을 추상화한 도구 (쉽지만 덜 명확)
- **SAM**: AWS 공식 도구로, CloudFormation을 직접 다룸 (복잡하지만 명확)

### Q: 이 자료만으로 충분한가요?

**A:** Day 1-2 목표는 "Serverless Framework 완벽 이해"입니다. 이후 SAM 전환은 SERVERLESS-TO-SAM-MAPPING.md와 함께 진행합니다.

### Q: 예제를 수정해도 되나요?

**A:** 네! 자유롭게 수정하고 실험해보세요. 오히려 권장합니다.

### Q: 배포에 비용이 드나요?

**A:** AWS 마이크로 (Lambda, API Gateway)는 월 무료 한도가 있습니다. 안심하고 테스트하세요.

---

---

## 📚 추가 학습 자료

### Serverless Framework
- [공식 문서](https://www.serverless.com/framework/docs)
- [Serverless Examples](https://github.com/serverless/examples)

### SAM ⭐ NEW
- [공식 문서](https://docs.aws.amazon.com/serverless-application-model/)
- [SAM CLI 가이드](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

### AWS Lambda
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/)
- [API Gateway REST API Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/)

## ❓ 자주 묻는 질문 (FAQ)

### Q: SAM과 Serverless Framework의 차이가 뭔가요?

**A:**
- **Serverless Framework**: CloudFormation을 추상화한 도구 (쉽지만 덜 명확)
- **SAM**: AWS 공식 도구로, CloudFormation을 직접 다룸 (복잡하지만 명확)

비유: Serverless = 자동변속, SAM = 수동변속 (더 복잡하지만 더 정확한 제어)

### Q: 예제들이 정말 동일한가요?

**A:** 맞습니다!
- 01-hello-world vs 03-hello-world-sam → **handlers 완전 동일**, 배포 방식만 다름
- 02-api-gateway-s3 vs 04-api-gateway-s3-sam → **handlers 완전 동일**, 설정만 다름

이게 학습의 핵심입니다: **"로직은 유지하고 IaC만 변경"**

### Q: 이 자료만으로 충분한가요?

**A:** 네! Week 1-3 목표 모두 포함되어 있습니다:
- ✅ Serverless Framework 완벽 이해 (Week 1)
- ✅ CloudFormation 이해 (Week 2-3)
- ✅ Serverless → SAM 변환 숙달 (Week 2-3)

### Q: 예제를 수정해도 되나요?

**A:** 네! 자유롭게 수정하고 실험해보세요. 오히려 강력히 권장합니다.

### Q: 배포에 비용이 드나요?

**A:** Lambda, API Gateway는 월 무료 한도가 있습니다. 안심하고 테스트하세요.

### Q: 예제와 회사 코드가 어떻게 다른가요?

**A:** 회사 코드는 더 복잡하겠지만, **핵심 패턴은 동일**합니다:
- IAM 권한 설정 방식
- 이벤트 트리거 구조
- handler 함수 시그니처

이 예제들로 기초를 다진 후 회사 코드를 보면 훨씬 쉬워집니다!

---

## 💬 피드백

학습하며 개선할 점이 있으면:
- 📝 각 파일별 README.md에 의견 남기기
- ❓ 헷갈리는 개념 정리하기
- 💡 더 필요한 예제 제안하기

---

## ✨ 이 자료의 활용 방식

### 학습 자료로 활용

1. **이 문서들로 개념 이해**
   - "예제 01-02는 Serverless Framework"
   - "예제 03-04는 같은 로직을 SAM으로"
   - "비교하며 차이점 학습"

2. **예제 코드로 실습**
   - 각 예제 직접 배포해보기
   - serverless.yml과 template.yaml 비교
   - 실제 동작 확인

3. **마이그레이션 가이드 활용**
   - SAM-MIGRATION-GUIDE.md의 4단계 이해
   - Phase별 변환 패턴 학습
   - 직접 변환 연습

4. **개인 프로젝트에 적용**
   - 예제 패턴을 자신의 코드에 적용
   - 다양한 AWS 리소스 추가 연습
   - CloudFormation 개념 심화

### 가장 중요한 것

> **Serverless Framework의 추상화를 거두고**
> **CloudFormation의 명확한 리소스들을 보기**

이 한 문장이 이 모든 자료의 핵심입니다.

---

## 🎯 지금 시작하세요!

### Week 1 진행자용 (처음 보는 경우)

👇 **이 순서대로 진행하세요:**

1. **[01-SERVERLESS-BASICS.md](./01-SERVERLESS-BASICS.md)** 읽기 (1시간)
2. **[examples/01-hello-world/](./examples/01-hello-world/)** 배포 (1시간)
3. **[examples/02-api-gateway-s3/](./examples/02-api-gateway-s3/)** 배포 (2시간)
4. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** 북마크하기 (필요할 때)
5. **[SERVERLESS-TO-SAM-MAPPING.md](./SERVERLESS-TO-SAM-MAPPING.md)** 읽기 (1시간)

### Week 2-3 진행자용 (Week 1 완료 후)

👇 **이 순서대로 진행하세요:** ⭐ NEW

1. **[SAM-MIGRATION-GUIDE.md](./SAM-MIGRATION-GUIDE.md)** 읽기 (1시간)
2. **[CLOUDFORMATION-CHEATSHEET.md](./CLOUDFORMATION-CHEATSHEET.md)** 깊이 학습 (1시간)
3. **[examples/03-hello-world-sam/](./examples/03-hello-world-sam/)** 배포 (1시간)
4. **[examples/04-api-gateway-s3-sam/](./examples/04-api-gateway-s3-sam/)** 배포 (2시간)
5. **[SAM-COMPLETION-GUIDE.md](./SAM-COMPLETION-GUIDE.md)** 읽기 (30분)

---

## 💡 최고의 팁

> **각 배포 후 AWS 콘솔을 열어두고,**
> **실제로 생성된 Lambda, API Gateway, S3, IAM, CloudFormation 리소스를 확인하세요.**
> **"아, 이게 이렇게 생겨!"하는 경험이 가장 효과적입니다.** 🎯

---

**지금 시작하세요!** 💪

> 가장 좋은 학습은 손으로 배포해보는 것입니다.

```
