# 🎯 Example 01: Hello World Lambda (Day 1 실습)

## 📌 이 예제의 목표

- Serverless Framework의 **기본 구조** 이해
- **8가지 HTTP 핸들러** 작성 경험 (GET, POST, PUT, DELETE)
- **요청 검증** (Request Validation) 구현
- **에러 처리** (Error Handling) 패턴
- **DynamoDB 연동** 실습
- 배포 → AWS 콘솔 확인 → 로컬 테스트

---

## 📁 구조

```
01-hello-world/
├── serverless.yml        ← Serverless Framework 설정 + DynamoDB 테이블
├── package.json          ← 의존성 (aws-sdk 포함)
├── handlers/
│   └── hello.js          ← 8개 Lambda 함수
├── utils/
│   ├── validation.js      ← 요청 검증 유틸
│   ├── errors.js          ← 에러 처리 클래스
│   └── dynamodb.js        ← DynamoDB 연동
└── README.md             ← 이 파일
```

---

## 🚀 빠른 시작 (5분)

### 1️⃣ 설치

```bash
cd examples/01-hello-world
npm install
```

### 2️⃣ 로컬 테스트 (serverless-offline)

```bash
npm run offline
```

그 다음 다른 터미널에서:

```bash
# 1. GET /hello - 기본
curl http://localhost:3000/dev/hello

# 2. GET /hello/{name} - 경로 파라미터
curl http://localhost:3000/dev/hello/Jason

# 3. POST /message - 본문 파싱 + 검증
curl -X POST http://localhost:3000/dev/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","author":"Jason"}'

# 4. GET /divide/{a}/{b} - 계산 + 에러 처리
curl http://localhost:3000/dev/divide/100/4

# 5. POST /item - DynamoDB 저장
curl -X POST http://localhost:3000/dev/item \
  -H "Content-Type: application/json" \
  -d '{"title":"My Item","description":"Test"}'

# 6. GET /items - 전체 조회
curl http://localhost:3000/dev/items

# 7. PUT /item/{id} - 업데이트
curl -X PUT http://localhost:3000/dev/item/item-xxx-yyy \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated","status":"inactive"}'

# 8. DELETE /item/{id} - 삭제
curl -X DELETE http://localhost:3000/dev/item/item-xxx-yyy
```

### 3️⃣ AWS에 배포

```bash
# dev 환경에 배포
npm run deploy

# prod 환경에 배포
serverless deploy --stage prod

# 특정 리전 (호주 예)
serverless deploy --region ap-southeast-2 --stage au-prod
```

### 4️⃣ AWS에서 테스트

배포 후 출력된 엔드포인트로 테스트합니다:

```bash
# 기본 응답
curl https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/hello

# 경로 파라미터
curl https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/hello/World

# POST - 검증 테스트 (성공)
curl -X POST -H "Content-Type: application/json" \
  -d '{"message":"Test","author":"Jason"}' \
  https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/message

# POST - 검증 실패 (message 필수)
curl -X POST -H "Content-Type: application/json" \
  -d '{"author":"Jason"}' \
  https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/message

# DynamoDB - 새 아이템 생성
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"첫 번째 아이템","description":"AWS에서 생성"}' \
  https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/item

# DynamoDB - 전체 조회
curl https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/items

# 에러 처리 - divide by zero
curl https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/divide/50/0
```

### 5️⃣ 로그 확인

```bash
# 실시간 로그 (최근 10줄)
serverless logs -f sayHello -t

# 특정 함수의 로그
serverless logs -f createItem

# 모든 함수 로그
serverless logs
```

### 6️⃣ 배포 제거

```bash
npm run remove
# 또는
serverless remove --stage prod
```

---

## 📖 serverless.yml 상세 설명

### 기본 구조

```yaml
service: hello-world-lambda
```

- 프로젝트 이름
- CloudFormation 스택 이름 = `hello-world-lambda-dev`, `hello-world-lambda-prod` 등

### Provider 설정

````

```yaml
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'} # 배포 시: --stage prod로 지정
```

### IAM 권한 (모든 Lambda 공유)

```yaml
iam:
  role:
    name: HelloWorldRole-${self:provider.stage}
    statements:
      - Effect: Allow
        Action: logs:*
        Resource: "*"
```

- **중요**: 이 권한들을 모든 Lambda 함수가 자동으로 받음
- CloudFormation에서 자동으로 IAM Role 생성

### 환경 변수 (모든 Lambda 공유)

```yaml
environment:
  STAGE: ${self:provider.stage}
  LOG_LEVEL: INFO
```

- 코드에서: `process.env.STAGE`, `process.env.LOG_LEVEL` 접근

### Lambda 함수 정의

```yaml
functions:
  sayHello:
    handler: handlers/hello.helloHandler
    events:
      - http:
          path: hello
          method: get
          cors: true
```

- `handler`: 파일.함수명 형식
- `events`: 이 함수를 트리거하는 이벤트 (API Gateway, S3 등)

---

## 🔍 handlers/hello.js 상세 설명

### 1️⃣ 기본 함수 (파라미터 없음)

```javascript
exports.helloHandler = async (event, context) => {
  // event: API Gateway에서 전달한 HTTP 요청 정보
  // context: Lambda 실행 환경 정보 (requestId, functionName 등)

  return createResponse(200, {
    message: "Hello from Serverless!"
  });
};
```

**Lambda 함수 시그니처:**

```
handler(event, context, callback) → response
```

### 2️⃣ 경로 파라미터 (URL의 {name} 부분)

```javascript
exports.greetHandler = async (event, context) => {
  const { name } = event.pathParameters;
  // GET /hello/Jason → name = "Jason"

  return createResponse(200, {
    message: `Hello, ${name}!`
  });
};
```

### 3️⃣ POST 본문 처리

```javascript
exports.createMessageHandler = async (event, context) => {
  let body;

  // 🔴 주의: API Gateway에서 body는 String으로 옴
  if (typeof event.body === "string") {
    body = JSON.parse(event.body);
  } else {
    body = event.body;
  }

  const { message, author } = body;
  // ...
};
```

**API Gateway에서 오는 event 구조:**

```javascript
{
  resource: '/hello/{name}',
  path: '/hello/Jason',
  httpMethod: 'GET',
  headers: { 'Content-Type': 'application/json', ... },
  queryStringParameters: { ... },
  pathParameters: { name: 'Jason' },
  body: '{"message":"..."}',  // String!
  isBase64Encoded: false,
}
```

### 4️⃣ 에러 처리 (구조화된 에러 클래스)

```javascript
const {
  BadRequestError,
  ValidationError,
  NotFoundError,
  handleError
} = require("../utils/errors");

exports.divideHandler = async (event, context) => {
  try {
    const { a, b } = event.pathParameters;

    // 숫자 검증
    const validation = validateNumber(b, { required: true });
    if (!validation.valid) {
      throw new BadRequestError("Invalid parameter", { field: "b" });
    }

    const numB = Number(b);
    if (numB === 0) {
      throw new BadRequestError("Cannot divide by zero", { field: "b" });
    }

    return createResponse(200, { result: a / b });
  } catch (error) {
    // 모든 에러를 통일된 형식으로 처리
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};
```

**에러 응답 예:**
```json
{
  "statusCode": 400,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot divide by zero",
    "timestamp": "2025-12-27T00:00:44.418Z",
    "details": { "field": "b" }
  }
}
```

### 5️⃣ 요청 검증 (Validation Utils)

```javascript
const { validateString, validateSchema } = require("../utils/validation");

exports.createMessageHandler = async (event, context) => {
  try {
    let body = JSON.parse(event.body);

    // 스키마 기반 검증
    const schema = {
      message: {
        validator: (val) => validateString(val, {
          required: true,
          minLength: 1,
          maxLength: 500
        })
      },
      author: {
        validator: (val) => validateString(val, {
          required: false,
          maxLength: 100
        })
      }
    };

    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // 검증 통과 - 계속 진행
    return createResponse(200, { ... });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};
```

**검증 실패 응답:**
```json
{
  "statusCode": 422,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": {
        "message": "This field is required",
        "author": "Maximum length is 100"
      }
    }
  }
}
```

### 6️⃣ DynamoDB 연동

```javascript
const {
  createItem,
  getItem,
  updateItem,
  deleteItem,
  getAllItems,
  itemExists
} = require("../utils/dynamodb");

// POST /item - 새 아이템 생성
exports.createItemHandler = async (event, context) => {
  try {
    let body = JSON.parse(event.body);

    // 검증 (생략)

    // ID 생성
    const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // DynamoDB에 저장
    const item = await createItem({
      id,
      title: body.title,
      description: body.description || "",
      status: body.status || "active"
    });

    return createResponse(201, {
      ...item,
      message: "Item created successfully"
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// GET /items - 전체 조회
exports.listItemsHandler = async (event, context) => {
  const items = await getAllItems();
  return createResponse(200, {
    items,
    count: items.length
  });
};

// PUT /item/{id} - 업데이트
exports.updateItemHandler = async (event, context) => {
  const { id } = event.pathParameters;
  let body = JSON.parse(event.body);

  // 아이템 존재 확인
  if (!await itemExists(id)) {
    throw new NotFoundError(`Item ${id} not found`);
  }

  // 업데이트
  const updated = await updateItem(id, body);
  return createResponse(200, {
    ...updated,
    message: "Item updated successfully"
  });
};

// DELETE /item/{id} - 삭제
exports.deleteItemHandler = async (event, context) => {
  const { id } = event.pathParameters;

  if (!await itemExists(id)) {
    throw new NotFoundError(`Item ${id} not found`);
  }

  await deleteItem(id);
  return createResponse(200, {
    id,
    message: "Item deleted successfully"
  });
};
```

### 7️⃣ 비동기 작업 시뮬레이션

```javascript
// 실제 작업 (API 호출, DB 쿼리 등)이 얼마나 걸리는지 시뮬레이션
const simulateAsyncWork = (delayMs = 100) => {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

// 사용 예
exports.createItemHandler = async (event, context) => {
  // ... 검증 ...

  // 외부 API 호출 시뮬레이션 (200ms)
  await simulateAsyncWork(200);

  // DynamoDB에 저장
  const item = await createItem(...);

  return createResponse(201, item);
};
```

---

## 📊 배포 후 생성되는 AWS 리소스

### CloudFormation 스택

```
hello-world-lambda-dev
├── Lambda Functions (8개)
│   ├── hello-world-lambda-dev-sayHello
│   ├── hello-world-lambda-dev-greet
│   ├── hello-world-lambda-dev-createMessage
│   ├── hello-world-lambda-dev-divide
│   ├── hello-world-lambda-dev-updateItem
│   ├── hello-world-lambda-dev-deleteItem
│   ├── hello-world-lambda-dev-listItems
│   └── hello-world-lambda-dev-createItem
├── API Gateway
│   └── hello-world-lambda-dev
│       ├── GET  /hello
│       ├── GET  /hello/{name}
│       ├── POST /message
│       ├── GET  /divide/{a}/{b}
│       ├── PUT  /item/{id}
│       ├── DELETE /item/{id}
│       ├── GET  /items
│       └── POST /item
├── DynamoDB
│   └── hello-world-items-dev (PAY_PER_REQUEST)
│       └── Key: id (String)
├── IAM
│   └── HelloWorldRole-dev (실행 역할 + DynamoDB 권한)
└── CloudWatch
    └── /aws/lambda/hello-world-lambda-dev-* (로그)
```

### 실제 콘솔 확인 경로

1. **Lambda 콘솔**

   - 함수: `hello-world-lambda-dev-sayHello` 등
   - 트리거 탭: API Gateway 통합 확인
   - 권한 탭: IAM Role 확인

2. **API Gateway 콘솔**

   - API: `hello-world-lambda-dev`
   - 리소스: `/hello`, `/hello/{name}` 등
   - 방법: GET, POST 등
   - 통합: Lambda 함수 연결 확인

3. **CloudFormation 콘솔**

   - 스택: `hello-world-lambda-dev`
   - 리소스 탭: 생성된 모든 리소스 확인
   - 템플릿 탭: Serverless가 생성한 JSON 확인

4. **IAM 콘솔**

   - 역할: `HelloWorldRole-dev`
   - 신뢰 관계: Lambda 서비스가 이 역할 사용 가능
   - 권한: CloudWatch Logs 권한 확인

5. **CloudWatch Logs 콘솔**
   - 로그 그룹: `/aws/lambda/hello-world-lambda-dev-sayHello` 등
   - 실행할 때마다 로그 스트림 생성

---

## 🧪 테스트 방법

### 방법 1️⃣: serverless-offline (로컬)

```bash
npm run offline
# http://localhost:3000/dev/* 로 접근
```

**장점:**

- 빠름 (배포 안 함)
- 수정 후 즉시 테스트
- 인터넷 필요 없음

**단점:**

- 실제 AWS와 완벽히 같지 않음
- IAM 권한 미검증

### 방법 2️⃣: AWS에 배포 후 테스트

```bash
npm run deploy
# 실제 endpoint로 접근
```

**장점:**

- 실제 환경과 동일
- IAM 권한 검증
- CloudWatch Logs 확인 가능

**단점:**

- 배포에 시간 걸림 (1-2분)
- AWS 비용 (micro가 무료)

### 방법 3️⃣: AWS Lambda 콘솔 테스트

1. Lambda 콘솔 → 함수 선택
2. 코드 탭 → "Test" 버튼
3. 테스트 이벤트 작성 (JSON)
4. 실행 및 결과 확인

**테스트 이벤트 예:**

```json
{
  "resource": "/hello",
  "path": "/hello",
  "httpMethod": "GET",
  "headers": {},
  "pathParameters": null,
  "queryStringParameters": null,
  "body": null,
  "isBase64Encoded": false
}
```

---

## 📝 Day 1 학습 포인트

### ✅ 이해해야 할 것

- [ ] serverless.yml의 각 섹션 (service, provider, functions, iam, environment, events)
- [ ] Lambda handler 함수 시그니처 (event, context)
- [ ] API Gateway와 Lambda의 통합 방식
- [ ] IAM Role이 모든 Lambda 함수에 자동 적용되는 방식
- [ ] 배포 과정 (serverless deploy → CloudFormation → AWS 리소스)

### 🧪 해봐야 할 것

- [ ] npm install & npm run offline
- [ ] 4가지 함수 모두 로컬에서 테스트
- [ ] AWS에 배포 (npm run deploy)
- [ ] AWS 콘솔에서 생성된 리소스 확인
- [ ] CloudFormation 스택 템플릿(JSON) 확인
- [ ] 배포 제거 (npm run remove)

---

## 🔗 다음 단계

- **Day 2**: S3, DynamoDB, SQS 이벤트 추가
- **마이그레이션**: 이 serverless.yml을 SAM template.yaml로 변환

---

## 💡 팁

```bash
# 배포 실패시 로그 확인
serverless deploy -v

# 특정 함수만 배포 (빠름)
serverless deploy function -f sayHello

# 환경변수 설정 확인
serverless info

# 배포된 로그 확인
serverless logs -f sayHello --tail

# 배포 상태 확인
aws cloudformation describe-stacks --stack-name hello-world-lambda-dev
```

---

## ❓ 자주 묻는 질문 (FAQ)

### **Q1: npm install 할 때 ERESOLVE 에러가 나요**

```
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! Found: serverless@3.40.0
npm ERR! Could not resolve dependency: peer serverless@"^4.0.0" from serverless-offline@14.4.0
```

**원인:** npm 7+의 엄격한 peer dependency 검증

**해결:**

```bash
npm install  # serverless-offline@13.3.0 (호환 버전)
```

현재 package.json은 이미 호환 버전으로 설정되어 있습니다:

```json
{
  "serverless": "^3.40.0",
  "serverless-offline": "^13.3.0" // v14 대신 v13
}
```

---

### **Q4: DynamoDB 테이블이 생성되지 않았어요**

**확인:**

```bash
# AWS 콘솔에서 확인
aws dynamodb describe-table --table-name hello-world-items-dev

# Serverless 배포 로그 확인
serverless deploy -v

# CloudFormation 콘솔에서 확인
aws cloudformation describe-stacks --stack-name hello-world-lambda-dev
```

**일반적인 원인:**

1. IAM 권한 부족 → AWS 계정 다시 설정
2. 배포 실패 → 로그 확인 필수
3. 다른 리전에 배포 → 올바른 리전 확인

```bash
# 리전 확인
aws configure get region

# 특정 리전에 배포
serverless deploy --region us-east-1
```

---

### **Q5: DynamoDB에 데이터가 저장되지 않았어요**

**확인:**

```bash
# 테이블 스캔
aws dynamodb scan --table-name hello-world-items-dev

# CloudWatch 로그 확인
serverless logs -f createItem -t
```

**일반적인 원인:**

1. **IAM 권한 부족** → serverless.yml의 DynamoDB 권한 확인

```yaml
iamRoleStatements:
  - Effect: Allow
    Action:
      - dynamodb:GetItem
      - dynamodb:PutItem
      - dynamodb:UpdateItem
      - dynamodb:DeleteItem
      - dynamodb:Scan
    Resource: "arn:aws:dynamodb:${self:provider.region}:*:table/hello-world-items-${self:provider.stage}"
```

2. **테이블 이름 불일치** → 환경변수 확인

```bash
# 로그에서 사용된 테이블명 확인
serverless logs -f createItem --tail
```

3. **유효하지 않은 항목 구조** → ID 필드 필수

---

### **Q6: 로컬(serverless-offline)에서 DynamoDB를 테스트할 수 없나요?**

**맞습니다!** serverless-offline은 HTTP 이벤트만 지원합니다.

| 기능 | 로컬 | AWS |
|------|------|-----|
| HTTP 요청 | ✅ | ✅ |
| DynamoDB | ❌ | ✅ |
| S3 | ❌ | ✅ |
| SNS/SQS | ❌ | ✅ |

**DynamoDB 로컬 테스트 옵션:**

1. **AWS DynamoDB Local** 설치 (Docker)

```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

2. **serverless-dynamodb-local 플러그인**

```bash
npm install --save-dev serverless-dynamodb-local
```

3. **AWS에 배포 후 테스트** (추천)

```bash
npm run deploy
# 실제 AWS DynamoDB 사용
```

---

### **Q7: 검증 에러는 어떻게 발생하나요?**

**예시: message 필드 없음**

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"author":"Jason"}' \
  https://xmm3816xz0.execute-api.us-east-1.amazonaws.com/dev/message
```

**응답:**

```json
{
  "statusCode": 422,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": {
        "message": "This field is required"
      }
    }
  }
}
```

**검증 규칙:**

```javascript
// utils/validation.js에서 정의
const schema = {
  message: {
    validator: (val) => validateString(val, {
      required: true,       // 필수
      minLength: 1,         // 최소 1자
      maxLength: 500        // 최대 500자
    })
  }
};
```

---

### **Q8: 에러 응답 형식이 일관되지 않나요?**

**통일된 에러 클래스:**

```javascript
// utils/errors.js
class BadRequestError extends APIError { ... }
class NotFoundError extends APIError { ... }
class ValidationError extends APIError { ... }
```

**모든 에러는 이 형식:**

```json
{
  "statusCode": 400,
  "error": {
    "code": "BAD_REQUEST",
    "message": "...",
    "timestamp": "2025-12-27T00:00:00.000Z",
    "details": { ... }
  }
}
```

**장점:**

- 클라이언트가 쉽게 파싱 가능
- 에러 코드(`code`)로 조건 처리 가능
- timestamp로 디버깅 용이

---

## 📚 추가 학습 자료

### 공식 문서

- [Serverless Framework 한글 가이드](https://www.serverless.com/framework/docs)
- [AWS Lambda 개발자 가이드](https://docs.aws.amazon.com/lambda/)
- [API Gateway 작동 원리](https://docs.aws.amazon.com/apigateway/latest/developerguide/)
- [DynamoDB 기초](https://docs.aws.amazon.com/dynamodb/)

### 체크리스트

#### Day 1 완료했으면:

- [x] 01-hello-world 배포 완료
- [x] 8개 엔드포인트 모두 테스트 완료
- [x] DynamoDB CRUD 작동 확인
- [x] 에러 처리 동작 확인
- [x] 요청 검증 동작 확인

#### Day 2 준비 (다음):

- [ ] 02-api-gateway-s3 프로젝트
- [ ] S3 업로드/다운로드 통합
- [ ] 이벤트 기반 Lambda

---

**완벽하게 끝났습니다! 🎉 AWS Lambda 기초를 마스터했습니다!**
````

`````
````
`````
