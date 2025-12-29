# 테스트 가이드

이 디렉토리는 `04-api-gateway-s3-sam` 프로젝트의 테스트 스크립트를 포함합니다.

## 📋 테스트 파일 목록

| 파일                 | 설명                      | 실행 환경     |
| -------------------- | ------------------------- | ------------- |
| `localstack.test.js` | LocalStack S3 통합 테스트 | 로컬 (Docker) |
| `sam-local.test.js`  | SAM Local + AWS S3 테스트 | 로컬 (SAM)    |
| `aws-lambda.test.sh` | AWS Lambda 라이브 테스트  | AWS           |

---

## 🚀 테스트 실행

### 1️⃣ LocalStack 테스트 (15 테스트)

```bash
npm test
# 또는
AWS_REGION=us-west-2 ITEMS_TABLE=api-s3-fileupload-local \
  S3_LOCAL_ENDPOINT=http://localhost:4566 \
  node test/localstack.test.js
```

**사전 요구사항**:

- Docker 설치
- `docker-compose up -d` 로 LocalStack 실행

**테스트 항목**:

- ✅ S3 버킷 생성
- ✅ ListFiles (빈 버킷, prefix 필터)
- ✅ UploadFile (URL 생성, 검증)
- ✅ GetFile (URL 생성, 검증)
- ✅ DeleteFile (정상 삭제, 오류 처리)
- ✅ ProcessUpload (S3 이벤트)

---

### 2️⃣ SAM Local 테스트 (5 테스트)

```bash
npm run test:sam-local
# 또는
node test/sam-local.test.js
```

**사전 요구사항**:

- AWS CLI 설치
- SAM CLI 설치
- `.env.json` 파일 존재 (프로젝트 루트)
- AWS 자격증명 설정

**테스트 항목**:

- ✅ ListFunc - 파일 목록 조회
- ✅ UploadFunc - 업로드 URL 생성
- ✅ GetFunc - 다운로드 URL 생성
- ✅ DelFunc - 파일 삭제
- ✅ ProcessFunc - S3 이벤트 처리

---

### 3️⃣ AWS Lambda 라이브 테스트 (7 테스트)

```bash
npm run test:aws-lambda
# 또는
bash test/aws-lambda.test.sh
```

**사전 요구사항**:

- AWS Lambda 배포 완료
- CloudFormation 스택 생성됨
- API Gateway 엔드포인트 생성됨

**테스트 항목**:

- ✅ ListFiles - 파일 목록 조회
- ✅ UploadFile - 업로드 URL 생성
- ✅ 파일 업로드 - S3에 실제 파일 업로드
- ✅ ListFiles (After Upload) - 업로드 확인
- ✅ GetFile - 다운로드 URL 생성
- ✅ DeleteFile - 파일 삭제
- ✅ ListFiles with Prefix - prefix 필터 검증

---

## 📊 전체 테스트 실행

```bash
npm run test:all
```

이 명령은 순서대로 다음을 실행합니다:

1. LocalStack 테스트 (15개)
2. SAM Local 테스트 (5개)
3. AWS Lambda 라이브 테스트 (7개)

**총 27개 테스트 수행**

---

## 📝 테스트 결과 해석

### ✅ 성공 (Green)

```
✅ ListFiles - 파일 목록 조회 ... ✅ (200)
```

테스트 통과. HTTP 상태 코드가 예상된 범위.

### ❌ 실패 (Red)

```
❌ GetFile - 다운로드 URL 생성 ... ❌ (500)
```

테스트 실패. HTTP 상태 코드가 예상 범위 밖.

### ⚠️ 예상된 오류

```
✅ GetFile - 존재하지 않는 파일 ... ✅ (404 - Expected)
```

오류가 예상되었으나 정상적으로 처리됨.

---

## 🔍 디버깅

### LocalStack 테스트 실패

```bash
# LocalStack 상태 확인
docker ps | grep localstack

# LocalStack 로그 확인
docker logs localstack

# LocalStack 다시 시작
docker-compose restart
```

### SAM Local 테스트 실패

```bash
# SAM 빌드
sam build

# 환경 변수 확인
cat .env.json

# AWS 자격증명 확인
aws sts get-caller-identity
```

### AWS Lambda 테스트 실패

```bash
# CloudFormation 스택 확인
aws cloudformation describe-stacks \
  --stack-name api-s3-fileupload-sam-dev \
  --region us-west-2

# Lambda 함수 로그 확인
aws logs tail /aws/lambda/api-s3-fileupload-sam-dev-ListFunc-xxx \
  --region us-west-2 --follow

# API Gateway 테스트
curl -v https://w4tjnuge4j.execute-api.us-west-2.amazonaws.com/dev/files
```

---

## 📌 주요 노트

- **LocalStack 테스트**: 개발 환경에서 AWS 서비스를 로컬로 테스트
- **SAM Local 테스트**: 실제 AWS S3를 사용하되 Lambda는 로컬에서 실행
- **AWS Lambda 테스트**: 프로덕션 환경 검증

각 테스트는 독립적으로 실행 가능하며, 순서대로 실행할 필요는 없습니다.

---

## 📚 더 알아보기

- [LocalStack 문서](https://docs.localstack.cloud/)
- [SAM 개발자 가이드](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda 테스트](https://docs.aws.amazon.com/lambda/latest/dg/testing-functions.html)

---

**최종 업데이트**: 2025-12-29
