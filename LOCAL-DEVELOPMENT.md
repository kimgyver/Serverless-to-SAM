# 🚀 로컬 Lambda 개발 환경 구축

## 📚 목차

1. [환경 요구사항](#환경-요구사항)
2. [필수 설치](#필수-설치)
3. [Serverless Framework 로컬 개발](#serverless-framework-로컬-개발)
4. [SAM 로컬 개발](#sam-로컬-개발)
5. [로컬 DynamoDB](#로컬-dynamodb)
6. [LocalStack (전체 AWS 에뮬레이션)](#localstack-전체-aws-에뮬레이션)
7. [디버깅 팁](#디버깅-팁)

---

## 환경 요구사항

### 현재 환경 확인

```bash
# Node.js 버전 확인
node --version
# 권장: v14 이상 (v18.x 권장)

# npm 버전 확인
npm --version
# 권장: v6 이상

# Python 확인 (SAM 필요)
python3 --version
# 권장: 3.7 이상

# Docker 확인 (SAM local 필요)
docker --version
# 권장: Docker Desktop 설치
```

---

## 필수 설치

### 1️⃣ Node.js (v18.x 권장)

**macOS:**

```bash
# Homebrew로 설치
brew install node@18

# 버전 확인
node --version  # v18.x.x
npm --version   # 8.x 이상
```

**Windows/Linux:**

- [nodejs.org](https://nodejs.org) 에서 다운로드

---

### 2️⃣ AWS CLI v2

**macOS:**

```bash
# Homebrew로 설치
brew install awscli

# 또는 직접 설치
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# 버전 확인
aws --version  # aws-cli/2.x.x
```

**Windows:**

```bash
# PowerShell에서
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

**Linux:**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

---

### 3️⃣ AWS 자격증명 설정

```bash
aws configure
# AWS Access Key ID: (당신의 Access Key)
# AWS Secret Access Key: (당신의 Secret Key)
# Default region name: ap-northeast-1 (또는 원하는 region)
# Default output format: json

# 확인
aws sts get-caller-identity
# 응답: 계정 정보 출력됨
```

**자격증명 저장 위치:**

```bash
~/.aws/credentials   # 접근 키
~/.aws/config        # 리전 설정
```

---

### 4️⃣ Docker Desktop (SAM 로컬 테스트용)

**macOS:**

```bash
# Homebrew로 설치
brew install --cask docker

# 또는 수동 설치
# https://www.docker.com/products/docker-desktop
```

**Windows/Linux:**

- [Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop)

**설치 확인:**

```bash
docker --version
docker run hello-world  # Docker 작동 확인
```

---

### 5️⃣ SAM CLI (AWS Serverless Application Model)

```bash
# macOS
brew install aws-sam-cli

# Windows (또는 pip로)
pip install aws-sam-cli

# Linux
pip3 install aws-sam-cli

# 버전 확인
sam --version  # SAM CLI, version 1.x.x
```

---

### 6️⃣ Serverless Framework

```bash
# 전역 설치
npm install -g serverless

# 또는 프로젝트 로컬 설치
npm install --save-dev serverless

# 버전 확인
serverless --version  # 3.x 이상 권장
```

---

## 필수 설치 완료 체크리스트

```bash
# 모두 한번에 확인
node --version && \
npm --version && \
aws --version && \
python3 --version && \
docker --version && \
sam --version && \
serverless --version
```

**예상 출력:**

```
v18.12.0
8.19.2
aws-cli/2.11.0
Python 3.10.0
Docker version 20.10.17
SAM CLI, version 1.75.0
Framework Core: 3.35.0
```

---

## Serverless Framework 로컬 개발

### 프로젝트 구조

```
my-serverless-app/
├── serverless.yml
├── handlers/
│   ├── hello.js
│   └── greet.js
├── package.json
└── node_modules/
```

### 1️⃣ 플러그인 설치

```bash
cd my-serverless-app

# serverless-offline: Lambda 로컬 실행
npm install --save-dev serverless-offline

# serverless-dynamodb-local: DynamoDB 로컬 에뮬레이션
npm install --save-dev serverless-dynamodb-local

# (선택) serverless-plugin-tracing: X-Ray 추적
npm install --save-dev serverless-plugin-tracing
```

### 2️⃣ serverless.yml 설정

```yaml
service: my-serverless-app

plugins:
  - serverless-offline
  - serverless-dynamodb-local

provider:
  name: aws
  runtime: nodejs18.x
  region: ap-northeast-1
  stage: ${opt:stage, 'dev'}

functions:
  hello:
    handler: handlers/hello.handler
    events:
      - http:
          path: hello
          method: get

  greet:
    handler: handlers/greet.handler
    events:
      - http:
          path: greet/{name}
          method: post

custom:
  dynamodb:
    stages:
      - dev
    start:
      port: 8000
      inMemory: true
      migrate: true
      seed: true
    seed:
      dev:
        sources:
          - table: Users
            sources: [./seed/users.json]
```

### 3️⃣ 로컬 실행

**Lambda만 (API Gateway 에뮬레이션):**

```bash
serverless offline start

# 또는
npm run dev  # 설정되어 있으면

# 응답:
# Server ready: http://localhost:3000 ✓
```

**DynamoDB와 함께:**

```bash
# 먼저 DynamoDB 시작
serverless dynamodb start

# 다른 터미널에서 Lambda 시작
serverless offline start

# 또는 한번에
serverless offline start --skipInstall
```

### 4️⃣ API 테스트

```bash
# GET /hello
curl http://localhost:3000/hello

# POST /greet/{name}
curl -X POST http://localhost:3000/greet/John \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

### 5️⃣ 로그 확인

```bash
# serverless offline 터미널에서 실시간 로그 출력
# 또는
serverless logs -f hello -s dev
```

### 주의사항

```
❌ Docker 없이 Node.js 직접 실행
   → 개발 환경과 Lambda 런타임이 다를 수 있음

✅ 빠른 개발 테스트 시 사용
   → 프로토타이핑에 좋음

❌ 실제 배포 전 검증에는 부정확
   → SAM local 권장
```

---

## SAM 로컬 개발

### 프로젝트 구조

```
my-sam-app/
├── template.yaml
├── src/
│   ├── hello/
│   │   └── app.js
│   └── greet/
│       └── app.js
├── events/
│   └── event.json
└── package.json
```

### 1️⃣ 프로젝트 생성

```bash
# SAM 프로젝트 생성
sam init --runtime nodejs18.x --name my-sam-app

cd my-sam-app
```

### 2️⃣ 빌드

```bash
# CloudFormation 템플릿 빌드
sam build

# 응답:
# Build Succeeded
# Built Artifacts : .aws-sam/build
# Built Template : .aws-sam/build/template.yaml
```

### 3️⃣ 로컬 API 실행 (Docker 필요)

```bash
# API Gateway + Lambda 로컬 실행 (Docker 사용)
sam local start-api

# 응답:
# Initializing the application
# Resource HelloWorldFunction has no authentication. Defaults to provided
# Press CTRL+C to quit
#
# Running on http://127.0.0.1:3000

# Docker가 자동으로 Lambda 런타임 에뮬레이션
```

### 4️⃣ API 테스트

```bash
# GET /hello
curl http://127.0.0.1:3000/hello

# 응답:
# {"message":"hello world"}
```

### 5️⃣ 단일 함수 테스트

```bash
# 이벤트 파일로 함수 직접 호출
sam local invoke HelloWorldFunction -e events/event.json

# 또는 쉘에서 직접
echo '{"queryStringParameters": {"name": "John"}}' | \
  sam local invoke HelloWorldFunction
```

### 6️⃣ 디버깅 모드

```bash
# Python debugger (pdb) 사용
sam local start-api --debug

# 또는 VSCode 디버거 사용
sam local invoke HelloWorldFunction -d 5858
# VSCode: Debug > Attach to Process 에서 포트 5858 선택
```

### 주의사항

```
✅ Docker에서 Lambda 런타임 정확히 에뮬레이션
   → 배포 환경과 동일

✅ 실제 배포 전 검증에 좋음
   → 높은 정확도

❌ Docker 필요 (무겁고 느림)

✅ 프로덕션 배포 전 테스트 권장
```

---

## 로컬 DynamoDB

### 방법 1️⃣: Serverless Framework 플러그인

```bash
npm install --save-dev serverless-dynamodb-local
```

**serverless.yml:**

```yaml
custom:
  dynamodb:
    stages:
      - dev
    start:
      port: 8000
      inMemory: true
      migrate: true
```

**실행:**

```bash
# 터미널 1: DynamoDB 시작
serverless dynamodb start

# 터미널 2: 로컬 Lambda 시작
serverless offline start
```

**테이블 생성:**

```bash
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

# 테이블 확인
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

### 방법 2️⃣: Docker로 직접 실행

```bash
# DynamoDB Local Docker 이미지 실행
docker run -p 8000:8000 amazon/dynamodb-local

# 테이블 생성
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

### Node.js에서 로컬 DynamoDB 접근

```javascript
// handlers/dynamodb.js
const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
  region: process.env.AWS_REGION || "ap-northeast-1"
});

exports.handler = async event => {
  try {
    const result = await dynamodb
      .scan({
        TableName: "Users"
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

**serverless.yml:**

```yaml
functions:
  queryUsers:
    handler: handlers/dynamodb.handler
    environment:
      DYNAMODB_ENDPOINT: http://localhost:8000
```

---

## LocalStack (전체 AWS 에뮬레이션)

### LocalStack란?

```
AWS 전체 서비스를 로컬에서 에뮬레이션
- S3, Lambda, DynamoDB, RDS, SQS, SNS, etc.
- Docker 기반
- 통합 테스트 가능
```

### 설치

```bash
# Docker 필요
docker pull localstack/localstack

# 또는 docker-compose 사용
mkdir localstack-project
cd localstack-project
```

**docker-compose.yml:**

```yaml
version: "3.8"

services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566" # LocalStack API Gateway
      - "4571:4571" # ElastiCache
    environment:
      - SERVICES=lambda,s3,dynamodb,sqs,rds,apigateway
      - DEBUG=1
      - DOCKER_HOST=unix:///var/run/docker.sock
    volumes:
      - "${TMPDIR}:/tmp/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
```

### 실행

```bash
docker-compose up

# 또는
localstack start -d  # 백그라운드 실행
```

### AWS CLI로 접근

```bash
# 환경변수 설정
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# S3 테스트
aws s3 mb s3://my-bucket --endpoint-url=http://localhost:4566
aws s3 ls --endpoint-url=http://localhost:4566

# DynamoDB 테스트
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url=http://localhost:4566
```

### Node.js에서 접근

```javascript
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  endpoint: "http://localhost:4566",
  accessKeyId: "test",
  secretAccessKey: "test",
  region: "us-east-1"
});

s3.listBuckets({}, (err, data) => {
  if (err) console.log(err);
  else console.log(data.Buckets);
});
```

### 종료

```bash
docker-compose down

# 또는
localstack stop
```

---

## 디버깅 팁

### 1️⃣ 환경변수 확인

```javascript
// handler.js에서 환경변수 출력
exports.handler = async event => {
  console.log("Environment:", process.env);
  console.log("Event:", JSON.stringify(event, null, 2));

  return { statusCode: 200 };
};
```

```bash
serverless offline start
# 로그에 환경변수 출력됨
```

### 2️⃣ 이벤트 파일로 테스트

**events/test-event.json:**

```json
{
  "queryStringParameters": {
    "name": "John"
  },
  "body": "{\"message\":\"hello\"}"
}
```

```bash
sam local invoke MyFunction -e events/test-event.json
```

### 3️⃣ 로그 필터링

```bash
# 특정 함수의 로그만
serverless logs -f myFunction -s dev --tail

# 최근 100줄
serverless logs -f myFunction --num 100
```

### 4️⃣ VSCode 디버거 연결

**.vscode/launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Lambda",
      "port": 5858,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

**실행:**

```bash
# 디버그 모드로 시작
sam local start-api --debug-port 5858

# VSCode에서 F5로 디버거 연결
```

### 5️⃣ 타임아웃 설정

```yaml
# serverless.yml
functions:
  myFunc:
    handler: handler.main
    timeout: 60 # 60초 (기본: 30초)
```

```bash
sam local invoke MyFunction --timeout 60
```

---

## 자주 하는 실수

### ❌ 틀린 설정

```bash
# Docker 없이 SAM local 실행 시도
sam local start-api
# 에러: Docker 필요

# AWS 자격증명 없이 배포 시도
serverless deploy
# 에러: AWS 자격증명 필요

# 로컬 DynamoDB 엔드포인트 미설정
# DynamoDB.local 연결 실패
```

### ✅ 올바른 설정

```bash
# Docker 설치 확인
docker --version

# AWS 자격증명 설정
aws configure

# 환경변수에 엔드포인트 설정
DYNAMODB_ENDPOINT=http://localhost:8000
```

---

## 환경별 개발 워크플로우

### Phase 1️⃣: 빠른 프로토타입 (serverless-offline)

```bash
npm install --save-dev serverless-offline
serverless offline start

# 빠른 테스트, 반복 개발
```

### Phase 2️⃣: 통합 테스트 (SAM local)

```bash
sam build
sam local start-api

# Docker에서 정확한 Lambda 런타임 테스트
```

### Phase 3️⃣: 전체 AWS 시뮬레이션 (LocalStack)

```bash
docker-compose up
# S3, Lambda, DynamoDB 함께 테스트
```

### Phase 4️⃣: 실제 AWS 배포

```bash
serverless deploy
# 또는
sam deploy --guided
```

---

## 체크리스트

### 설치 확인

- [ ] Node.js v18.x 설치됨
- [ ] npm 설치됨
- [ ] AWS CLI v2 설치됨
- [ ] AWS 자격증명 설정됨 (`aws configure`)
- [ ] Docker Desktop 설치됨
- [ ] SAM CLI 설치됨
- [ ] Serverless Framework 설치됨

### 프로젝트 준비

- [ ] serverless.yml 또는 template.yaml 작성
- [ ] handler 함수 작성
- [ ] package.json 생성
- [ ] 플러그인 설치 (serverless-offline 등)

### 로컬 테스트

- [ ] Serverless offline 실행 테스트
- [ ] SAM local 실행 테스트
- [ ] API 호출 테스트 (curl)
- [ ] 로그 확인

### 배포 전

- [ ] 환경변수 확인
- [ ] IAM 권한 확인
- [ ] 모든 함수 로컬 테스트 완료
- [ ] 오류 로그 확인

---

## 요약 테이블

| 도구               | Docker | 속도 | 정확도 | 용도         |
| ------------------ | ------ | ---- | ------ | ------------ |
| serverless-offline | ❌     | 빠름 | 낮음   | 빠른 개발    |
| SAM local          | ✅     | 느림 | 높음   | 배포 전 검증 |
| LocalStack         | ✅     | 느림 | 높음   | 통합 테스트  |
| AWS (실제)         | -      | -    | 최고   | 최종 배포    |

---

## 📌 중요: Plugin과 Production 환경 명확히

### ⚠️ 혼동할 수 있는 부분

당신이 말한 대로:

```
serverless deploy
  ↓
plugins 로드 (로컬 컴퓨터)
  ↓
각 플러그인의 hooks 실행
  ↓
Lambda .zip 생성 & AWS에 배포
```

**하지만 이건 맞습니다!** ✅

**틀린 이해:**

```
플러그인이 Production에서도 로드된다 ❌
```

**맞는 이해:**

```
배포 "과정"에서만 플러그인이 로드됨 ✅
Production에서는 플러그인 로드 안 됨 ✅
```

### 시간대별 설명

```
[로컬 컴퓨터]
  ↓ (배포 시)
serverless deploy (Serverless Framework 실행)
  ↓
plugins 로드 (serverless-offline, serverless-dynamodb-local 등)
  ↓
플러그인의 hooks 실행
  - pre-deploy hooks
  - CloudFormation 템플릿 수정
  - dependencies 정리 등
  ↓
Lambda .zip 파일 생성
  - handler.js ✅
  - node_modules (dependencies만) ✅
  - serverless-offline ❌ (제외됨)
  - plugins ❌ (제외됨)
  ↓
AWS S3에 업로드
  ↓
Lambda에 배포
  ↓
[AWS Lambda - Production]
플러그인 없이 순수 handler만 실행
  - process.env 사용
  - aws-sdk 사용
  - 플러그인 로드 안 됨 ❌
```

### 구체적 예

**배포 과정 (로컬):**

```bash
serverless deploy

# 1. Serverless Framework 실행 (로컬)
#    ↓ node_modules/serverless/ 실행

# 2. plugins 로드 (로컬)
#    ↓ node_modules/serverless-offline/ 로드
#    ↓ node_modules/serverless-dynamodb-local/ 로드
#    ↓ hooks 실행 (pre-deploy, post-deploy 등)

# 3. Lambda .zip 생성
#    devDependencies 제외
#    ↓ serverless-offline 제외됨 ✅

# 4. AWS에 배포
```

**Production 실행 (AWS Lambda):**

```javascript
// handler.js (AWS Lambda에서 실행)
const AWS = require("aws-sdk"); // ✅ 있음

// serverless-offline을 사용하려고 해도
const offline = require("serverless-offline"); // ❌ 없음!
// ReferenceError: serverless-offline not found
```

### 핵심

```
plugins 로드
  = "배포" 때 로컬에서만 로드
  ≠ "실행" 때 Production에서 로드

serverless deploy 명령어
  = Serverless Framework이 로컬에서 실행됨
  = plugins이 로컬에서 로드됨
  = Lambda .zip 생성
  ≠ Production에서 실행되는 게 아님
```

### 비유

```
요리사가 요리를 준비할 때:
  1. 요리사 (Serverless Framework) 로컬에서 도구 사용
  2. 필요한 도구들 (plugins) 가져옴
  3. 요리 (Lambda 함수) 준비
  4. 손님에게 제공

손님이 음식을 먹을 때:
  - 요리 도구는 필요 없음 ❌
  - 완성된 음식만 필요 ✅
```

---

**다음: 실제 프로젝트에서 로컬 개발 시작하기!** 🚀
