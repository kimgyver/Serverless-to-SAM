# 📍 START HERE - 학습 방법 가이드

> **이 파일을 먼저 읽으세요!** (5분)
>
> 모든 학습 자료가 완성되었습니다. 어디서부터 시작해야 할지 정확히 알려드립니다.

---

## 🎯 당신의 현황 확인

### Week 1-3 모든 자료가 완성되어 있나요?

✅ **네! 모두 완성되었습니다!**

```
📚 문서: 11개 (약 7,920줄)
  ├─ Week 1 이론: 01-SERVERLESS-BASICS.md (600줄)
  ├─ CloudFormation: CLOUDFORMATION-CHEATSHEET.md (400줄)
  ├─ SAM 변환: SERVERLESS-TO-SAM-MAPPING.md (700줄)
  ├─ SAM 마이그레이션: SAM-MIGRATION-GUIDE.md (900줄)
  └─ 기타: QUICK-REFERENCE.md, 완료 가이드 등

💻 배포 가능한 예제: 4개
  ├─ examples/01-hello-world (Serverless, 4 핸들러)
  ├─ examples/02-api-gateway-s3 (Serverless, 5 핸들러)
  ├─ examples/03-hello-world-sam (SAM, 4 핸들러) ⭐ NEW
  └─ examples/04-api-gateway-s3-sam (SAM, 5 핸들러) ⭐ NEW
```

---

## 🚀 학습 시작 가이드

### 당신의 상황에 맞는 시나리오를 선택하세요:

#### **시나리오 A: 완전히 새로운 경우 (0% 진행 상태)**

**당신의 상황**: "AWS Lambda, Serverless Framework를 처음 봅니다."

**학습 경로**:

```
📖 1단계: 개요 읽기 (5분)
└─ [README.md](./README.md) 상단의 "핵심 개념" 섹션

📚 2단계: Week 1 시작 (1주일, 12-16시간)
└─ [01-SERVERLESS-BASICS.md](./01-SERVERLESS-BASICS.md)
   (3개 파트: 개념 → serverless.yml → 배포)

💻 3단계: 예제 1 배포 (2시간)
└─ [examples/01-hello-world/](./examples/01-hello-world/)
   - npm install
   - npm run offline (로컬 테스트)
   - npm run deploy (AWS 배포)

💻 4단계: 예제 2 배포 (2시간)
└─ [examples/02-api-gateway-s3/](./examples/02-api-gateway-s3/)

🔍 5단계: 개념 정리 (1-2시간)
└─ [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)
└─ [CLOUDFORMATION-CHEATSHEET.md](./CLOUDFORMATION-CHEATSHEET.md)

🎯 6단계: SAM 변환 학습 (1-2시간)
└─ [SERVERLESS-TO-SAM-MAPPING.md](./SERVERLESS-TO-SAM-MAPPING.md)
```

**예상 시간**: 12-16시간 (1주일)

---

#### **시나리오 B: Week 1 완료, Week 2-3 진행 중 (50% 진행 상태)**

**당신의 상황**: "Serverless Framework는 알고 있으나, SAM이 뭔지 잘 모릅니다."

**학습 경로**:

```
📚 1단계: SAM 마이그레이션 이론 (2시간)
└─ [SAM-MIGRATION-GUIDE.md](./SAM-MIGRATION-GUIDE.md)
   (Phase 1: 분석 → Phase 2: 변환)

💻 2단계: 예제 3 배포 (1-2시간)
└─ [examples/03-hello-world-sam/](./examples/03-hello-world-sam/)
   - npm install
   - sam build
   - sam deploy --guided

🔄 3단계: Serverless vs SAM 비교 (1시간)
└─ 예제 01 vs 예제 03 코드 비교
└─ [SERVERLESS-TO-SAM-MAPPING.md](./SERVERLESS-TO-SAM-MAPPING.md)

💻 4단계: 예제 4 배포 (2시간)
└─ [examples/04-api-gateway-s3-sam/](./examples/04-api-gateway-s3-sam/)

🎯 5단계: 마이그레이션 완료 (1시간)
└─ [SAM-MIGRATION-GUIDE.md](./SAM-MIGRATION-GUIDE.md)
   (Phase 3: 테스트 → Phase 4: 배포)
└─ [SAM-COMPLETION-GUIDE.md](./SAM-COMPLETION-GUIDE.md)
```

**예상 시간**: 8-12시간 (3-4일)

---

#### **시나리오 C: Week 1-3 모두 완료 (100% 진행 상태)**

**당신의 상황**: "Serverless Framework와 SAM 모두 배웠습니다!"

**다음 단계**:

```
🎯 학습 마무리
├─ 이 자료를 다시 한번 검토
├─ 자신의 프로젝트에 패턴 적용
├─ 실제 마이그레이션 연습
└─ SAM-MIGRATION-GUIDE.md Phase 3-4로 고급 학습

📚 참고 자료
├─ [SERVERLESS-TO-SAM-MAPPING.md](./SERVERLESS-TO-SAM-MAPPING.md) - 변환 레퍼런스
├─ [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - 빠른 룩업
└─ 각 예제의 README.md - 상세 설명
```

---

## 📋 문서 구조 개요

### 📖 핵심 이론 문서

| 파일                                                           | 내용                        | 시간      | 대상     |
| -------------------------------------------------------------- | --------------------------- | --------- | -------- |
| [01-SERVERLESS-BASICS.md](./01-SERVERLESS-BASICS.md)           | Week 1 완전 가이드          | 1시간     | 초보자   |
| [CLOUDFORMATION-CHEATSHEET.md](./CLOUDFORMATION-CHEATSHEET.md) | CF 5가지 개념               | 1시간     | 모두     |
| [SERVERLESS-TO-SAM-MAPPING.md](./SERVERLESS-TO-SAM-MAPPING.md) | 섹션별 변환 맵핑            | 1시간     | Week 2-3 |
| [SAM-MIGRATION-GUIDE.md](./SAM-MIGRATION-GUIDE.md)             | 4단계 마이그레이션 프로세스 | 2시간     | Week 2-3 |
| [SAM-COMPLETION-GUIDE.md](./SAM-COMPLETION-GUIDE.md)           | Week 2-3 종합 정리          | 30분      | 완료자   |
| [QUICK-REFERENCE.md](./QUICK-REFERENCE.md)                     | CLI 명령어 & 패턴 빠른 참고 | 필요할 때 | 모두     |

### 💻 배포 가능한 예제

| 폴더                                                                | 프레임워크 | 내용                     | 핸들러 | 난이도 |
| ------------------------------------------------------------------- | ---------- | ------------------------ | ------ | ------ |
| [examples/01-hello-world](./examples/01-hello-world/)               | Serverless | HTTP 기초                | 4개    | ⭐     |
| [examples/02-api-gateway-s3](./examples/02-api-gateway-s3/)         | Serverless | API + S3 통합            | 5개    | ⭐⭐⭐ |
| [examples/03-hello-world-sam](./examples/03-hello-world-sam/)       | SAM        | HTTP 기초 (SAM 버전)     | 4개    | ⭐     |
| [examples/04-api-gateway-s3-sam](./examples/04-api-gateway-s3-sam/) | SAM        | API + S3 통합 (SAM 버전) | 5개    | ⭐⭐⭐ |

### 📌 네비게이션 & 인덱스

| 파일                                               | 목적                     |
| -------------------------------------------------- | ------------------------ |
| [README.md](./README.md)                           | 메인 가이드 (전체 개요)  |
| [00-COMPLETE-INDEX.md](./00-COMPLETE-INDEX.md)     | 전체 문서 인덱스 (454줄) |
| [00-LEARNING-ROADMAP.md](./00-LEARNING-ROADMAP.md) | 주차별 상세 로드맵       |
| [EXAMPLE-STATUS.md](./EXAMPLE-STATUS.md)           | 예제 상태 및 학습 이유   |
| [COMPLETION-SUMMARY.md](./COMPLETION-SUMMARY.md)   | Week 1 완료 체크리스트   |
| [00-START-HERE.md](./00-START-HERE.md)             | 👈 이 파일 (당신 여기)   |

---

## ❓ 자주 묻는 질문

### Q: 어디서부터 시작해야 하나요?

**A**: 당신의 상황을 확인하세요 (위의 "시나리오 A/B/C" 참고)

### Q: 모든 문서를 읽어야 하나요?

**A**: 아니요! 당신의 상황에 맞게 선택하세요.

- **처음**: 01-SERVERLESS-BASICS.md + 예제 1, 2
- **SAM**: SAM-MIGRATION-GUIDE.md + 예제 3, 4
- **참고용**: CLOUDFORMATION-CHEATSHEET.md, QUICK-REFERENCE.md

### Q: 예제들이 정말 동일한가요?

**A**: 맞습니다!

- **01 vs 03**: 같은 4개 핸들러, 배포 방식만 다름
- **02 vs 04**: 같은 5개 핸들러, 설정만 다름

이것이 핵심 학습입니다: **"로직은 100% 유지하고 IaC만 변경"**

### Q: 배포에 비용이 드나요?

**A**: 아니요, Lambda와 API Gateway는 월 무료 한도가 있습니다.

### Q: Week 2-3 자료는 정말 완성되었나요?

**A**: 예!

- ✅ SAM-MIGRATION-GUIDE.md (Phase 1-4 완성)
- ✅ SAM-COMPLETION-GUIDE.md (완료)
- ✅ examples/03-hello-world-sam (배포 가능)
- ✅ examples/04-api-gateway-s3-sam (배포 가능)

모두 준비되었으니 바로 시작하세요!

---

## 🎯 당신의 다음 단계

**지금 바로**:

1. 당신의 상황에 맞는 시나리오 선택 (위)
2. 첫 문서 열기
3. 배포해보기

**가장 중요한 것**:

> 손으로 배포해봐야 합니다!  
> 읽기만으로는 절대 안 되고,  
> **직접 `npm run deploy` 또는 `sam deploy`를 실행해야 진짜 이해됩니다.**

---

## 💡 팁

### AWS 콘솔 열어두기

배포 후 AWS 콘솔을 열어두고:

- Lambda 함수 확인
- API Gateway 엔드포인트 테스트
- S3 버킷 확인
- CloudFormation 스택 보기 (가장 중요!)
- CloudWatch 로그 확인

이 경험이 가장 효과적입니다!

### 시간이 부족하다면?

**최소 필수 경로** (6시간):

1. 01-SERVERLESS-BASICS.md 읽기 (1시간)
2. examples/01-hello-world 배포 (1시간)
3. examples/02-api-gateway-s3 배포 (2시간)
4. SAM-MIGRATION-GUIDE.md 읽기 (1시간)
5. examples/03-hello-world-sam 배포 (1시간)

---

## 📞 문제 발생했을 때

- 🐛 배포 에러? → 해당 예제의 README.md 확인
- 🤔 개념 안 이해? → CLOUDFORMATION-CHEATSHEET.md 참고
- 🔍 명령어 찾기? → QUICK-REFERENCE.md 참고
- 📚 전체 인덱스? → 00-COMPLETE-INDEX.md 참고

---

## 🎓 학습 후 얻는 것

### Week 1 완료 후

✅ Serverless Framework 완벽 이해  
✅ Lambda, API Gateway, S3 통합 능력  
✅ 실제 배포 경험

### Week 2-3 완료 후

✅ CloudFormation 명시적 리소스 정의  
✅ SAM CLI 마스터  
✅ Serverless ↔ SAM 실시간 변환  
✅ **개인 프로젝트 마이그레이션 능력** ✨

---

## ✨ 시작하세요!

👇 당신의 시나리오에 맞는 첫 번째 링크를 클릭하세요:

- **새로운 경우**: [01-SERVERLESS-BASICS.md](./01-SERVERLESS-BASICS.md)
- **Week 1 완료**: [SAM-MIGRATION-GUIDE.md](./SAM-MIGRATION-GUIDE.md)
- **완전 정복**: [README.md](./README.md)

> 가장 좋은 학습은 손으로 배포해보는 것입니다. 💪
