# 🎓 AWS Serverless + SAM 2주 완전 학습 가이드

> **최종 상태**: Week 2-3 SAM 학습 자료 완료 ✅

---

## 📚 전체 구성 (4,500+ 줄 문서 + 4개 배포 가능한 예제)

```
Week 1: Serverless Framework          Week 2-3: SAM 마이그레이션
─────────────────────────         ──────────────────────────
✅ 01-SERVERLESS-BASICS.md        ✅ SAM-MIGRATION-GUIDE.md
✅ examples/01-hello-world         ✅ examples/03-hello-world-sam
✅ examples/02-api-gateway-s3      ✅ examples/04-api-gateway-s3-sam
✅ CLOUDFORMATION-CHEATSHEET.md   ✅ 각 예제 README (~600-700줄)
```

---

## 📂 폴더 구조

```
sam-learning/
├── README.md                          # 메인 가이드
├── 00-LEARNING-ROADMAP.md             # 일정표
├── 01-SERVERLESS-BASICS.md            # 이론 (600줄)
├── CLOUDFORMATION-CHEATSHEET.md       # CF 함수 (400줄)
├── QUICK-REFERENCE.md                 # 빠른 참고 (420줄)
├── SERVERLESS-TO-SAM-MAPPING.md       # 변환 매핑 (700줄)
├── SAM-MIGRATION-GUIDE.md             # 완전한 마이그레이션 (900줄) ⭐
├── EXAMPLE-STATUS.md                  # 상태 표시
├── SAM-COMPLETION-GUIDE.md            # 이 과정 완료 요약 (이 파일)
│
└── examples/
    ├── 01-hello-world/                # Serverless (4 핸들러)
    │   ├── serverless.yml
    │   ├── handlers/hello.js
    │   ├── package.json
    │   └── README.md (~400줄)
    │
    ├── 02-api-gateway-s3/             # Serverless + S3 (5 핸들러)
    │   ├── serverless.yml
    │   ├── handlers/s3.js
    │   ├── package.json
    │   └── README.md (~450줄)
    │
    ├── 03-hello-world-sam/            # SAM 버전 ⭐ NEW
    │   ├── template.yaml              # CloudFormation with SAM
    │   ├── handlers/hello.js          # 같은 핸들러 코드
    │   ├── package.json
    │   └── README.md (~600줄, 상세 튜토리얼)
    │
    └── 04-api-gateway-s3-sam/         # SAM + S3 ⭐ NEW
        ├── template.yaml              # S3 버킷, IAM, 이벤트
        ├── handlers/s3.js
        ├── package.json
        └── README.md (~700줄, 상세 튜토리얼)
```

---

## 🎯 각 문서의 역할

### 이론 문서

| 파일                         | 내용                             | 길이  | 학습 시간  |
| ---------------------------- | -------------------------------- | ----- | ---------- |
| 01-SERVERLESS-BASICS.md      | Serverless Framework 완전 가이드 | 600줄 | 1-2시간    |
| CLOUDFORMATION-CHEATSHEET.md | !Ref, !GetAtt, !Sub 깊이 있기    | 400줄 | 30분-1시간 |
| SERVERLESS-TO-SAM-MAPPING.md | 섹션별 변환 매핑                 | 700줄 | 1-2시간    |
| SAM-MIGRATION-GUIDE.md       | Phase 1-4 완전한 마이그레이션    | 900줄 | 2-3시간    |
| QUICK-REFERENCE.md           | 빠른 참고 테이블                 | 420줄 | 필요할 때  |

### 예제

| 예제                  | 목표                    | 함수 수 | Framework  | README |
| --------------------- | ----------------------- | ------- | ---------- | ------ |
| 01-hello-world        | HTTP 기초 배우기        | 4       | Serverless | 400줄  |
| 02-api-gateway-s3     | S3 통합, Pre-signed URL | 5       | Serverless | 450줄  |
| 03-hello-world-sam    | SAM 구조 이해           | 4       | SAM        | 600줄  |
| 04-api-gateway-s3-sam | SAM + S3 실전           | 5       | SAM        | 700줄  |

---

## 🚀 시작하기

### 1단계: 이론 학습 (2시간)

```bash
# 메인 가이드 읽기
cat README.md

# Serverless Framework 이해
cat 01-SERVERLESS-BASICS.md

# CloudFormation 핵심 개념
cat CLOUDFORMATION-CHEATSHEET.md
```

### 2단계: Serverless 예제 배포 (4시간)

```bash
# 예제 1: 가장 간단함 (1시간)
cd examples/01-hello-world
npm install
npm run offline    # 로컬 테스트
npm run deploy     # AWS 배포

# 예제 2: S3 통합 (2시간)
cd examples/02-api-gateway-s3
npm install
npm run offline    # 로컬 테스트
npm run deploy     # AWS 배포

# CloudWatch 로그 확인
aws logs tail /aws/lambda/hello-world-say-hello-dev --follow
```

### 3단계: SAM 이해 (2시간)

```bash
# SAM 예제 1: Serverless와 비교
cd examples/03-hello-world-sam
cat README.md           # 상세 가이드 읽기
sam build              # SAM 빌드
sam local start-api    # 로컬 테스트
sam deploy --guided    # AWS 배포

# SAM 예제 2: S3 통합
cd examples/04-api-gateway-s3-sam
cat README.md           # 상세 가이드 읽기
sam build              # SAM 빌드
sam local start-api    # 로컬 테스트
sam deploy --guided    # AWS 배포
```

### 4단계: 마이그레이션 학습 (2시간)

```bash
# 완전한 마이그레이션 프로세스
cat SAM-MIGRATION-GUIDE.md

# Phase 1: 분석 - 회사의 serverless.yml 분석
# Phase 2: 변환 - template.yaml 작성
# Phase 3: 테스트 - 로컬 및 개발 환경 테스트
# Phase 4: 배포 - AWS 프로덕션 배포
```

---

## 📊 학습 통계

### 문서량

- **총 문서**: 8개
- **총 줄 수**: 4,600+ 줄
- **예제 문서**: 2,150줄 (각 300-700줄)

### 코드

- **예제**: 4개 (모두 배포 가능)
- **함수**: 9개 (HTTP, S3 트리거)
- **핸들러**: 완전한 에러 처리 포함

### 학습 시간

- 이론: 5-6시간
- 로컬 실습: 2-3시간
- AWS 배포: 1-2시간
- **총 8-11시간** (1주 집중 또는 2주 여유)

---

## 🎓 배운 내용 체크리스트

### ✅ Serverless Framework

- [x] `service`, `provider`, `functions`, `events`, `resources` 섹션 이해
- [x] `${self:...}`, `${opt:...}`, `${custom:...}` 변수 참조
- [x] IAM 권한 설정 (`provider.iam.role`)
- [x] HTTP 이벤트, S3 이벤트, 스케줄 이벤트
- [x] 환경변수 관리 (`provider.environment`)
- [x] 로컬 테스트 (`serverless-offline`)
- [x] AWS 배포 및 모니터링

### ✅ CloudFormation

- [x] `!Ref` - 리소스 ID/파라미터 참조
- [x] `!GetAtt` - 리소스 속성 (ARN 등) 가져오기
- [x] `!Sub` - 문자열 보간
- [x] `Parameters` - 배포 시 입력값
- [x] `Globals` - 공통 설정
- [x] `Resources` - 생성할 리소스
- [x] `Outputs` - 배포 후 정보

### ✅ AWS SAM

- [x] `AWS::Serverless::Function` 정의
- [x] `AWS::Serverless::Api` (REST API)
- [x] S3 버킷 정의 (`AWS::S3::Bucket`)
- [x] IAM Role 정의 (`AWS::IAM::Role`)
- [x] Lambda 권한 정의 (`AWS::Lambda::Permission`)
- [x] 이벤트 매핑 (HTTP, S3, DynamoDB, 등)
- [x] Pre-signed URL 생성 및 보안

### ✅ 실전 경험

- [x] 4개 배포 가능한 예제 구현
- [x] 로컬 테스트 (`npm run offline`, `sam local start-api`)
- [x] AWS 배포 (`npm run deploy`, `sam deploy`)
- [x] CloudWatch Logs 모니터링
- [x] 에러 처리 및 로깅
- [x] 보안 (Pre-signed URL, IAM 최소화)

---

## 💡 핵심 개념 정리

### Serverless Framework의 핵심

```yaml
# 간결하고 추상화된 정의
service: my-service
provider:
  stage: ${opt:stage, 'dev'}
  environment:
    DB: users-${self:provider.stage}

functions:
  myFunction:
    handler: handler.main
    events:
      - http: get /path
```

### SAM의 핵심

```yaml
# 명시적이고 제어 가능한 정의
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Parameters:
  Stage:
    Type: String

Globals:
  Function:
    Environment:
      Variables:
        DB: !Sub "users-${Stage}"

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handler.main
      Events:
        HttpEvent:
          Type: Api
          Properties:
            Path: /path
            Method: GET
```

### 변환의 핵심

```
Serverless                    SAM
─────────────────        ──────────────
provider.stage      →    Parameters.Stage
${self:...}         →    !Ref Stage
provider.iam        →    Resources.LambdaExecutionRole
functions           →    Resources.XxxFunction
events              →    Events.XxxEvent
resources           →    Resources (그대로)
```

---

## 🎯 다음 할 일

### 🔥 지금 바로 (필수)

1. **SAM-MIGRATION-GUIDE.md 정독**

   - Phase 1: 분석
   - Phase 2: 변환
   - Phase 3: 테스트
   - Phase 4: 배포

2. **예제 03, 04 로컬 테스트**

   ```bash
   cd examples/03-hello-world-sam
   sam build
   sam local start-api
   ```

3. **AWS에 SAM 배포**
   ```bash
   sam deploy --guided
   ```

### 📅 이번 주 (권장)

4. **회사 serverless.yml 분석**

   - 현재 구조 파악
   - 의존성 정리
   - 마이그레이션 계획

5. **template.yaml 초안 작성**
   - SAM-MIGRATION-GUIDE.md 참고
   - Phase 1-2 수행

### 🚀 다음 주

6. **로컬 및 개발 환경 테스트**

   - Phase 3 수행

7. **프로덕션 배포 계획**
   - Phase 4 준비
   - Rollback 계획

---

## 📞 자주하는 질문

**Q: 모든 예제를 배포해야 하나요?**

A: 이상적으로는 4개 모두 하는 것 좋음. 최소한 01, 03은 필수.

- 01-hello-world: Serverless 기초
- 03-hello-world-sam: SAM 기초
- 나머지 2개: 심화 학습용

**Q: 로컬 테스트가 필요한가요?**

A: 네, 강력 권장. AWS 비용 절감 + 빠른 개발.

```bash
npm run offline          # Serverless
sam local start-api      # SAM
```

**Q: 입사 전에 회사 프로젝트 마이그레이션해야 하나요?**

A: 아니오. 입사 후 팀과 함께 진행 권장.
지금은 기초 학습과 방법론 습득에 집중.

**Q: CI/CD는 언제?**

A: Week 4+. 지금은 수동 배포 익숙해지는 게 먼저.

---

## 🏆 당신이 지금 할 수 있는 것

✅ **Serverless Framework 프로젝트 이해 및 배포**

```bash
npm run deploy
npm run offline
```

✅ **SAM 프로젝트 변환 및 배포**

```bash
sam build
sam deploy --guided
```

✅ **CloudFormation 템플릿 작성**

- Parameters, Globals, Resources 사용
- !Ref, !GetAtt, !Sub 활용
- IAM 권한 명시적 정의

✅ **Pre-signed URL 보안 패턴 구현**

```javascript
s3.getSignedUrl("putObject", {
  Bucket,
  Key,
  Expires: 3600
});
```

✅ **AWS Lambda 디버깅 및 모니터링**

```bash
aws logs tail /aws/lambda/... --follow
```

---

## 🎓 최종 인증

```
┌─────────────────────────────────────────────┐
│  AWS Serverless + SAM 기초 과정 완료 ✅     │
├─────────────────────────────────────────────┤
│ • Serverless Framework 완벽 이해            │
│ • CloudFormation 핵심 개념 습득             │
│ • SAM으로 안전한 마이그레이션             │
│ • 4개 배포 가능한 실전 예제               │
│ • 4,600줄 이상의 상세 문서                │
│                                            │
│ 당신은 회사의 Serverless 인프라를         │
│ SAM으로 마이그레이션할 준비가 됐습니다!   │
└─────────────────────────────────────────────┘
```

---

## 📚 추가 학습 자료

### AWS 공식 문서

- [SAM 개발 가이드](https://docs.aws.amazon.com/serverless-application-model/)
- [CloudFormation 사용자 가이드](https://docs.aws.amazon.com/cloudformation/)
- [Lambda 개발자 가이드](https://docs.aws.amazon.com/lambda/)

### 한국 자료

- [AWS 한국 블로그](https://aws.amazon.com/ko/blogs/)
- [AWS 한국 whitepaper](https://aws.amazon.com/ko/whitepapers/)

---

## 🙏 마치며

축하합니다! 🎉

당신은 이제:

- ✨ **Serverless Framework를 깊이 있게 이해합니다**
- 🏗️ **CloudFormation의 구조를 알고 있습니다**
- 🚀 **SAM으로 마이그레이션할 수 있습니다**
- 💪 **AWS Lambda 실전 경험을 가지고 있습니다**

**입사 후 팀에 즉시 기여할 수 있습니다.** 👍

이 자료가 여러분의 AWS 여정에 도움이 되길 바랍니다.

**Happy Learning! 📚**

---

**마지막 업데이트**: Week 2-3 SAM 자료 완료
**다음 예정**: Week 4+ CI/CD 파이프라인
