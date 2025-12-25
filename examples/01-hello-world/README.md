# 🎯 Example 01: Hello World Lambda (Day 1 실습)

## 📌 이 예제의 목표

- Serverless Framework의 **기본 구조** 이해
- 4가지 다른 HTTP 핸들러 작성 경험
- 배포 → AWS 콘솔 확인 → 로컬 테스트

---

## 📁 구조

```
01-hello-world/
├── serverless.yml        ← Serverless Framework 설정
├── package.json          ← 의존성
├── handlers/
│   └── hello.js          ← 4개 Lambda 함수
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
# 1. sayHello - 파라미터 없음
curl http://localhost:3000/dev/hello

# 2. greet - 경로 파라미터
curl http://localhost:3000/dev/hello/Jason

# 3. createMessage - POST 본문
curl -X POST http://localhost:3000/dev/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello Serverless","author":"Jason"}'

# 4. divide - 에러 처리
curl "http://localhost:3000/dev/divide/10/2"
curl "http://localhost:3000/dev/divide/10/0"  # Error: divide by zero
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

### 4️⃣ 배포 제거
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
```yaml
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}  # 배포 시: --stage prod로 지정
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
    message: 'Hello from Serverless!',
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
    message: `Hello, ${name}!`,
  });
};
```

### 3️⃣ POST 본문 처리
```javascript
exports.createMessageHandler = async (event, context) => {
  let body;
  
  // 🔴 주의: API Gateway에서 body는 String으로 옴
  if (typeof event.body === 'string') {
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

### 4️⃣ 에러 처리
```javascript
exports.divideHandler = async (event, context) => {
  try {
    const numB = parseInt(b, 10);
    
    // 입력 검증
    if (isNaN(numB)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Not a number',
      });
    }
    
    // 비즈니스 로직 검증
    if (numB === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Cannot divide by zero',
      });
    }
    
    return createResponse(200, { result });
  } catch (error) {
    // 예상하지 못한 에러
    return createResponse(500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};
```

### 응답 형식 (API Gateway 필수)
```javascript
{
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',  // CORS
  },
  body: JSON.stringify({ ... }),  // String이어야 함!
}
```

---

## 📊 배포 후 생성되는 AWS 리소스

### CloudFormation 스택
```
hello-world-lambda-dev
├── Lambda Functions
│   ├── hello-world-lambda-dev-sayHello
│   ├── hello-world-lambda-dev-greet
│   ├── hello-world-lambda-dev-createMessage
│   └── hello-world-lambda-dev-divide
├── API Gateway
│   ├── hello-world-lambda-dev (API)
│   ├── /hello (리소스)
│   ├── /hello/{name} (리소스)
│   ├── /message (리소스)
│   └── /divide/{a}/{b} (리소스)
├── IAM
│   └── HelloWorldRole-dev (실행 역할)
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

**이제 Day 2로 진행하세요!** 🚀
