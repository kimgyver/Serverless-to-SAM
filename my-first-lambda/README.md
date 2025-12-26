# my-first-lambda

첫 번째 Serverless Lambda 프로젝트

## 구조

```
my-first-lambda/
├── serverless.yml      # Serverless 설정
├── handler.js          # Lambda 함수
├── package.json        # 의존성
└── README.md
```

## 배포

```bash
# dev 환경에 배포
npm run deploy:dev

# prod 환경에 배포
npm run deploy:prod

# 배포 제거
npm run remove:dev
```

## 호출

```bash
# 엔드포인트 호출
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/hello

# 쿼리 파라미터와 함께
curl "https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev/hello?name=Jason"
```

## 학습 포인트

- API Gateway와 Lambda 통합
- Serverless Framework 배포 프로세스
- AWS CloudFormation 스택 생성
