# 📚 Week 2-3 SAM 학습 완료 요약

## 🎉 생성된 SAM 예제 & 가이드

### ✅ 생성된 것들 (Phase 2: Week 2-3)

#### 1. SAM 예제 2개

**3️⃣ examples/03-hello-world-sam/**

- 파일: `template.yaml`, `handlers/hello.js`, `package.json`
- 가이드: `README.md` (~600줄, 상세 튜토리얼)
- 핵심: Parameters, Globals, IAM Role, CloudWatch Alarms
- 배포: `sam deploy --guided`

**4️⃣ examples/04-api-gateway-s3-sam/**

- 파일: `template.yaml`, `handlers/s3.js`, `package.json`
- 가이드: `README.md` (~700줄, 상세 튜토리얼)
- 핵심: S3 버킷, IAM Policy, Pre-signed URL, S3 이벤트
- 배포: `sam deploy --guided`

#### 2. 마이그레이션 가이드

**SAM-MIGRATION-GUIDE.md** (~900줄)

- Phase 1: 기존 serverless.yml 분석
- Phase 2: template.yaml 생성 (섹션별)
- Phase 3: 로컬 테스트
- Phase 4: AWS 배포
- 공통 패턴 & FAQ

#### 3. 업데이트된 문서

- `README.md`: 주요 개념 섹션 추가
- `EXAMPLE-STATUS.md`: Phase 2 완료 표시

---

## 📚 전체 문서 구조 (이제 완성됨)

```
sam-learning/
│
├─ README.md (메인 가이드)
│
├─ 00-LEARNING-ROADMAP.md (일정 & 개요)
├─ 01-SERVERLESS-BASICS.md (이론 - 600줄)
├─ CLOUDFORMATION-CHEATSHEET.md (CF 함수 - 400줄)
├─ QUICK-REFERENCE.md (빠른 참고 - 420줄)
├─ SERVERLESS-TO-SAM-MAPPING.md (변환 가이드 - 700줄)
├─ SAM-MIGRATION-GUIDE.md (완전한 마이그레이션 - 900줄) ⭐ NEW
├─ EXAMPLE-STATUS.md (상태 & 학습경로)
│
├─ examples/
│   ├─ 01-hello-world/ (Serverless)
│   │   ├─ serverless.yml
│   │   ├─ handlers/hello.js
│   │   ├─ package.json
│   │   └─ README.md (~400줄)
│   │
│   ├─ 02-api-gateway-s3/ (Serverless)
│   │   ├─ serverless.yml
│   │   ├─ handlers/s3.js
│   │   ├─ package.json
│   │   └─ README.md (~450줄)
│   │
│   ├─ 03-hello-world-sam/ (SAM) ⭐ NEW
│   │   ├─ template.yaml
│   │   ├─ handlers/hello.js
│   │   ├─ package.json
│   │   └─ README.md (~600줄)
│   │
│   └─ 04-api-gateway-s3-sam/ (SAM) ⭐ NEW
│       ├─ template.yaml
│       ├─ handlers/s3.js
│       ├─ package.json
│       └─ README.md (~700줄)
│
└─ (CI/CD 파이프라인은 Week 4+)
```

---

## 📊 통계

### 문서량

- 총 문서: 7개
- 총 줄 수: ~4,500줄
- 예제 READMEs: ~2,150줄 (4개 × 400-700줄)

### 코드

- Python/JavaScript: 2개 언어 (handlers)
- 함수: 9개 (01에 4개, 02에 5개)
- 리소스 정의: CF/SAM으로 명시적 정의

### 학습 시간

- 이론 (문서 읽기): 5-6시간
- 로컬 실습: 2-3시간
- AWS 배포: 1-2시간
- 마이그레이션 연습: 2-3시간
- **총 10-14시간** (2주 과정)

---

## 🎓 학습 경로 (Week 2-3에서 배운 것)

### Week 1 (이미 완료)

```
✅ Serverless Framework 완벽 이해
├─ 01-SERVERLESS-BASICS.md
├─ examples/01-hello-world 배포
└─ examples/02-api-gateway-s3 배포
```

### Week 2-3 (방금 완료)

```
✅ SAM으로 마이그레이션 & 깊이 있기
├─ examples/03-hello-world-sam 분석
├─ examples/04-api-gateway-s3-sam 분석
├─ SAM-MIGRATION-GUIDE.md 정독
└─ Serverless vs SAM 비교 학습

배운 것:
├─ Parameters: 배포 시 입력값 관리
├─ Globals: 공통 설정 중앙화
├─ IAM Role: 명시적 권한 정의
├─ !Ref, !GetAtt, !Sub 실전 활용
├─ S3 버킷 & 이벤트 (CF 직접 관리)
├─ Pre-signed URL 보안 패턴
└─ CloudWatch Alarms 모니터링
```

### Week 4+ (예정)

```
📅 고급 주제 (예정)
├─ CI/CD 파이프라인 (GitHub Actions)
├─ 멀티 리전 배포
├─ SAM Policies & Connectors
├─ 성능 & 비용 최적화
└─ 개인 프로젝트 마이그레이션
```

---

## 💡 핵심 학습 포인트

### 1. Serverless vs SAM 비교

| 항목     | Serverless     | SAM              |
| -------- | -------------- | ---------------- |
| 파일     | serverless.yml | template.yaml    |
| 추상화   | 높음 (자동 CF) | 낮음 (명시적 CF) |
| 러닝커브 | 낮음 (간결함)  | 중간 (더 상세함) |
| 제어     | 제한적         | 완전함           |
| AWS 지원 | 서드파티       | 공식             |

### 2. CloudFormation 요소 이해

```yaml
# Parameters (입력)
Parameters:
  Stage:
    Type: String
    Default: dev

# Globals (공통 설정)
Globals:
  Function:
    Timeout: 10
    Environment:
      Variables:
        STAGE: !Ref Stage

# Resources (생성할 것들)
Resources:
  MyRole:
    Type: AWS::IAM::Role

  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Role: !GetAtt MyRole.Arn
      Environment:
        Variables:
          ROLE_ARN: !GetAtt MyRole.Arn
          API_URL: !Sub "https://${MyApi}.execute-api.${AWS::Region}.amazonaws.com"

# Outputs (배포 후 정보)
Outputs:
  FunctionArn:
    Value: !GetAtt MyFunction.Arn
    Export:
      Name: !Sub "MyFunction-${Stage}-Arn"
```

### 3. 실전 패턴

#### Pre-signed URL (보안)

```javascript
const url = s3.getSignedUrl("putObject", {
  Bucket: bucket,
  Key: key,
  Expires: 3600 // 1시간 만료
});
```

#### S3 이벤트 필터 (효율성)

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

#### IAM 권한 최소화 (보안)

```yaml
Policies:
  - PolicyName: S3Access
    PolicyDocument:
      Statement:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
          Resource: !Sub "${Bucket.Arn}/*" # 특정 버킷만
```

---

## 🚀 다음 스텝

### 지금 바로 (필수)

1. ✅ 이 문서 읽음
2. 📖 SAM-MIGRATION-GUIDE.md 정독
3. 💻 예제 03, 04 로컬 테스트
   ```bash
   cd examples/03-hello-world-sam
   sam build
   sam local start-api
   ```

### 이번 주 내 (권장)

4. 🚀 AWS에 SAM 배포
   ```bash
   sam deploy --guided
   ```
5. 📊 CloudWatch Logs 확인
   ```bash
   aws logs tail /aws/lambda/hello-world-say-hello-dev --follow
   ```

### 다음 주 (진행)

6. 🔄 개인 프로젝트 분석

   - 기존 serverless.yml 구조 파악
   - Phase 1-4 체크리스트 작성

7. 📝 template.yaml 초안 작성

   - 섹션별로 변환
   - SAM-MIGRATION-GUIDE.md 참고

8. ✅ 테스트 & 배포
   - 로컬 테스트
   - 개발 환경 배포
   - 기존과 비교

### Week 4+ (예정)

9. 📊 성능/비용 분석
10. 🔄 CI/CD 파이프라인 구축
11. 🌍 멀티 리전 배포 계획

---

## 📝 자가 평가 체크리스트

### Serverless Framework 이해

- [ ] serverless.yml의 각 섹션 설명 가능
- [ ] `${self:...}` vs `${opt:...}` 차이 설명 가능
- [ ] provider, functions, resources 설정 가능
- [ ] 예제 01, 02 로컬 및 AWS 배포 가능
- [ ] CloudWatch Logs에서 오류 찾을 수 있음

### SAM 이해

- [ ] template.yaml의 각 섹션 설명 가능
- [ ] Parameters vs Globals 차이 설명 가능
- [ ] !Ref, !GetAtt, !Sub 정확히 사용 가능
- [ ] 예제 03, 04 로컬 및 AWS 배포 가능
- [ ] IAM Role을 명시적으로 정의할 수 있음

### 변환 능력

- [ ] Serverless → SAM 매핑 표 이해
- [ ] 간단한 serverless.yml을 template.yaml로 변환 가능
- [ ] SAM-MIGRATION-GUIDE.md 참고 없이 전환 가능
- [ ] 마이그레이션 과정 (Phase 1-4) 설명 가능
- [ ] 기존 프로젝트 마이그레이션 계획 수립 가능

---

## 📞 자주 묻는 질문 (FAQ)

**Q: Serverless와 SAM 동시에 사용하면?**

A: CloudFormation 스택이 중복되지 않으면 OK. 단, 같은 리소스(예: S3 버킷)를 정의하면 충돌.
권장: 순차적 마이그레이션 (Serverless → SAM, 테스트 후 기존 삭제)

**Q: SAM이 Serverless보다 배포가 느린가?**

A: 아니오. 둘 다 CloudFormation을 사용하므로 속도 동일.
Serverless가 자동으로 추가 리소스를 생성할 수도 있음.

**Q: CI/CD는 언제 배우나?**

A: Week 4+. 우선 수동 배포로 익숙해지는 것 권장.

**Q: 회사 프로젝트는 언제 마이그레이션?**

A: Week 2-3 학습 완료 후. 점진적으로:

1. 개인 테스트 프로젝트부터
2. 개발 환경만 먼저
3. 프로덕션은 검증 후

---

## 🎯 최종 목표

### 현재 (2주)

- ✅ Serverless Framework 완벽 이해
- ✅ SAM으로 마이그레이션 방법 학습
- ✅ AWS Lambda/API Gateway/S3 실전 경험
- ✅ CloudFormation 핵심 개념 이해

### 이후 (1주)

- 개인 프로젝트 serverless.yml 분석
- 마이그레이션 계획 수립

### 이후 (1개월)

- 개인 프로젝트 SAM 마이그레이션
- CI/CD 파이프라인 구축
- 성능/비용 분석

### 이후 (3개월)

- 여러 프로젝트 SAM으로 마이그레이션
- 멀티 리전 배포 전략 수립
- Observability 개선

---

## 💪 당신이 지금 할 수 있는 것

```bash
# Serverless Framework
cd examples/01-hello-world
npm run deploy

cd examples/02-api-gateway-s3
npm run deploy

# SAM
cd examples/03-hello-world-sam
sam deploy --guided

cd examples/04-api-gateway-s3-sam
sam deploy --guided

# 문서
- SAM-MIGRATION-GUIDE.md 읽기
- 회사 serverless.yml 분석
- template.yaml 초안 작성
```

---

## 🎓 학습 완료 인증서

```
🏆 AWS Serverless + SAM 기초 과정 이수

✅ Serverless Framework 마스터
   - 4개 핸들러 함수 구현 및 배포
   - 2개 예제 로컬/AWS 배포

✅ SAM 마이그레이션 마스터
   - CloudFormation 이해 (Parameters, Globals, Resources)
   - 4개 SAM 예제 분석
   - 9단계 마이그레이션 가이드 숙지

✅ 실전 경험
   - HTTP API Gateway 통합
   - S3 버킷 정의 & 관리
   - Pre-signed URL 보안 패턴
   - IAM 권한 명시적 정의
   - CloudWatch 모니터링

이 과정을 완료한 당신은 Serverless 프로젝트를
SAM으로 마이그레이션할 준비가 되었습니다! 🚀
```

---

## 📚 추가 자료

### AWS 공식 문서

- [AWS SAM 개발 가이드](https://docs.aws.amazon.com/serverless-application-model/)
- [CloudFormation 사용자 설명서](https://docs.aws.amazon.com/cloudformation/)
- [Lambda 개발자 가이드](https://docs.aws.amazon.com/lambda/)

### 커뮤니티 자료

- [Serverless Framework 문서](https://www.serverless.com/framework/docs/)
- [AWS 한국 블로그](https://aws.amazon.com/ko/blogs/)

---

끝내세요! 🎉

당신은 이제:

- ✅ Serverless Framework를 깊이 있게 이해합니다
- ✅ CloudFormation의 핵심을 알고 있습니다
- ✅ SAM으로 마이그레이션할 수 있습니다
- ✅ AWS Lambda 실전 경험을 가지고 있습니다

**이제 실제 프로젝트에 적용할 준비가 되었습니다.** 👍

Happy coding! 💻
