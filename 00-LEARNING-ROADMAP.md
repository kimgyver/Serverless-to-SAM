# 🎯 Serverless Framework 완전 가이드 (Day 1-2)

## 목표
- Serverless Framework의 **모든 핵심 개념** 이해
- `serverless.yml` 각 섹션을 깊이 있게 분석
- 간단한 프로젝트를 직접 배포해보기
- SAM과의 맵핑 구조 파악

---

## 📚 학습 순서

### **Day 1: Serverless Framework 개념 + serverless.yml 파헤치기**

```
⏱️ 총 6-8시간

1️⃣ 이론 (1시간)
   ├─ Serverless Framework가 뭔가?
   ├─ CloudFormation과의 관계
   └─ Plugin 및 Custom Script의 역할

2️⃣ serverless.yml 섹션별 분석 (3시간)
   ├─ service
   ├─ provider
   ├─ functions
   ├─ events
   ├─ resources
   ├─ plugins & custom
   └─ environment & parameters

3️⃣ 간단한 프로젝트 setup (2시간)
   ├─ Node.js + Serverless 설치
   ├─ AWS 계정 연결
   └─ Hello World Lambda 배포

4️⃣ 복습 (1시간)
   └─ 배포된 AWS 리소스 콘솔에서 확인
```

---

### **Day 2: 이벤트 트리거 + 실습 프로젝트**

```
⏱️ 총 6-8시간

1️⃣ Events 깊이 있게 (2시간)
   ├─ http (API Gateway)
   ├─ s3
   ├─ schedule (CloudWatch)
   ├─ dynamodb
   ├─ sqs
   └─ 각 이벤트의 payload 구조

2️⃣ Resources 섹션 (1시간)
   ├─ CloudFormation 리소스 정의
   ├─ 권한 (IAM Role/Policy)
   └─ 다른 서비스 통합

3️⃣ 통합 실습 프로젝트 (2시간)
   ├─ Lambda + API Gateway 배포
   ├─ CloudWatch Logs 확인
   └─ 로컬에서 테스트 (serverless-offline)

4️⃣ 깔끔하게 정리 (1시간)
   └─ 배포 결과물 문서화
```

---

## 📂 폴더 구조

```
sam-learning/
├── 00-LEARNING-ROADMAP.md          ← 지금 보는 파일
├── 01-SERVERLESS-BASICS.md         ← 이론: Serverless Framework란?
├── 02-SERVERLESS-YML-GUIDE.md      ← serverless.yml 섹션별 상세 가이드
├── 03-EVENTS-DEEP-DIVE.md          ← Events 타입별 상세 설명
├── 04-RESOURCES-IAM.md             ← Resources & IAM 권한 설정
│
├── examples/
│   ├── 01-hello-world/             ← Day 1 실습: 가장 간단한 Lambda
│   │   ├── serverless.yml
│   │   ├── handler.js
│   │   └── README.md
│   │
│   ├── 02-api-gateway/             ← Day 2 실습: Lambda + API GW
│   │   ├── serverless.yml
│   │   ├── handlers/
│   │   │   ├── get.js
│   │   │   ├── post.js
│   │   │   └── errors.js
│   │   └── README.md
│   │
│   ├── 03-s3-trigger/              ← S3 이벤트 트리거
│   │   ├── serverless.yml
│   │   ├── handler.js
│   │   └── README.md
│   │
│   ├── 04-dynamodb-crud/           ← DynamoDB 연동
│   │   ├── serverless.yml
│   │   ├── handlers/
│   │   └── README.md
│   │
│   └── 05-scheduled-task/          ← CloudWatch Events
│       ├── serverless.yml
│       ├── handler.js
│       └── README.md
│
├── comparison/
│   ├── serverless-vs-sam.md        ← Serverless와 SAM 비교
│   ├── serverless-to-sam-mapping.md ← 마이그레이션 맵핑 가이드
│   └── drift-analysis.md           ← 환경별 drift 분석 방법
│
└── checklists/
    ├── deployment-checklist.md     ← 배포 전 체크리스트
    ├── troubleshooting.md          ← 문제 해결 가이드
    └── day1-2-quick-ref.md         ← Day 1-2 빠른 참고
```

---

## 🚀 시작 방법

### **1단계: 이 폴더에서 시작**
```bash
cd /Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning
```

### **2단계: Day 1-2 자료 순서대로 읽기**
```
1. 01-SERVERLESS-BASICS.md       (이론)
2. 02-SERVERLESS-YML-GUIDE.md    (핵심 구조)
3. examples/01-hello-world/       (첫 실습)
4. 03-EVENTS-DEEP-DIVE.md        (이벤트 이해)
5. examples/02-api-gateway/       (통합 실습)
```

### **3단계: 실습 프로젝트 진행**
```bash
# 각 example 폴더에서
cd examples/01-hello-world
npm install
serverless deploy
```

---

## 📌 핵심 학습 포인트

| 주제 | 중요도 | 이유 |
|------|--------|------|
| `service` + `provider` | ⭐⭐⭐ | 기초 구성 |
| `functions` | ⭐⭐⭐ | Lambda 정의 |
| `events` (http, s3, schedule) | ⭐⭐⭐ | 트리거 이해 |
| `resources` | ⭐⭐⭐ | IAM, CloudFormation |
| `plugins` | ⭐⭐ | 회사 코드에서 사용 중일 가능성 |
| `custom` | ⭐⭐ | 커스텀 로직 |
| `environment` + `parameters` | ⭐⭐⭐ | 환경별 설정 |

---

## 🎓 Day 1-2 후 검증 체크리스트

- [ ] serverless.yml의 모든 섹션 이해
- [ ] 간단한 Lambda 함수 배포 성공
- [ ] API Gateway 트리거 설정 이해
- [ ] CloudWatch에서 로그 확인
- [ ] AWS 콘솔에서 생성된 리소스 확인
- [ ] 배포 제거 (serverless remove) 성공
- [ ] Serverless와 SAM 구조 맵핑 시작

---

## 💡 팁

1. **각 예제마다 `README.md` 읽기** → 왜 이렇게 했는지 이해
2. **배포 후 AWS 콘솔 확인** → 실제 리소스가 뭐가 생기는지 봐야 함
3. **CloudFormation 탭 확인** → Serverless가 CF를 어떻게 생성했는지 보기
4. **로그 남기기** → 각 배포마다 출력 내용 캡처 (나중에 비교)

---

이제 다음 파일들을 읽으며 **Day 1-2**를 시작하세요! 🚀
