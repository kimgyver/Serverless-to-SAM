# 01-hello-world 프로젝트 설정 및 테스트 가이드

## 📋 프로젝트 개요

**목표**: Serverless Framework로 기본적인 Lambda + DynamoDB 애플리케이션 학습

**포함 내용**:

- ✅ 8개의 HTTP 엔드포인트 (GET, POST, PUT, DELETE)
- ✅ 입력 검증 (validation)
- ✅ 통합된 에러 처리
- ✅ DynamoDB 데이터 저장소
- ✅ AWS 배포
- ✅ 로컬 테스트

---

## 🏗️ 구조

```
01-hello-world/
├── handlers/              # Lambda 함수 코드
│   └── hello.js          # 8개 엔드포인트 핸들러
├── utils/
│   ├── dynamodb.js       # DynamoDB 연동
│   └── validation.js     # 입력 검증 로직
├── serverless.yml        # Serverless 설정
├── package.json
└── tests/
    └── endpoints.sh      # 엔드포인트 테스트 스크립트
```

---

## 🚀 빠른 시작

### 1. 초기 설정

```bash
cd /Users/jinyoungkim/lambda-repo/sam-scheduled-task/sam-learning/examples/01-hello-world

# 의존성 설치
npm install

# AWS 자격증명 설정 (이미 했다면 스킵)
aws configure
```

### 2. 로컬 테스트

```bash
# serverless-offline 시작
npm run offline

# 다른 터미널에서 테스트
bash tests/endpoints.sh
```

**로컬 테스트 방식**:

- Lambda: `serverless-offline` (포트 3000)
- DynamoDB: AWS 개발 테이블 (`hello-world-items-dev`)

> ⚠️ **주의**: 로컬에서도 AWS DynamoDB 개발 테이블을 사용합니다.
> 진정한 로컬 DynamoDB 테스트는 LocalStack 또는 SAM CLI 사용 필요.

### 3. AWS 배포

```bash
# 개발 환경 배포
npm run deploy:dev

# 프로덕션 배포
npm run deploy:prod
```

---

## 📝 8개 엔드포인트

### 기본 엔드포인트

| #   | 메서드 | 경로                  | 설명               | 예제                                                                                                    |
| --- | ------ | --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| 1   | GET    | `/dev/hello`          | Hello 반환         | `curl http://localhost:3000/dev/hello`                                                                  |
| 2   | GET    | `/dev/hello/{name}`   | 인사 반환          | `curl http://localhost:3000/dev/hello/john`                                                             |
| 3   | POST   | `/dev/message`        | 메시지 생성        | `curl -X POST http://localhost:3000/dev/message -H "Content-Type: application/json" -d '{"text":"hi"}'` |
| 4   | GET    | `/dev/divide/{a}/{b}` | 나눗셈 (에러 처리) | `curl http://localhost:3000/dev/divide/10/2`                                                            |

### DynamoDB 엔드포인트

| #   | 메서드 | 경로             | 설명        |
| --- | ------ | ---------------- | ----------- |
| 5   | POST   | `/dev/item`      | 아이템 생성 |
| 6   | GET    | `/dev/item/{id}` | 아이템 조회 |
| 7   | PUT    | `/dev/item/{id}` | 아이템 수정 |
| 8   | DELETE | `/dev/item/{id}` | 아이템 삭제 |

**DynamoDB 테스트 예제**:

```bash
# 아이템 생성
curl -X POST http://localhost:3000/dev/item \
  -H "Content-Type: application/json" \
  -d '{
    "id": "item1",
    "title": "My Item",
    "description": "Test item"
  }'

# 모든 아이템 조회
curl http://localhost:3000/dev/items

# 특정 아이템 조회
curl http://localhost:3000/dev/item/item1

# 아이템 수정
curl -X PUT http://localhost:3000/dev/item/item1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'

# 아이템 삭제
curl -X DELETE http://localhost:3000/dev/item/item1
```

---

## 🔧 코드 구조

### handlers/hello.js

```javascript
// 8개 핸들러 함수
-helloHandler() - // GET /hello
  greetHandler() - // GET /hello/{name}
  createMessageHandler() - // POST /message
  divideHandler() - // GET /divide/{a}/{b}
  createItemHandler() - // POST /item
  getItemHandler() - // GET /item/{id}
  updateItemHandler() - // PUT /item/{id}
  deleteItemHandler(); // DELETE /item/{id}
```

### utils/dynamodb.js

```javascript
// DynamoDB 작업 함수들
-createItem() - // 생성
  getItem() - // 조회
  updateItem() - // 수정
  deleteItem() - // 삭제
  listItems(); // 목록
```

### utils/validation.js

```javascript
// 입력값 검증
-validateItem() - // 아이템 유효성 검사
  validateId() - // ID 검증
  validateUpdateData(); // 수정 데이터 검증
```

---

## 🌍 환경 설정

### serverless.yml 주요 설정

```yaml
provider:
  stage: ${opt:stage, 'dev'} # 기본값: dev
  region: us-east-1
  runtime: nodejs18.x

environment:
  ITEMS_TABLE: hello-world-items-${self:provider.stage}
  STAGE: ${self:provider.stage}
```

### 환경 변수

| 변수          | 값                         | 설명              |
| ------------- | -------------------------- | ----------------- |
| `STAGE`       | dev / prod                 | 배포 환경         |
| `ITEMS_TABLE` | hello-world-items-dev/prod | DynamoDB 테이블명 |
| `IS_OFFLINE`  | true (로컬만)              | 로컬 개발 모드    |

---

## 💾 DynamoDB 테이블

### 테이블명

- **개발**: `hello-world-items-dev`
- **프로덕션**: `hello-world-items`

### 항목 구조

```javascript
{
  id: string,                    // Partition Key (필수)
  title: string,                 // 제목
  description: string,           // 설명 (선택)
  status: string,                // 상태 (기본: "active")
  createdAt: ISO8601,           // 생성 시간
  updatedAt: ISO8601            // 수정 시간
}
```

---

## 🧪 테스트

### 자동 테스트 (bash 스크립트)

```bash
# 모든 엔드포인트 테스트
bash tests/endpoints.sh
```

### 수동 테스트

```bash
# 기본 엔드포인트
curl http://localhost:3000/dev/hello
curl http://localhost:3000/dev/hello/john
curl -X POST http://localhost:3000/dev/message -d '{"text":"hi"}'

# 에러 테스트 (0으로 나누기)
curl http://localhost:3000/dev/divide/10/0
```

---

## ⚙️ 로컬 개발 vs 배포

### 로컬 개발 (`npm run offline`)

- Lambda: `serverless-offline` (포트 3000)
- DynamoDB: AWS 개발 테이블
- 자격증명: AWS CLI 사용
- 비용: 거의 없음 (쓰기: 1KB당 1.25 WCU)

### AWS 배포 (`npm run deploy:dev`)

- Lambda: 실제 AWS Lambda
- DynamoDB: AWS 프로덕션 테이블
- 자격증명: IAM Role 사용
- 비용: 사용량에 따라

---

## 🔐 권한 (IAM)

```yaml
# serverless.yml의 IAM 정책
- dynamodb:GetItem # 조회
- dynamodb:PutItem # 생성
- dynamodb:UpdateItem # 수정
- dynamodb:DeleteItem # 삭제
- dynamodb:Scan # 전체 목록
- logs:* # CloudWatch 로그
```

---

## 📚 추가 학습 자료

### 로컬 DynamoDB 완전 오프라인 테스트

**현재 상태**: serverless-dynamodb-local은 Java PATH 이슈로 비활성화됨

**대안**:

1. **LocalStack** (권장)

   ```bash
   docker run -p 4566:4566 localstack/localstack
   ```

2. **AWS SAM CLI**
   ```bash
   sam local start-dynamodb
   sam local start-api
   ```

### 참고

- [Serverless Framework 공식 문서](https://www.serverless.com/)
- [AWS Lambda 개발자 가이드](https://docs.aws.amazon.com/lambda/)
- [DynamoDB 모범 사례](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

## ✅ 체크리스트

- [ ] AWS 자격증명 설정됨
- [ ] `npm install` 완료
- [ ] `npm run offline` 실행 가능
- [ ] 엔드포인트 테스트 통과
- [ ] AWS 배포 가능
- [ ] DynamoDB 아이템 CRUD 작동

---

## 🐛 문제 해결

### "Cannot find module 'aws-sdk'"

```bash
npm install aws-sdk
```

### "EADDRINUSE: address already in use :::3000"

```bash
# 포트 3000 프로세스 종료
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### "User: arn:aws:iam::xxx:user/xxx is not authorized"

```bash
# AWS 자격증명 확인
aws sts get-caller-identity
```

### "ResourceNotFoundException: Cannot do operations on a non-existent table"

```bash
# DynamoDB 테이블 확인
aws dynamodb list-tables

# 테이블 수동 생성
npm run create:table:dev
```

---

**최종 수정**: 2025-12-27
