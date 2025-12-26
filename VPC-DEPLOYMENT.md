# 🌐 VPC에 Lambda 배포하기

## 📚 목차

1. [VPC가 필요한 이유](#vpc가-필요한-이유)
2. [VPC 아키텍처](#vpc-아키텍처)
3. [NAT Gateway와 인터넷 접근](#nat-gateway와-인터넷-접근)
4. [Serverless Framework에서 VPC 설정](#serverless-framework에서-vpc-설정)
5. [SAM에서 VPC 설정](#sam에서-vpc-설정)
6. [실제 사용 사례](#실제-사용-사례)
7. [비용 최적화](#비용-최적화)
8. [주의사항](#주의사항)

---

## VPC가 필요한 이유

### VPC 필요한 경우 ✅

```
┌─────────────────────────────────────┐
│  Lambda (VPC 내)                    │
│  ↓                                  │
│  RDS (Private Subnet)               │
│  ElastiCache (Private Subnet)       │
│  추가 DB 서버 (프라이빗 네트워크)    │
└─────────────────────────────────────┘
```

**이 경우 VPC 필수:**

- **RDS** (MySQL, PostgreSQL, Oracle 등)
- **ElastiCache** (Redis, Memcached)
- **내부 네트워크 리소스** (프라이빗 DB, 서버)
- **보안 강화** (네트워크 격리)

### VPC 불필요한 경우 ❌

```
┌──────────────────────────────┐
│  Lambda (VPC 없음)           │
│  ↓                           │
│  S3, DynamoDB, 외부 API      │
│  (AWS 관리형 서비스)          │
└──────────────────────────────┘
```

**VPC 없어도 되는 경우:**

- **S3** (AWS 관리형, VPC Gateway Endpoint 또는 NAT Gateway 대안)
- **DynamoDB** (AWS 관리형, VPC Gateway Endpoint 또는 NAT Gateway 대안)
- **외부 API 호출** (간단한 경우, NAT Gateway 선택사항)
- **CloudWatch Logs, X-Ray** (자동으로 지원)

---

## VPC 아키텍처

### 기본 구조

```
┌──────────────────────────────────────────────────────────────┐
│                          VPC (10.0.0.0/16)                   │
├────────────────────────────────────┬─────────────────────────┤
│       Public Subnet (10.0.1.0/24)   │ Private Subnet          │
│                                    │ (10.0.2.0/24)           │
│  ┌──────────────────────────────┐  │                         │
│  │  NAT Gateway                 │  │  ┌──────────────────┐   │
│  │  (Elastic IP: 52.xxx.xxx.xx) │  │  │  Lambda Function │   │
│  └──────────────────────────────┘  │  │  (Private IP)    │   │
│           ↕                        │  └──────────────────┘   │
│  ┌──────────────────────────────┐  │                         │
│  │ Internet Gateway             │  │  ┌──────────────────┐   │
│  └──────────────────────────────┘  │  │  RDS Database    │   │
│           ↕                        │  │  (Private IP)    │   │
└────────────────────────────────────┴──┴──────────────────────┘
           ↓
      인터넷 (외부)
```

### 트래픽 흐름

**Lambda → 인터넷:**

```
Lambda (10.0.2.10)
  ↓ (Private Subnet 내에서 생성된 요청)
NAT Gateway (10.0.1.0/24의 Elastic IP: 52.xxx.xxx.xxx)
  ↓ (IP 변환: 10.0.2.10 → 52.xxx.xxx.xxx)
Internet Gateway
  ↓
외부 인터넷 (예: api.example.com)
```

**외부 → Lambda:**

```
외부 응답 (52.xxx.xxx.xxx로 옴)
  ↓
NAT Gateway (응답 IP 변환: 52.xxx.xxx.xxx → 10.0.2.10)
  ↓
Lambda (10.0.2.10)
```

---

## NAT Gateway와 인터넷 접근

### NAT Gateway란?

**NAT** = Network Address Translation

```yaml
# NAT Gateway는 "우리 집의 대문"같은 역할
- Private Subnet의 Lambda: 공개 IP 없음 (내부 IP만)
- NAT Gateway: 공개 IP (Elastic IP) 소유
- Lambda의 모든 외부 요청을 대신 보냄
- 응답도 NAT Gateway가 받아서 Lambda에 전달
```

### NAT Gateway 설정 (Serverless Framework)

```yaml
# serverless.yml
service: my-vpc-service

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}

  # VPC 설정
  vpc:
    securityGroupIds:
      - sg-xxxxxxxxx # RDS 접근 허용하는 Security Group
    subnetIds:
      - subnet-xxxxxxxx # Private Subnet 1
      - subnet-xxxxxxxx # Private Subnet 2

functions:
  connectRDS:
    handler: handlers/rds.handler
    environment:
      DB_HOST: my-rds-instance.c9akciq32.us-east-1.rds.amazonaws.com
      DB_USER: admin
      DB_NAME: mydb
    events:
      - http:
          path: data
          method: get

resources:
  Resources:
    # NAT Gateway는 VPC를 만들 때 함께 생성
    # 또는 AWS Console에서 미리 생성해야 함
    # (Serverless Framework는 NAT Gateway 자동 생성 안 함)
```

### NAT Gateway 설정 (SAM)

```yaml
# template.yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Resources:
  # VPC
  MyVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true

  # Public Subnet (NAT Gateway용)
  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MyVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
      MapPublicIpOnLaunch: true

  # Private Subnet (Lambda용)
  PrivateSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MyVPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref MyVPC
      InternetGatewayId: !Ref InternetGateway

  # Elastic IP for NAT Gateway
  NATGatewayEIP:
    Type: AWS::EC2::EIP
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  # NAT Gateway (Public Subnet에 위치)
  NATGateway:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NATGatewayEIP.AllocationId
      SubnetId: !Ref PublicSubnet

  # Public Route Table
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref MyVPC

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnetRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet
      RouteTableId: !Ref PublicRouteTable

  # Private Route Table
  PrivateRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref MyVPC

  PrivateRoute:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NATGateway

  PrivateSubnetRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet
      RouteTableId: !Ref PrivateRouteTable

  # Security Group (RDS 접근)
  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for Lambda
      VpcId: !Ref MyVPC
      EgressRules:
        - IpProtocol: tcp
          FromPort: 3306
          ToPort: 3306
          DestinationSecurityGroupId: !Ref RDSSecurityGroup

  RDSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for RDS
      VpcId: !Ref MyVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 3306
          ToPort: 3306
          SourceSecurityGroupId: !Ref LambdaSecurityGroup

  # Lambda Function in VPC
  ConnectRDSFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/
      Handler: rds.handler
      Runtime: nodejs18.x
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSecurityGroup
        SubnetIds:
          - !Ref PrivateSubnet
      Environment:
        Variables:
          DB_HOST: !GetAtt RDSInstance.Endpoint.Address
          DB_USER: admin
          DB_NAME: mydb
      Policies:
        - VPCAccessExecutionRole

  # RDS Instance
  RDSInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: my-rds-instance
      Engine: mysql
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
      MasterUsername: admin
      MasterUserPassword: !Sub "{{resolve:secretsmanager:rds-password:SecretString:password}}"
      VpcSecurityGroups:
        - !Ref RDSSecurityGroup
      DBSubnetGroupName: !Ref DBSubnetGroup

  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS
      SubnetIds:
        - !Ref PrivateSubnet

Outputs:
  VpcId:
    Value: !Ref MyVPC
  NATGatewayIP:
    Value: !Ref NATGatewayEIP
  RDSEndpoint:
    Value: !GetAtt RDSInstance.Endpoint.Address
```

---

## Serverless Framework에서 VPC 설정

### 기본 VPC 설정

```yaml
provider:
  vpc:
    securityGroupIds:
      - sg-12345678
    subnetIds:
      - subnet-12345678
      - subnet-87654321
```

### 환경별 VPC 설정

```yaml
provider:
  vpc:
    securityGroupIds: ${self:custom.vpc.securityGroupIds.${self:provider.stage}}
    subnetIds: ${self:custom.vpc.subnetIds.${self:provider.stage}}

custom:
  vpc:
    securityGroupIds:
      dev:
        - sg-dev-12345
      prod:
        - sg-prod-12345
    subnetIds:
      dev:
        - subnet-dev-1
        - subnet-dev-2
      prod:
        - subnet-prod-1
        - subnet-prod-2
```

### 함수별 VPC 설정

```yaml
functions:
  # VPC에 배포
  connectRDS:
    handler: handlers/rds.handler
    vpc:
      securityGroupIds:
        - sg-rds-access
      subnetIds:
        - subnet-private-1
        - subnet-private-2

  # VPC 없이 배포
  callExternalAPI:
    handler: handlers/api.handler
    # vpc 항목 없음 = VPC 미적용
```

---

## SAM에서 VPC 설정

### Lambda VpcConfig

```yaml
Resources:
  MyLambdaFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/
      Handler: index.handler
      Runtime: nodejs18.x
      VpcConfig:
        SecurityGroupIds:
          - sg-12345678
        SubnetIds:
          - subnet-12345678
          - subnet-87654321
```

### 자세한 VPC 구성

```yaml
Resources:
  # Security Group
  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Lambda security group
      VpcId: vpc-12345678
      SecurityGroupEgress:
        - IpProtocol: tcp
          FromPort: 3306
          ToPort: 3306
          DestinationSecurityGroupId: !Ref RDSSecurityGroup

  # Lambda in VPC
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/
      Handler: index.handler
      Runtime: nodejs18.x
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSecurityGroup
        SubnetIds:
          - subnet-12345678
      # VPC에서 인터넷 접근 시 필수
      Policies:
        - VPCAccessExecutionRole
```

---

## 실제 사용 사례

### Case 1: RDS 연결

**시나리오**: Lambda에서 MySQL (RDS)에 연결

```javascript
// handlers/rds.js
const mysql = require("mysql2/promise");

exports.handler = async event => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [rows] = await connection.execute("SELECT * FROM users");
  await connection.end();

  return {
    statusCode: 200,
    body: JSON.stringify(rows)
  };
};
```

**Serverless 설정:**

```yaml
provider:
  vpc:
    securityGroupIds:
      - sg-rds-access
    subnetIds:
      - subnet-private-1
      - subnet-private-2
  environment:
    DB_HOST: my-rds.c9akciq32.us-east-1.rds.amazonaws.com
    DB_USER: admin
    DB_NAME: mydb

functions:
  queryRDS:
    handler: handlers/rds.handler
    events:
      - http:
          path: users
          method: get
```

**SAM 설정:**

```yaml
Resources:
  QueryRDSFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: handlers/
      Handler: rds.handler
      VpcConfig:
        SecurityGroupIds:
          - sg-rds-access
        SubnetIds:
          - subnet-private-1
          - subnet-private-2
      Environment:
        Variables:
          DB_HOST: !GetAtt RDSInstance.Endpoint.Address
          DB_USER: admin
          DB_NAME: mydb
      Policies:
        - VPCAccessExecutionRole
```

### Case 2: ElastiCache (Redis) 연결

**시나리오**: Lambda에서 Redis 캐시 접근

```javascript
// handlers/cache.js
const redis = require("redis");

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

exports.handler = async event => {
  const cached = await client.get("mykey");

  if (!cached) {
    const data = await fetchDataFromDB();
    await client.setex("mykey", 3600, JSON.stringify(data)); // 1시간 캐시
    return { statusCode: 200, body: JSON.stringify(data) };
  }

  return { statusCode: 200, body: cached };
};
```

**Serverless 설정:**

```yaml
provider:
  vpc:
    securityGroupIds:
      - sg-elasticache-access
    subnetIds:
      - subnet-private-1
      - subnet-private-2
  environment:
    REDIS_HOST: my-redis.xxxxx.ng.0001.use1.cache.amazonaws.com

functions:
  cachedQuery:
    handler: handlers/cache.handler
    events:
      - http:
          path: cached-data
          method: get
```

### Case 3: 외부 API + VPC (NAT Gateway)

**시나리오**: Lambda가 VPC 내에서 외부 API 호출

```javascript
// handlers/external-api.js
const axios = require("axios");

exports.handler = async event => {
  const response = await axios.get("https://api.example.com/data");
  return {
    statusCode: 200,
    body: JSON.stringify(response.data)
  };
};
```

**Serverless 설정:**

```yaml
provider:
  vpc:
    securityGroupIds:
      - sg-lambda
    subnetIds:
      - subnet-private-1 # NAT Gateway를 통해 인터넷 접근

functions:
  callAPI:
    handler: handlers/external-api.handler
    events:
      - http:
          path: external-data
          method: get
```

**아키텍처:**

```
Lambda (Private Subnet)
  ↓
NAT Gateway (Public Subnet의 Elastic IP)
  ↓
Internet Gateway
  ↓
외부 API (예: api.example.com)
```

---

## 비용 최적화

### NAT Gateway 비용

```
시간당 요금: $0.045 (us-east-1 기준)
데이터 처리 요금: $0.045/GB

예시:
- 하루 24시간 운영: $0.045 * 24 = $1.08/일 ≈ $32/월
- 월 100GB 데이터 전송: 100 * $0.045 = $4.5/월
- 총 월비용: 약 $36.5
```

### 비용 절감 방법

#### 방법 1: VPC Gateway Endpoint (권장)

**S3/DynamoDB 접근 시** NAT Gateway 대신 VPC Gateway Endpoint 사용

```yaml
# SAM: VPC Gateway Endpoint for S3
Resources:
  S3Endpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref MyVPC
      ServiceName: !Sub "com.amazonaws.${AWS::Region}.s3"
      RouteTableIds:
        - !Ref PrivateRouteTable

  MyLambda:
    Type: AWS::Serverless::Function
    Properties:
      # VPC에서 S3로 접근 시, 자동으로 Endpoint를 통함
      # NAT Gateway를 통하지 않음 = 비용 절감
      VpcConfig:
        SecurityGroupIds:
          - sg-lambda
        SubnetIds:
          - subnet-private-1
```

**비용 비교:**

- NAT Gateway: $32/월 + 데이터 전송 요금
- VPC Gateway Endpoint: $7.2/월 (시간당 $0.01) + 데이터 처리 무료

#### 방법 2: 필요한 함수만 VPC 적용

```yaml
# Serverless Framework
functions:
  # VPC 필요: RDS 접근
  queryDB:
    handler: handlers/db.handler
    vpc:
      securityGroupIds: [sg-rds]
      subnetIds: [subnet-private-1]

  # VPC 불필요: S3 접근
  uploadToS3:
    handler: handlers/s3.handler
    # vpc 항목 없음 = 비용 절감
```

#### 방법 3: NAT Gateway 공유

여러 Lambda 함수가 **같은 NAT Gateway** 사용

```yaml
# 같은 Security Group과 Subnet 사용
provider:
  vpc:
    securityGroupIds:
      - sg-shared-lambda
    subnetIds:
      - subnet-shared-private-1

functions:
  function1:
    handler: handlers/func1.handler
    # provider의 VPC 설정 상속

  function2:
    handler: handlers/func2.handler
    # provider의 VPC 설정 상속

  function3:
    handler: handlers/func3.handler
    # provider의 VPC 설정 상속
# 모두 같은 NAT Gateway 사용 = 비용 최소화
```

---

## 주의사항

### ⚠️ 1. Cold Start 증가

VPC에 배포된 Lambda는 **ENI(Elastic Network Interface) 연결**로 인해 Cold Start 시간 증가

```
일반 Lambda: ~100ms
VPC Lambda: ~500ms ~ 1초+

해결책:
- Provisioned Concurrency 사용 (비용 증가)
- 함수 메모리 증가 (CPU 향상)
- 불필요한 VPC 사용 피하기
```

### ⚠️ 2. Security Group 규칙 누락

```yaml
# ❌ 잘못된 설정: Egress 규칙 없음
LambdaSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Lambda SG
    # Egress 규칙이 없으면 RDS 연결 실패!

# ✅ 올바른 설정
LambdaSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Lambda SG
    SecurityGroupEgress:
      - IpProtocol: tcp
        FromPort: 3306
        ToPort: 3306
        DestinationSecurityGroupId: !Ref RDSSecurityGroup
```

### ⚠️ 3. VPC 정보 누락

```yaml
# ❌ 잘못된 설정
functions:
  myFunc:
    handler: index.handler
    # VPC 정보가 없으면 기본 VPC 사용 (RDS에 접근 불가)

# ✅ 올바른 설정
functions:
  myFunc:
    handler: index.handler
    vpc:
      securityGroupIds:
        - sg-xxxxx
      subnetIds:
        - subnet-xxxxx
```

### ⚠️ 4. NAT Gateway 없이 인터넷 접근 시도

```yaml
# ❌ 문제: Private Subnet의 Lambda에서 외부 API 호출
functions:
  callAPI:
    handler: handlers/api.handler
    vpc:
      securityGroupIds:
        - sg-lambda
      subnetIds:
        - subnet-private-1 # NAT Gateway 없음

# 결과: 외부 API 호출 실패 (timeout)

# ✅ 해결: NAT Gateway 생성 후 사용
# 또는 Lambda를 Public Subnet에 배포 (권장 안 함)
# 또는 VPC 사용 안 함 (권장)
```

### ⚠️ 5. RDS 암호 관리

```yaml
# ❌ 위험: 암호를 환경변수에 하드코딩
Environment:
  Variables:
    DB_PASSWORD: "mypassword123"

# ✅ 안전: Secrets Manager 사용
Environment:
  Variables:
    DB_PASSWORD: !Sub "{{resolve:secretsmanager:rds-password:SecretString:password}}"
```

---

## 체크리스트

### VPC 배포 전 확인사항

- [ ] **VPC 정말 필요한가?** (RDS, ElastiCache 등 프라이빗 리소스 있는가?)
- [ ] **VPC 생성됨** (또는 기존 VPC 사용 확인)
- [ ] **Subnet 2개 이상** (고가용성)
- [ ] **NAT Gateway 생성됨** (외부 API 호출 필요시)
- [ ] **Security Group 규칙 확인**
  - [ ] Lambda → RDS/ElastiCache Egress 규칙
  - [ ] RDS/ElastiCache ← Lambda Ingress 규칙
- [ ] **Environment Variable 설정** (DB_HOST, DB_USER, DB_PASSWORD)
- [ ] **IAM Policy에 VPCAccessExecutionRole 추가** (Lambda가 ENI 관리 가능하도록)
- [ ] **RDS/DB 인스턴스 생성** (같은 VPC, 다른 Subnet)
- [ ] **비용 예상**
  - [ ] NAT Gateway: ~$32-36/월
  - [ ] 데이터 전송: 처리량에 따라
  - [ ] RDS: 별도 비용

### 배포 후 테스트

- [ ] `sam build` 성공
- [ ] `sam deploy` 성공
- [ ] Lambda 로그에 접근 로그 확인
- [ ] RDS/DB 연결 테스트
- [ ] CloudWatch Logs에 에러 없음
- [ ] API Gateway 호출 테스트

---

## 요약

| 항목            | 설명                                            |
| --------------- | ----------------------------------------------- |
| **VPC 필요**    | RDS, ElastiCache, 프라이빗 네트워크 리소스      |
| **VPC 불필요**  | S3, DynamoDB, 외부 API (선택)                   |
| **NAT Gateway** | Private Subnet의 Lambda가 인터넷 접근할 때 필수 |
| **비용**        | NAT Gateway $32-36/월 + 데이터 전송료           |
| **성능**        | Cold Start 증가 (100ms → 500ms+)                |
| **보안**        | Security Group 규칙 필수                        |
| **권장**        | 정말 필요한 경우만 VPC 사용                     |

---

**다음: 실제 RDS 연결 예제로 VPC 배포 테스트하기!** 🚀
