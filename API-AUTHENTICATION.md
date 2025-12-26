# API Gateway 인증(Authentication) 완벽 가이드

## 📌 기본 개념

**API 보호 방식:**

```
┌─────────────────────────────────────────┐
│ 요청 들어옴                              │
└────────────┬────────────────────────────┘
             │
      인증 확인 (이 문서가 다룰 부분)
             │
    ┌────────▼─────────┐
    │ 누구인가?         │
    │ 권한이 있나?      │
    └────────┬─────────┘
             │
    ┌────────▼──────────────┐
    │ ✅ 통과 → Lambda 실행  │
    │ ❌ 거부 → 401/403     │
    └───────────────────────┘
```

---

## 🔐 인증 방식 4가지

### 1️⃣ No Auth (인증 없음)

**사용 사례:**

- 공개 API (뉴스, 날씨 등)
- 테스트 엔드포인트

**설정:**

```yaml
functions:
  getPublicNews:
    handler: handlers/news.get
    events:
      - http:
          path: news
          method: GET
          cors: true
          # authorizer 없음 = 인증 없음
```

**결과:**

```
curl https://api.example.com/news
→ ✅ 인증 없이 즉시 실행
```

---

### 2️⃣ Lambda Authorizer (커스텀 인증)

**사용 사례:**

- 커스텀 JWT 검증
- 데이터베이스 권한 확인
- 복잡한 비즈니스 로직

**구조:**

```
요청 (Authorization 헤더)
    ↓
Lambda Authorizer 함수 실행
    ↓
토큰 검증 및 권한 확인
    ↓
✅ 통과 → Lambda 실행
❌ 거부 → 401 Unauthorized
```

**설정:**

```yaml
functions:
  # 인증 담당 Lambda (Authorizer)
  authorizeLambda:
    handler: handlers/auth.authorizer
    # 이 함수는 이벤트 트리거 없음 (내부 사용)

  # 보호된 API
  getProfile:
    handler: handlers/user.getProfile
    events:
      - http:
          path: profile
          method: GET
          authorizer:
            name: authorizeLambda # 위의 함수 이름
            identitySource: method.request.header.Authorization
            resultTtlInSeconds: 300 # 캐시 5분
          cors: true
```

**Authorizer 함수 예시:**

```javascript
// handlers/auth.js
exports.authorizer = async event => {
  const token = event.authorizationToken;

  try {
    // 토큰 검증
    const decoded = verifyJWT(token);

    return {
      principalId: decoded.userId,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow", // ✅ 권한 있음
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: decoded.userId,
        email: decoded.email
      }
    };
  } catch (error) {
    throw new Error("Unauthorized"); // ❌ 권한 없음
  }
};
```

**사용 흐름:**

```bash
# 토큰과 함께 요청
curl -H "Authorization: Bearer eyJhbGc..." \
  https://api.example.com/profile

# Lambda Authorizer 실행 → 토큰 검증 → 통과 → getProfile 함수 실행
```

**장점:**

- 완전히 커스텀 가능
- 어떤 인증 방식이든 구현 가능
- 결과 캐싱으로 성능 향상

**단점:**

- 직접 구현해야 함
- 추가 Lambda 호출 비용

---

### 3️⃣ Cognito User Pools (AWS 공식)

**사용 사례:**

- 사용자 회원가입/로그인
- JWT 기반 인증
- AWS 통합 필요할 때

**구조:**

```
사용자
  ↓
1. Cognito에 로그인
  ↓
2. JWT 토큰 받음
  ↓
3. API 요청 시 토큰 전달
  ↓
API Gateway → Cognito 검증
  ↓
✅ 통과 → Lambda 실행
❌ 거부 → 401 Unauthorized
```

**설정:**

```yaml
provider:
  # Cognito User Pool 생성 (resources에서)

functions:
  signup:
    handler: handlers/auth.signup
    events:
      - http:
          path: signup
          method: POST
          cors: true

  login:
    handler: handlers/auth.login
    events:
      - http:
          path: login
          method: POST
          cors: true

  # 보호된 API (Cognito 인증)
  getProfile:
    handler: handlers/user.getProfile
    events:
      - http:
          path: profile
          method: GET
          authorizer:
            type: COGNITO_USER_POOLS
            identitySource: method.request.header.Authorization
            userPoolArn: arn:aws:cognito-idp:REGION:ACCOUNT:userpool/REGION_POOLID
          cors: true

resources:
  Resources:
    CognitoUserPool:
      Type: AWS::Cognito::UserPool
      Properties:
        UserPoolName: MyUserPool-${self:provider.stage}
        Policies:
          PasswordPolicy:
            MinimumLength: 8
            RequireUppercase: true
            RequireLowercase: true
            RequireNumbers: true
            RequireSymbols: false

    CognitoUserPoolClient:
      Type: AWS::Cognito::UserPoolClient
      Properties:
        ClientName: MyAppClient
        UserPoolId:
          Ref: CognitoUserPool
        ExplicitAuthFlows:
          - ALLOW_USER_PASSWORD_AUTH
          - ALLOW_REFRESH_TOKEN_AUTH
```

**사용 흐름:**

```bash
# 1. 회원가입
curl -X POST https://api.example.com/signup \
  -d '{"username":"john","password":"Pass1234"}'

# 2. 로그인
curl -X POST https://api.example.com/login \
  -d '{"username":"john","password":"Pass1234"}'
# 응답: {"token":"eyJhbGc..."}

# 3. 인증 필요한 API 호출
curl -H "Authorization: eyJhbGc..." \
  https://api.example.com/profile
# → Cognito 자동 검증 → Lambda 실행
```

**장점:**

- AWS 공식 솔루션
- 사용자 관리 자동화
- 보안이 잘 관리됨

**단점:**

- 설정이 복잡함
- 추가 비용 (조금)

---

### 4️⃣ API Key (간단한 보호)

**사용 사례:**

- 외부 개발자용 공개 API
- 간단한 접근 제어
- Rate limiting

**구조:**

```
API Key (고정된 키)
  ↓
요청 시 헤더에 포함
  ↓
API Gateway 자동 검증
  ↓
✅ 일치 → Lambda 실행
❌ 불일치 → 403 Forbidden
```

**설정:**

```yaml
functions:
  getPublic:
    handler: handlers/public.get
    events:
      - http:
          path: public
          method: GET
          security:
            - api_key: [] # API Key 필수
          cors: true

  getPrivate:
    handler: handlers/private.get
    events:
      - http:
          path: private
          method: GET
          # security 없음 = API Key 없어도 됨
          cors: true

resources:
  Resources:
    ApiKey:
      Type: AWS::ApiGateway::ApiKey
      Properties:
        Name: MyApiKey-${self:provider.stage}
        Enabled: true
        StageKeys:
          - RestApiId:
              Ref: ApiGatewayRestApi
            StageName: ${self:provider.stage}

    ApiKeyUsagePlan:
      Type: AWS::ApiGateway::UsagePlan
      Properties:
        UsagePlanName: MyUsagePlan
        ApiStages:
          - ApiId:
              Ref: ApiGatewayRestApi
            Stage: ${self:provider.stage}
        ApiKeyIds:
          - Ref: ApiKey
        Throttle:
          BurstLimit: 100
          RateLimit: 10 # 초당 10 요청
```

**사용 흐름:**

```bash
# AWS 콘솔에서 API Key 생성 → key 값 복사

# API 요청 (key 포함)
curl -H "x-api-key: xxxxxxxx" \
  https://api.example.com/public

# ✅ 성공
```

**장점:**

- 매우 간단
- 설정이 적음

**단점:**

- 권한 제어 불가 (모든 사용자 동등)
- Rate limiting만 가능
- 보안이 약함 (키가 고정)

---

## 📊 비교표

| 방식                  | 복잡도 | 보안   | 커스터마이징 | 비용 | 최적 사용        |
| --------------------- | ------ | ------ | ------------ | ---- | ---------------- |
| **No Auth**           | ⭐     | ❌     | ❌           | 무료 | 공개 API         |
| **Lambda Authorizer** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐       | 약간 | 복잡한 로직      |
| **Cognito**           | ⭐⭐   | ⭐⭐⭐ | ⭐⭐         | 약간 | 사용자 관리 필요 |
| **API Key**           | ⭐     | ⭐     | ❌           | 무료 | 개발자 API       |

---

## 🎯 실무 추천

### 신규 프로젝트

```yaml
# 단계 1: 개발 중 (No Auth)
functions:
  api:
    handler: handlers/api.handler
    events:
      - http:
          path: /
          method: ANY
          cors: true
# 단계 2: 배포 (Cognito 추가)
# 위의 "Cognito User Pools" 예시 참고
```

### 마이크로서비스

```yaml
# 내부 서비스 간 통신 (Lambda Authorizer)
authorizeInternal:
  handler: handlers/auth.authorizeInternal

service1:
  handler: handlers/service1.handler
  events:
    - http:
        authorizer:
          name: authorizeInternal
```

### 외부 개발자 API

```yaml
# API Key + Rate limiting
getPublic:
  handler: handlers/public.handler
  events:
    - http:
        security:
          - api_key: []
        cors: true
```

---

## 🔄 Serverless Framework vs SAM 인증 설정 비교

### 1️⃣ No Auth (인증 없음)

**Serverless Framework:**

```yaml
functions:
  api:
    handler: handlers/api.handler
    events:
      - http:
          path: /
          method: GET
          cors: true
          # authorizer 없음
```

**SAM:**

```yaml
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/api.handler
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /
            Method: GET

  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Stage
```

**차이:**

- Serverless: `events` 섹션에 직접 작성
- SAM: `Resources`에서 `ServerlessFunction` + `ServerlessApi` 분리

---

### 2️⃣ Lambda Authorizer

**Serverless Framework:**

```yaml
functions:
  authorizeLambda:
    handler: handlers/auth.authorizer

  getProfile:
    handler: handlers/user.getProfile
    events:
      - http:
          path: profile
          method: GET
          authorizer:
            name: authorizeLambda
            identitySource: method.request.header.Authorization
            resultTtlInSeconds: 300
```

**SAM:**

```yaml
Resources:
  AuthorizerFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/auth.authorizer

  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Stage
      Auth:
        DefaultAuthorizer: LambdaTokenAuthorizer
        Authorizers:
          LambdaTokenAuthorizer:
            FunctionArn: !GetAtt AuthorizerFunction.Arn
            Identity:
              Header: Authorization
              ReauthorizeEveryInSeconds: 300

  GetProfileFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/user.getProfile
      Events:
        GetProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profile
            Method: GET
            Auth:
              Authorizer: LambdaTokenAuthorizer
```

**차이:**

- Serverless: 함수마다 `authorizer` 지정
- SAM: API에서 Authorizer 정의 후 함수에서 참조

---

### 3️⃣ Cognito User Pools

**Serverless Framework:**

```yaml
functions:
  login:
    handler: handlers/auth.login
    events:
      - http:
          path: login
          method: POST

  getProfile:
    handler: handlers/user.getProfile
    events:
      - http:
          path: profile
          method: GET
          authorizer:
            type: COGNITO_USER_POOLS
            identitySource: method.request.header.Authorization
            userPoolArn: arn:aws:cognito-idp:REGION:ACCOUNT:userpool/REGION_POOLID

resources:
  Resources:
    UserPool:
      Type: AWS::Cognito::UserPool
      Properties:
        UserPoolName: MyPool-${self:provider.stage}
```

**SAM:**

```yaml
Resources:
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: MyPool-!Ref Stage

  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Stage
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn

  LoginFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/auth.login
      Events:
        Login:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /login
            Method: POST
            Auth:
              DefaultAuthorizer: NONE # 로그인은 인증 없음

  GetProfileFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/user.getProfile
      Events:
        GetProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profile
            Method: GET
            Auth:
              Authorizer: CognitoAuthorizer
```

**차이:**

- Serverless: ARN을 직접 입력
- SAM: `!GetAtt`로 리소스 참조 (더 유연함)

---

### 4️⃣ API Key

**Serverless Framework:**

```yaml
functions:
  getPublic:
    handler: handlers/public.handler
    events:
      - http:
          path: /public
          method: GET
          security:
            - api_key: []

resources:
  Resources:
    ApiKey:
      Type: AWS::ApiGateway::ApiKey
      Properties:
        Name: MyKey-${self:provider.stage}
        Enabled: true
        StageKeys:
          - RestApiId:
              Ref: ApiGatewayRestApi
            StageName: ${self:provider.stage}
```

**SAM:**

```yaml
Resources:
  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref Stage
      Auth:
        ApiKeyRequired: true # ← 더 간단!

  ApiKey:
    Type: AWS::ApiGateway::ApiKey
    Properties:
      Name: MyKey-!Ref Stage
      Enabled: true
      StageKeys:
        - RestApiId: !Ref ApiGateway
          StageName: !Ref Stage

  GetPublicFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/public.handler
      Events:
        GetPublic:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /public
            Method: GET
```

**차이:**

- Serverless: `security` 키워드로 지정
- SAM: `Auth.ApiKeyRequired` 로 전역 설정

---

## 📊 Serverless vs SAM 비교표

| 항목                | Serverless Framework | SAM                           |
| ------------------- | -------------------- | ----------------------------- |
| **설정 위치**       | 함수별 `events`      | 리소스 `Auth` 속성            |
| **문법**            | YAML (짧음)          | YAML (명시적)                 |
| **Authorizer 정의** | `name` 참조          | `FunctionArn` + `Authorizers` |
| **유연성**          | ⭐⭐ (제한적)        | ⭐⭐⭐ (명시적)               |
| **에러 처리**       | 자동화됨             | 수동 설정 필요                |
| **리소스 참조**     | `${self:...}` 변수   | `!Ref`, `!GetAtt`             |
| **CORS 설정**       | 각 함수마다          | API 레벨 통일                 |

---

## 💡 어떤 걸 써야 할까?

### Serverless Framework 추천

```yaml
# ✅ 빠르게 시작하고 싶을 때
# ✅ 각 함수마다 다른 인증이 필요할 때
# ✅ 복잡한 Authorizer 로직이 필요할 때
```

### SAM 추천

```yaml
# ✅ CloudFormation 네이티브 방식 원할 때
# ✅ 조직 표준이 CloudFormation일 때
# ✅ 인증을 API 레벨에서 통일하고 싶을 때
# ✅ 더 명시적인 코드 원할 때
```

---

## 🚀 다음 단계

- **Cognito 심화**: User groups, custom attributes
- **OAuth 2.0**: 소셜 로그인 (Google, GitHub)
- **Rate limiting**: 시간당 요청 수 제어
- **CORS**: 크로스 도메인 요청 허용

---

**관련 문서:**

- [01-SERVERLESS-BASICS.md](./01-SERVERLESS-BASICS.md) - Serverless Framework 인증
- [SERVERLESS-TO-SAM-MAPPING.md](./SERVERLESS-TO-SAM-MAPPING.md) - SAM 마이그레이션 가이드
