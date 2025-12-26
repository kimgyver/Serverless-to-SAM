# 로컬 개발 가이드

## 📋 설치 (✅ 성공함)

```bash
# 프로젝트 디렉토리
cd my-first-lambda

# npm 의존성 설치
npm install

# serverless-offline 플러그인 설치 (legacy-peer-deps 필수!)
npm install --save-dev serverless-offline@latest --legacy-peer-deps
```

### 📦 설치되는 패키지 버전

| 패키지             | 버전    |
| ------------------ | ------- |
| serverless         | ^3.40.0 |
| serverless-offline | ^14.4.0 |

> **⚠️ 중요:** `--legacy-peer-deps` 없으면 버전 충돌 발생
>
> `serverless-offline@14.x` 는 `serverless@3.x` 과 호환이 안 되어 `--legacy-peer-deps` 필요

---

## 🚀 작동하는 명령어 (✅ 모두 테스트됨)

### 1️⃣ 로컬 개발 서버 시작

```bash
npm run offline:start
```

**결과:**

```
Server ready: http://localhost:3000 🚀
GET  | http://localhost:3000/dev/hello
```

### 2️⃣ API 테스트 (별도 터미널)

```bash
curl http://localhost:3000/dev/hello
```

**응답:**

```json
{
  "message": "Hello from Lambda! 🚀",
  "timestamp": "2025-12-26T02:57:32.371Z",
  "input": {}
}
```

### 3️⃣ Node.js 직접 테스트

```bash
node test.js
```

**결과:**

```
🧪 로컬 테스트 시작...
Event received: {...}
✅ 응답: {...}
```

### 4️⃣ AWS에 배포

```bash
npm run deploy
```

**결과:**

```
✔ Service deployed to stack my-first-lambda-dev
endpoint: GET - https://0jgs31fu27.execute-api.us-east-1.amazonaws.com/dev/hello
functions: hello: my-first-lambda-dev-hello (18 kB)
```

### 5️⃣ 배포된 AWS API 호출

```bash
curl https://0jgs31fu27.execute-api.us-east-1.amazonaws.com/dev/hello
```

**응답:** (위와 동일)

### 6️⃣ AWS에서 제거

```bash
npm run remove
```

---

## 📁 프로젝트 구조

```
my-first-lambda/
├── serverless.yml        # Serverless 설정
├── handler.js            # Lambda 함수
├── test.js              # Node.js 테스트
├── package.json         # 의존성
└── DEVELOPMENT.md       # 이 문서
```

---

## 🔧 npm 스크립트

```json
{
  "scripts": {
    "offline:start": "serverless offline start",
    "deploy": "serverless deploy --stage dev",
    "remove": "serverless remove --stage dev"
  }
}
```

---

## ⚡ 빠른 참조

| 작업               | 명령어                                 |
| ------------------ | -------------------------------------- |
| offline 시작       | `npm run offline:start`                |
| 로컬 테스트 (curl) | `curl http://localhost:3000/dev/hello` |
| 로컬 테스트 (Node) | `node test.js`                         |
| AWS 배포           | `npm run deploy`                       |
| AWS 제거           | `npm run remove`                       |

---

## ❌ 실패하는 것들 (사용하지 말 것)

### 문제 1: legacy-peer-deps 없이 설치

```bash
npm install --save-dev serverless-offline
# ❌ 에러: ERESOLVE unable to resolve dependency tree
#    - serverless-offline@14.4.0 requires serverless@^4.0.0
#    - 현재 설치된 serverless@3.40.0과 충돌
```

**해결:** `--legacy-peer-deps` 플래그 추가

```bash
npm install --save-dev serverless-offline@latest --legacy-peer-deps
```

### 문제 2: Serverless Framework 버전 업그레이드

```bash
npm install serverless@3
# ❌ npm이 자동으로 serverless@4로 업그레이드함
#    (package.json의 caret ^는 major 버전 업그레이드 허용)
```

### 문제 3: 직접 serverless 명령어 사용

```bash
serverless offline start     # ❌ 명령어 인식 안 됨 (로컬 v3에서 안 됨)
serverless offline           # ❌ 명령어 인식 안 됨
```

**해결:** npm 스크립트 사용

```bash
npm run offline:start  # ✅ 작동함
```

---

## 📝 개발 워크플로우

```
1️⃣  npm run offline:start
     ↓ (터미널 1)
     로컬 서버 실행 http://localhost:3000

2️⃣  curl http://localhost:3000/dev/hello
     ↓ (터미널 2)
     API 테스트

3️⃣  handler.js 수정 후 저장
     ↓
     자동 리로드

4️⃣  curl 다시 실행
     ↓
     변경사항 확인

5️⃣  npm run deploy
     ↓
     AWS에 배포 (약 106초)

6️⃣  curl https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/hello
     ↓
     배포본 테스트

7️⃣  npm run remove
     ↓
     AWS 리소스 삭제 (필요시)
```

---

## 🎯 체크리스트

- ✅ `npm install` 완료
- ✅ `npm install --save-dev serverless-offline@latest --legacy-peer-deps` 완료
- ✅ `npm run offline:start` → 포트 3000에서 실행됨
- ✅ `curl http://localhost:3000/dev/hello` → 응답 수신
- ✅ `npm run deploy` → AWS에 배포됨
- ✅ `curl https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/hello` → 작동함
