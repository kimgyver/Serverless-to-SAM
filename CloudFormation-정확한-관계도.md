# 🔍 Serverless vs SAM vs CloudFormation: 정확히 뭐가 다른가?

> **핵심 질문**: Serverless의 serverless.yml, SAM의 template.yaml 모두 CloudFormation으로 변환되는데,  
> 왜 문법이 다르고, 정확히 뭐가 다른 거지?

---

## 📊 관계도

```
serverless.yml ──── 변환 ───→ CloudFormation JSON ──── 배포 ───→ AWS
(Serverless Framework)     (내부 생성)              (실제 리소스)

template.yaml ───── 변환 ───→ CloudFormation JSON ──── 배포 ───→ AWS
(SAM)              (SAM CLI가)  (실제 리소스)
```

**핵심**: 둘 다 최종적으로 **같은 CloudFormation JSON**으로 변환됩니다!

---

## 🎯 3가지의 관계 정리

### 1️⃣ CloudFormation (가장 원시)

**정의**: AWS의 Infrastructure as Code 표준 언어

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: "CloudFormation Template"

Resources:
  MyLambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: nodejs18.x
      Handler: index.handler
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            return { statusCode: 200, body: 'Hello' };
          };

  MyExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
```

**특징**:

- ✅ 가장 상세함 (모든 리소스 명시)
- ✅ 가장 유연함 (모든 가능한 설정 가능)
- ❌ 가장 복잡함 (코드가 길어짐)
- ❌ 가장 배우기 어려움

---

### 2️⃣ SAM (CloudFormation 단축형)

**정의**: CloudFormation의 "축약 버전" + Lambda 자동화

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31 # ← SAM 마법!

Globals:
  Function:
    Runtime: nodejs18.x

Resources:
  MyLambdaFunction:
    Type: AWS::Serverless::Function # ← 축약형!
    Properties:
      Handler: index.handler
      InlineCode: |
        exports.handler = async (event) => {
          return { statusCode: 200, body: 'Hello' };
        };
```

**특징**:

- ✅ CloudFormation보다 간단함
- ✅ Lambda 특화 (IAM Role 자동 생성)
- ✅ SAM CLI 지원 (로컬 테스트, 빠른 배포)
- ✅ 여전히 CloudFormation 표준 문법 사용
- ❌ CloudFormation 이해는 필수

**내부 동작**:

1. SAM Transform 읽음 (`Transform: AWS::Serverless-2016-10-31`)
2. `AWS::Serverless::Function` 을 실제 CloudFormation으로 변환
3. IAM Role 자동 생성
4. 일반 CloudFormation처럼 배포

---

### 3️⃣ Serverless Framework (가장 추상화)

**정의**: CloudFormation을 더 쉽게 쓰도록 만든 "도구"

```yaml
service: my-api

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}

functions:
  hello:
    handler: handler.hello
```

**특징**:

- ✅ 가장 간단함 (문법이 직관적)
- ✅ 플러그인 풍부 (생태계 크다)
- ✅ 배우기 가장 쉬움
- ❌ CloudFormation 숨겨짐 (이해하기 어렵)
- ❌ AWS 공식 도구 아님 (Third-party)

**내부 동작**:

1. serverless.yml 읽음
2. CloudFormation JSON 생성 (내부 코드로)
3. 자동으로 IAM Role, S3 버킷, CloudFormation 스택 생성
4. AWS에 배포

---

## 📈 추상화 레벨 비교

```
추상화 레벨 높음 ──────────────────────── 낮음
              Serverless → SAM → CloudFormation

쉬움                                    어려움
간결함                                  상세함
배우기 쉬움                             배우기 어려움
유연성 낮음                             유연성 높음
내부 로직 숨겨짐                        명시적
```

---

## 🔄 변환 과정 상세 분석

### Serverless Framework 변환

```
serverless.yml
    ↓
Serverless CLI가 읽음
    ↓
내부 변환 로직 실행:
  - functions → Lambda (AWS::Lambda::Function)
  - events → API Gateway / S3 / etc
  - provider.iam → IAM Role (AWS::IAM::Role)
  - custom.xxx → CloudFormation Parameters
    ↓
CloudFormation JSON 생성
    ↓
AWS CloudFormation API 호출
    ↓
실제 리소스 생성 (Lambda, API Gateway, etc)
```

**예시:**

```yaml
# serverless.yml
functions:
  hello:
    handler: index.handler
    events:
      - http: GET /hello
    iam:
      role.statements:
        - Effect: Allow
          Action: s3:GetObject
          Resource: "*"
```

↓ (Serverless가 변환)

```json
{
  "Resources": {
    "HelloLambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Handler": "index.handler",
        "Runtime": "nodejs18.x"
      }
    },
    "HelloApiGateway": {
      "Type": "AWS::ApiGateway::RestApi"
    },
    "IamRoleLambdaExecution": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": { ... },
        "Policies": [
          {
            "PolicyName": "root",
            "PolicyDocument": {
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": "s3:GetObject",
                  "Resource": "*"
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```

---

### SAM 변환

```
template.yaml
    ↓
SAM CLI가 읽음 (Transform 확인)
    ↓
SAM 변환 로직:
  - AWS::Serverless::Function → AWS::Lambda::Function
  - AWS::Serverless::Api → API Gateway 리소스들
  - Events 섹션 → EventSourceMapping, Permission
    ↓
확장된 CloudFormation JSON
    ↓
AWS CloudFormation API 호출
    ↓
실제 리소스 생성
```

**예시:**

```yaml
# template.yaml
Transform: AWS::Serverless-2016-10-31

Resources:
  HelloFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs18.x
      Events:
        HelloApi:
          Type: Api
          Properties:
            Path: /hello
            Method: GET
      Policies:
        - S3ReadPolicy:
            BucketName: "*"
```

↓ (SAM이 변환)

```json
{
  "Resources": {
    "HelloFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Handler": "index.handler",
        "Runtime": "nodejs18.x",
        "Role": { "Fn::GetAtt": ["HelloFunctionRole", "Arn"] }
      }
    },
    "HelloFunctionRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": { ... },
        "Policies": [
          {
            "PolicyName": "S3ReadPolicy",
            "PolicyDocument": { ... }
          }
        ]
      }
    },
    "HelloApi": {
      "Type": "AWS::ApiGateway::RestApi"
    },
    "HelloApiResource": {
      "Type": "AWS::ApiGateway::Resource"
    },
    "HelloApiMethod": {
      "Type": "AWS::ApiGateway::Method"
    },
    "HelloFunctionPermission": {
      "Type": "AWS::Lambda::Permission"
    }
  }
}
```

---

## ❓ 자주 하는 질문

### Q: 그럼 결국 같은 리소스가 생기는 거네?

**A: 맞습니다!** 최종 결과물은 동일합니다.

```
serverless.yml ─┐
               ├─→ CloudFormation JSON ─→ 같은 Lambda 함수
template.yaml ─┘
```

### Q: 그럼 왜 문법이 다르게 보일까?

**A: 추상화 레벨이 다르기 때문입니다.**

| 도구               | 문법                         | 이유                       |
| ------------------ | ---------------------------- | -------------------------- |
| **Serverless**     | `functions:`                 | 함수 중심 (Lambda에 특화)  |
| **SAM**            | `AWS::Serverless::Function:` | CloudFormation 스타일 유지 |
| **CloudFormation** | `AWS::Lambda::Function:`     | 모든 AWS 리소스 통일       |

Serverless는 "함수 배포 도구"  
SAM은 "CloudFormation 축약형"  
CloudFormation은 "AWS 리소스 통합 관리"

### Q: 그럼 나는 뭘 배워야 하는 거지?

**A: 순서대로!**

```
1️⃣ Serverless Framework 배워보기
   → "함수를 이렇게 배포하는구나" 이해

2️⃣ 내부에서 CloudFormation이 생성되는 것 알기
   → "아, 이게 CloudFormation으로 되는구나" 깨닫기

3️⃣ SAM 배우기
   → "CloudFormation을 좀 더 쉽게 쓰는 방법이군" 이해

4️⃣ CloudFormation 기본 배우기 (선택)
   → "CloudFormation이 정말 강력하네" 깨닫기
```

### Q: Serverless에서 내부적으로 생성되는 CloudFormation JSON을 볼 수 있나?

**A: 네! 두 가지 방법:**

```bash
# 방법 1: 배포 후 AWS CloudFormation 콘솔에서 보기
# AWS 콘솔 → CloudFormation → 스택 선택 → 템플릿 탭

# 방법 2: 로컬에서 생성 과정 보기
serverless print > template.json   # 생성될 CloudFormation 출력
```

---

## 🎓 핵심 정리

### 정확한 관계도

```
CloudFormation
  ↑
  │ (SAM이 변환)
  │
SAM (template.yaml)


CloudFormation
  ↑
  │ (Serverless가 변환)
  │
Serverless Framework (serverless.yml)
```

**둘 다 최종적으로 CloudFormation을 사용합니다!**

### 문법이 다른 이유

| Serverless           | SAM                      | CloudFormation  |
| -------------------- | ------------------------ | --------------- |
| 함수 중심            | CloudFormation 문법 유지 | 리소스 중심     |
| 간단하지만 마법 많음 | 상세하지만 이해 쉬움     | 명시적이고 강력 |
| 초보자용             | 중급자용                 | 전문가용        |

### 배워야 할 순서

```
1️⃣ Serverless Framework
   (이해하기 쉬움)
   ↓
2️⃣ CloudFormation 기본 개념
   (실제 내부 동작 이해)
   ↓
3️⃣ SAM
   (CloudFormation을 좀 더 쉽게)
```

---

## 💡 비유

마치:

- **Serverless** = "택시 앱" (버튼만 누르면 차가 온다 = 자세한 설정 몰라도 됨)
- **SAM** = "셀프 드라이브 렌터카" (차를 직접 빌려서 타지만, 기본 사용법만 알면 됨)
- **CloudFormation** = "자동차 직접 만들기" (엔진, 바퀴, 전자장치 모두 직접 조립)

결과물은 같은 "자동차"이지만, 만드는 방식이 다릅니다!

---

## 📚 더 깊이 알고 싶다면

### 1. Serverless가 생성하는 CloudFormation 구조 보기

```bash
cd examples/01-hello-world
serverless print
```

출력된 YAML/JSON을 보면:

- Resource 섹션에 `AWS::Lambda::Function` 있음
- Resource 섹션에 `AWS::IAM::Role` 자동 생성되어 있음
- Resource 섹션에 API Gateway 리소스들 있음

### 2. SAM이 변환하는 과정 보기

```bash
cd examples/03-hello-world-sam
sam build   # 변환 과정 실행
cat .aws-sam/build/template.yaml  # 변환된 결과
```

### 3. 최종 배포되는 CloudFormation 스택 보기

```bash
# AWS 콘솔
CloudFormation → 스택 선택 → 템플릿 탭 → 원본 보기
```

---

## 🎯 결론

| 구분               | Serverless                   | SAM                     | CloudFormation       |
| ------------------ | ---------------------------- | ----------------------- | -------------------- |
| **뭐하는 거?**     | 함수 배포 도구               | CF 축약형               | AWS 리소스 관리 표준 |
| **최종 결과**      | CloudFormation JSON으로 변환 | CloudFormation JSON     | 그대로 사용          |
| **문법 다른 이유** | 추상화 도구라서              | CF 표준 유지하면서 축약 | 모든 AWS 리소스 통일 |
| **배우기 난이도**  | ⭐ (쉬움)                    | ⭐⭐ (중간)             | ⭐⭐⭐ (어려움)      |
| **유연성**         | ⭐ (제한적)                  | ⭐⭐ (중간)             | ⭐⭐⭐ (무한)        |

**가장 중요한 것**: 모두 **CloudFormation을 기반**으로 작동합니다!
