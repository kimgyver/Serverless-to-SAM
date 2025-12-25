# 🔑 CloudFormation 핵심 개념 3+2 정리

> **SAM 마스터를 위한 필수 개념**: `!Ref`, `!GetAtt`, `!Sub` + `Parameters`, `Globals`

---

## 📌 Quick Answer (30초)

| 개념             | 뜻                  | 예                                                |
| ---------------- | ------------------- | ------------------------------------------------- |
| **`!Ref`**       | 리소스의 ID/ARN     | `!Ref MyBucket` → "my-bucket"                     |
| **`!GetAtt`**    | 리소스의 속성       | `!GetAtt MyBucket.Arn` → "arn:aws:s3:::my-bucket" |
| **`!Sub`**       | 문자열 변수 삽입    | `!Sub 'arn:aws:s3:::${BucketName}/*'`             |
| **`Parameters`** | 배포 시 입력값      | `sam deploy --parameter-overrides StageName=prod` |
| **`Globals`**    | 모든 함수 공통 설정 | 모든 함수가 자동 상속                             |

---

## 🎯 상세 설명

### 1️⃣ `!Ref` (Reference)

**언제 쓰나?** 리소스의 **기본 ID**가 필요할 때

```yaml
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket

  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Environment:
        Variables:
          BUCKET: !Ref MyBucket # "my-bucket"
```

**각 리소스 타입별 반환값**:

- S3 Bucket: 버킷 이름 (`my-bucket`)
- DynamoDB Table: 테이블 이름 (`Users`)
- Lambda Function: 함수 이름 (`my-function`)
- API Gateway: API ID (`xxxxxx`)

---

### 2️⃣ `!GetAtt` (Get Attribute)

**언제 쓰나?** 리소스의 **특정 속성**이 필요할 때

```yaml
# !Ref는 버킷명만 줌
# !GetAtt는 버킷의 특정 속성을 줌

Resources:
  MyBucket:
    Type: AWS::S3::Bucket

  MyPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyDocument:
        Statement:
          - Effect: Allow
            Action: s3:GetObject
            Resource: !GetAtt MyBucket.Arn # "arn:aws:s3:::my-bucket"
```

**자주 쓰이는 속성들**:

```yaml
!GetAtt MyBucket.Arn                      # S3 버킷 ARN
!GetAtt MyTable.StreamArn                 # DynamoDB 스트림 ARN
!GetAtt MyFunction.Arn                    # Lambda 함수 ARN
!GetAtt MyRole.Arn                        # IAM Role ARN
!GetAtt MyApi.RootResourceId              # API Gateway 리소스 ID
```

---

### 3️⃣ `!Sub` (Substitution)

**언제 쓰나?** 여러 변수를 **문자열에 삽입**할 때

```yaml
# 단순히 버킷명만으로는 부족
# ARN 경로의 일부가 필요 → !Sub 사용

Resources:
  MyRole:
    Type: AWS::IAM::Role
    Properties:
      Policies:
        - PolicyName: S3Policy
          PolicyDocument:
            Statement:
              - Effect: Allow
                Action: s3:GetObject
                # !Sub로 ARN 경로 생성
                Resource: !Sub "${MyBucket.Arn}/*"
                # "arn:aws:s3:::my-bucket/*"
```

**3가지 종류의 변수**:

1️⃣ **리소스 참조**:

```yaml
Resource: !Sub "${MyBucket.Arn}/*"
# MyBucket의 ARN을 삽입
```

2️⃣ **Parameters**:

```yaml
TableName: !Sub "Users-${StageName}"
# StageName = "prod" → "Users-prod"
```

3️⃣ **AWS 내장 변수**:

```yaml
Arn: !Sub "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}"
# us-east-1, 123456789012, Users → 완성된 ARN
```

---

### 4️⃣ `Parameters` (배포 시 입력)

**언제 쓰나?** 배포할 때마다 **다른 값**을 사용해야 할 때

```yaml
# 예: dev/staging/prod 환경마다 다른 설정

Parameters:
  StageName:
    Type: String
    Default: dev # 기본값
    AllowedValues: [dev, staging, prod] # 가능한 값들
    Description: "Deployment stage"

  EnableDebug:
    Type: String
    Default: "false"
    AllowedValues: ["true", "false"]
```

**배포 시 지정**:

```bash
# 명령줄
sam deploy --parameter-overrides StageName=prod EnableDebug=true

# 또는 대화식
sam deploy --guided
# 각 Parameter 입력 받음
```

**템플릿에서 사용**:

```yaml
Globals:
  Function:
    Environment:
      Variables:
        STAGE: !Ref StageName # dev, staging, prod 중 선택

Resources:
  MyFunction:
    Properties:
      Environment:
        Variables:
          DEBUG_MODE: !Ref EnableDebug # true 또는 false
```

---

### 5️⃣ `Globals` (공통 설정)

**언제 쓰나?** 모든 Lambda 함수에 **같은 설정**을 주고 싶을 때

```yaml
# 문제: 각 함수마다 반복
Resources:
  Func1:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs18.x
      Timeout: 30
      MemorySize: 256
      Environment:
        Variables:
          STAGE: dev

  Func2:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs18.x       # 반복!
      Timeout: 30
      MemorySize: 256
      Environment:
        Variables:
          STAGE: dev            # 반복!

# 해결: Globals 사용
Globals:
  Function:
    Runtime: nodejs18.x         # 모든 함수가 자동 상속
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        STAGE: !Ref StageName

Resources:
  Func1:
    Type: AWS::Serverless::Function
    Properties: {}              # Globals에서 자동 상속

  Func2:
    Type: AWS::Serverless::Function
    Properties: {}              # Globals에서 자동 상속
```

**오버라이드 가능**:

```yaml
Globals:
  Function:
    Timeout: 30

Resources:
  FastFunction:
    Type: AWS::Serverless::Function
    Properties: {} # 30초 상속

  SlowFunction:
    Type: AWS::Serverless::Function
    Properties:
      Timeout: 300 # 30초 대신 300초 사용
```

---

## 🎓 실전 비교 테이블

### Serverless Framework vs SAM

```yaml
# Serverless Framework
provider:
  runtime: nodejs18.x
  timeout: 30
  stage: ${opt:stage, 'dev'}
  environment:
    STAGE: ${self:provider.stage}

functions:
  func1:
    handler: h1.handler

  func2:
    handler: h2.handler
    timeout: 60 # 이 함수만 다름
```

```yaml
# SAM (위와 동일)
Globals:
  Function:
    Runtime: nodejs18.x
    Timeout: 30
    Environment:
      Variables:
        STAGE: !Ref StageName

Parameters:
  StageName:
    Type: String
    Default: dev

Resources:
  Func1:
    Type: AWS::Serverless::Function
    Properties:
      Handler: h1.handler

  Func2:
    Type: AWS::Serverless::Function
    Properties:
      Handler: h2.handler
      Timeout: 60 # Globals 오버라이드
```

---

## 💡 실전 예제

### 예1: 환경별 DB 연결

```yaml
Parameters:
  StageName:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Globals:
  Function:
    Timeout: 30
    Environment:
      Variables:
        STAGE: !Ref StageName

Resources:
  # dev는 로컬 DB, prod는 RDS
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: index.handler
      Environment:
        Variables:
          # Globals 변수에 추가
          DB_HOST: !Sub
            - "{{ host }}"
            - dev: "localhost"
              prod: "prod-db.rds.amazonaws.com"
```

### 예2: 권한 동적 설정

```yaml
Parameters:
  BucketName:
    Type: String
    Description: "S3 bucket name"

Globals:
  Function:
    Policies:
      - S3CrudPolicy:
          BucketName: !Ref BucketName # Parameter 사용

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: index.handler
      # BucketName Parameter의 권한 자동 적용
```

---

## ❌ 자주 하는 실수

### 실수 1: !Ref vs !GetAtt 혼동

```yaml
# ❌ 틀림: ARN이 필요한데 !Ref 사용
Resource: !Ref MyBucket  # "my-bucket" (버킷명)
# "arn:aws:s3:::my-bucket/*" 가 필요한데 버킷명만 옴

# ✅ 맞음: !GetAtt으로 ARN 가져오기
Resource: !GetAtt MyBucket.Arn  # "arn:aws:s3:::my-bucket"
```

### 실수 2: !Sub 문법 틀림

```yaml
# ❌ 틀림: 변수명 틀림
Resource: !Sub '${MyBucketArn}/*'  # MyBucket이 아님

# ✅ 맞음: 정확한 리소스명
Resource: !Sub '${MyBucket.Arn}/*'

# ✅ 또는 !GetAtt 직접
Resource: !Sub
  - '${arn}/*'
  - arn: !GetAtt MyBucket.Arn
```

### 실수 3: Globals를 꼭 Functions 섹션에만 사용

```yaml
# ❌ 틀림: Globals는 모든 리소스 타입에 가능
Globals:
  Function:
    Timeout: 30

  Api: # 이것도 가능!
    TracingEnabled: true
# ✅ 맞음: 여러 타입에 Globals 설정
```

---

## 🎯 언제 뭘 쓸지 판단 기준

### Flow Chart

```
배포할 때마다 다른 값?
├─ YES → Parameters 사용
│       sam deploy --parameter-overrides ...
│
└─ NO → 고정값

모든 함수가 같은 설정?
├─ YES → Globals 사용
│       모든 함수가 자동 상족
│
└─ NO → 각 함수마다 정의

리소스의 ID/이름만 필요?
├─ YES → !Ref
│       !Ref MyBucket → "my-bucket"
│
└─ NO

   특정 속성 필요 (ARN 등)?
   ├─ YES → !GetAtt
   │       !GetAtt MyBucket.Arn → "arn:aws:s3:::..."
   │
   └─ NO

      문자열 조합 필요?
      └─ YES → !Sub
              !Sub '${MyBucket.Arn}/*'
```

---

## 📚 최종 정리

| 개념           | 역할        | 문법                      | 예                     |
| -------------- | ----------- | ------------------------- | ---------------------- |
| **!Ref**       | 리소스 ID   | `!Ref Name`               | `!Ref MyBucket`        |
| **!GetAtt**    | 리소스 속성 | `!GetAtt Name.Attr`       | `!GetAtt MyBucket.Arn` |
| **!Sub**       | 문자열 변수 | `!Sub 'text ${Var}'`      | `!Sub '${Arn}/*'`      |
| **Parameters** | 배포 입력   | `Parameters: Name: Type:` | `StageName: String`    |
| **Globals**    | 공통 설정   | `Globals: Function:`      | 모든 함수 상속         |

---

**이 5가지만 완벽히 이해하면, SAM 템플릿의 80%를 작성할 수 있습니다!** 🚀
