# Serverless-Offline 아키텍처 및 원리

## 📋 개요

이 프로젝트는 **Serverless Framework + serverless-offline**을 사용하여 로컬에서 AWS Lambda를 시뮬레이션합니다.

---

## 🔄 작동 원리

### **1. 경로 구성 (Stage + Path)**

```yaml
# serverless.yml
provider:
  stage: ${opt:stage, 'dev'}  # 기본값: dev

functions:
  hello:
    events:
      - http:
          path: hello         # URL 경로
```

**결과:**

| 환경 | 경로 |
|------|---------|
| 로컬 offline | `http://localhost:3000/dev/hello` |
| AWS dev | `https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/hello` |
| AWS prod | `https://xxxxx.execute-api.us-east-1.amazonaws.com/prod/hello` |

→ **Stage + Path = 전체 URL 경로 구성!**

---

### **2. HTTP 요청 처리 흐름 (Offline)**

```
┌─────────────────────────────────────────────────────┐
│  로컬 테스트 플로우                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1️⃣  npm run offline:start                         │
│     └─ serverless-offline이 Express 서버 시작     │
│        포트: 3000                                   │
│                                                     │
│  2️⃣  curl http://localhost:3000/dev/hello         │
│     └─ HTTP GET 요청 발송                          │
│                                                     │
│  3️⃣  Express가 요청 수신                           │
│     └─ 경로 매칭: /dev/hello                       │
│        함수: hello (handler.js)                     │
│                                                     │
│  4️⃣  Lambda 이벤트 형식으로 변환                   │
│     └─ {                                            │
│          httpMethod: "GET",                        │
│          path: "/dev/hello",                       │
│          queryStringParameters: null,              │
│          headers: {...},                           │
│          ...                                        │
│        }                                            │
│                                                     │
│  5️⃣  handler.hello(event, context) 실행           │
│     └─ Node.js에서 직접 함수 실행                  │
│        console.log() 가능                          │
│                                                     │
│  6️⃣  응답 반환 (JSON)                              │
│     └─ {                                            │
│          statusCode: 200,                          │
│          body: JSON.stringify({...})               │
│        }                                            │
│                                                     │
│  7️⃣  HTTP 응답으로 변환해서 반환                   │
│     └─ curl이 응답 수신                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Offline에서 잘 작동하는 것들

### **HTTP/API Gateway 이벤트**

```yaml
functions:
  hello:
    events:
      - http:
          path: hello
          method: get
```

**작동 원리:**
- Express.js가 HTTP 요청 수신
- Lambda 이벤트 형식으로 변환
- 함수 실행
- 응답 반환

✅ **완전 시뮬레이션 가능**

### **환경변수 / 기본 로직**

```javascript
// handler.js
module.exports.hello = async (event) => {
  console.log("Event:", event);  // ✅ 볼 수 있음
  
  const result = "some logic";   // ✅ 실행됨
  
  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
```

✅ **완벽하게 작동**

---

## ❌ Offline에서 작동 안 하는 것들

### **AWS 서비스 연동**

```javascript
// handler.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.processFile = async (event) => {
  // S3에서 파일 읽기
  const data = await s3.getObject({
    Bucket: 'my-bucket',
    Key: 'file.txt'
  }).promise();
  
  return data;  // ❌ Offline에서는 작동 안 함!
};
```

**문제:**
- S3는 실제 AWS 서비스
- Offline은 HTTP 서버일 뿐
- S3 API 호출 불가

❌ **AWS 클라우드에 배포해야만 작동**

### **S3 이벤트 트리거**

```yaml
functions:
  processS3:
    events:
      - s3:
          bucket: my-bucket
          event: s3:ObjectCreated:*
```

**문제:**
- S3가 파일 업로드하면 Lambda 자동 호출
- Offline은 이 트리거 이벤트 시뮬레이션 불가
- S3 이벤트 발생 안 함

❌ **AWS 클라우드에 배포해야만 작동**

### **DynamoDB / SNS / SQS 등 모든 AWS 서비스**

```yaml
# DynamoDB 스트림 이벤트
events:
  - stream:
      type: dynamodb
      arn: arn:aws:dynamodb:...

# SNS 이벤트
events:
  - sns: my-topic

# SQS 이벤트
events:
  - sqs:
      arn: arn:aws:sqs:...
```

❌ **모두 offline에서 작동 안 함**

---

## 📊 이벤트 타입별 Offline 지원 현황

| 이벤트 타입 | Offline | 로컬 테스트 방법 |
|-----------|---------|------------------|
| **http/httpApi** | ✅ | `npm run offline:start` |
| **schedule** | ⚠️ 제한적 | AWS 클라우드만 |
| **s3** | ❌ | AWS 클라우드만 |
| **dynamodb** | ❌ | AWS 클라우드만 |
| **sns** | ❌ | AWS 클라우드만 |
| **sqs** | ❌ | AWS 클라우드만 |
| **kinesis** | ❌ | AWS 클라우드만 |
| **rds** | ❌ | AWS 클라우드만 |
| **cognito** | ❌ | AWS 클라우드만 |

---

## 🛠️ 테스트 전략

### **시나리오 1: HTTP API만 사용**

```javascript
// handler.js
module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "OK" })
  };
};
```

✅ **테스트 방법:**
```bash
npm run offline:start
curl http://localhost:3000/dev/hello
```

- 💰 비용: 0원
- ⏱️ 속도: 즉시

---

### **시나리오 2: S3 / DynamoDB 등 AWS 서비스 사용**

```javascript
// handler.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports.processFile = async (event) => {
  const data = await s3.getObject({...}).promise();
  return data;
};
```

❌ **Offline 불가능**

**✅ 테스트 방법 1: AWS 클라우드 배포**
```bash
npm run deploy
```
- 💰 비용: 소액 (Lambda 호출 비용)
- ⏱️ 속도: 1-2분 배포 필요
- ✅ 정확도: 최고

**✅ 테스트 방법 2: LocalStack + Docker (고급)**
```bash
docker-compose up localstack
```
- 💰 비용: 0원
- ⏱️ 속도: 보통 (Docker 오버헤드)
- ✅ 정확도: 높음

---

## 💡 요약

### **Serverless-Offline의 정체**

```
Serverless-Offline은 Express.js 기반 HTTP 서버
  ├─ HTTP 이벤트는 완벽하게 시뮬레이션
  ├─ AWS 서비스는 시뮬레이션 불가
  └─ Docker 불필요 (로컬 Node.js로 충분)
```

### **언제 뭘 쓸까?**

```
📝 HTTP API만 개발
  └─ serverless-offline (지금) ✅

🔗 AWS 서비스 연동 필요
  ├─ LocalStack + Docker (로컬)
  └─ AWS 클라우드 직접 배포 (추천)
```

### **현재 프로젝트 상태**

✅ HTTP API 전용 → **Offline으로 충분**
✅ Docker 불필요
✅ 개발 → 테스트 → 배포 완벽 가능
