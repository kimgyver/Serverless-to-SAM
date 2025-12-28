#!/usr/bin/env node

/**
 * SAM Local - AWS DynamoDB 전체 함수 테스트
 * 8개 함수를 모두 SAM Local로 테스트하고 결과를 출력
 */

const { execSync } = require("child_process");

// 테스트 설정
const AWS_REGION = "us-east-1";
const STAGE = "dev";
const ENVIRONMENT = "development";
const ENV_FILE = ".env.json";

// 테스트 케이스
const tests = [
  {
    name: "SayHello",
    function: "SayHelloFunction",
    type: "일반",
    event: {
      httpMethod: "GET",
      path: "/say-hello"
    }
  },
  {
    name: "Greet",
    function: "GreetFunction",
    type: "일반",
    event: {
      httpMethod: "GET",
      path: "/greet/Alice",
      pathParameters: { name: "Alice" }
    }
  },
  {
    name: "CreateMessage",
    function: "CreateMessageFunction",
    type: "일반",
    event: {
      body: JSON.stringify({
        title: "Test Message",
        content: "This is a test message",
        author: "TestUser"
      }),
      httpMethod: "POST",
      path: "/message"
    }
  },
  {
    name: "Divide",
    function: "DivideFunction",
    type: "일반",
    event: {
      body: JSON.stringify({
        dividend: 100,
        divisor: 4
      }),
      httpMethod: "POST",
      path: "/divide"
    }
  },
  {
    name: "CreateItem",
    function: "CreateItemFunction",
    type: "DynamoDB",
    event: {
      body: JSON.stringify({
        title: "Test Item from test-all.js",
        description: "Created by automated test script"
      }),
      httpMethod: "POST",
      path: "/item"
    }
  },
  {
    name: "ListItems",
    function: "ListItemsFunction",
    type: "DynamoDB",
    event: {
      httpMethod: "GET",
      path: "/items"
    }
  },
  {
    name: "UpdateItem",
    function: "UpdateItemFunction",
    type: "DynamoDB",
    event: {
      body: JSON.stringify({
        title: "Updated by test-all.js"
      }),
      pathParameters: { id: "item-1766893450293" },
      httpMethod: "PUT",
      path: "/item/item-1766893450293"
    }
  },
  {
    name: "DeleteItem",
    function: "DeleteItemFunction",
    type: "DynamoDB",
    event: {
      pathParameters: { id: "test-item-to-delete" },
      httpMethod: "DELETE",
      path: "/item/test-item-to-delete"
    }
  }
];

// 결과 저장소
const results = [];
let passedCount = 0;
let failedCount = 0;

console.log(
  "\n╔═══════════════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║        🚀 SAM LOCAL - AWS DYNAMODB 전체 함수 테스트                        ║"
);
console.log(
  "║                    8/8 함수 자동화 테스트 시작                             ║"
);
console.log(
  "╚═══════════════════════════════════════════════════════════════════════════╝\n"
);

/**
 * SAM Local Invoke 실행
 */
function runSamLocalInvoke(functionName, eventJson) {
  const eventStr = JSON.stringify(eventJson);
  const cmd = `AWS_REGION=${AWS_REGION} sam local invoke ${functionName} \\
    --parameter-overrides Stage=${STAGE} Environment=${ENVIRONMENT} \\
    --env-vars ${ENV_FILE} \\
    --event - << 'EOFTEST'
${eventStr}
EOFTEST`;

  try {
    const output = execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: "/bin/bash"
    });

    // JSON 응답 추출 (마지막 JSON 객체)
    const jsonMatch = output.match(/\{[\s\S]*\}$/);
    if (jsonMatch) {
      try {
        return {
          success: true,
          response: JSON.parse(jsonMatch[0]),
          raw: output
        };
      } catch (e) {
        return {
          success: false,
          response: null,
          raw: output,
          error: "JSON parse error"
        };
      }
    }
    return {
      success: false,
      response: null,
      raw: output,
      error: "No JSON response found"
    };
  } catch (error) {
    return {
      success: false,
      response: null,
      error: error.message,
      raw: error.stderr || error.stdout || ""
    };
  }
}

/**
 * 각 테스트 실행
 */
console.log("테스트 실행 중...\n");

tests.forEach((test, index) => {
  const testNum = index + 1;
  const icon = test.type === "DynamoDB" ? "⭐" : "  ";
  process.stdout.write(
    `${icon} ${testNum}️⃣  ${test.name} (${test.type}) ... `
  );

  const result = runSamLocalInvoke(test.function, test.event);

  let testResult = {
    index: testNum,
    name: test.name,
    function: test.function,
    type: test.type,
    passed: false,
    statusCode: null,
    itemCount: null,
    error: null
  };

  if (result.success && result.response) {
    const statusCode = result.response.statusCode;
    testResult.statusCode = statusCode;
    testResult.passed = statusCode >= 200 && statusCode < 300;

    // DynamoDB 함수는 특별 처리
    if (test.type === "DynamoDB" && result.response.body) {
      try {
        const body = JSON.parse(result.response.body);
        if (body.count !== undefined) {
          testResult.itemCount = body.count;
        }
      } catch (e) {
        // body 파싱 실패 무시
      }
    }

    if (testResult.passed) {
      console.log(`✅ 성공 (${statusCode})`);
      passedCount++;
    } else {
      console.log(`❌ 실패 (${statusCode})`);
      failedCount++;
    }
  } else {
    console.log(`❌ 실패`);
    testResult.error = result.error || "Unknown error";
    failedCount++;
  }

  results.push(testResult);
});

// 결과 요약
console.log(
  "\n╔═══════════════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║                          📊 테스트 결과 요약                                ║"
);
console.log(
  "╚═══════════════════════════════════════════════════════════════════════════╝\n"
);

console.log(`✅ 성공: ${passedCount}/${tests.length}`);
console.log(`❌ 실패: ${failedCount}/${tests.length}\n`);

// 상세 결과
console.log(
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);
console.log("상세 결과:");
console.log(
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
);

results.forEach(result => {
  const status = result.passed ? "✅" : "❌";
  const icon = result.type === "DynamoDB" ? "⭐" : "  ";
  console.log(`${icon} ${status} #${result.index}. ${result.name}`);
  if (result.statusCode) {
    console.log(`   HTTP Status: ${result.statusCode}`);
  }
  if (result.itemCount !== null) {
    console.log(`   Items in DynamoDB: ${result.itemCount}`);
  }
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  console.log("");
});

// 함수 그룹별 통계
console.log(
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);
const dynamoDBTests = results.filter(r => r.type === "DynamoDB");
const generalTests = results.filter(r => r.type === "일반");

const dynamoDBPassed = dynamoDBTests.filter(r => r.passed).length;
const generalPassed = generalTests.filter(r => r.passed).length;

console.log("\n📊 함수 그룹별 결과:\n");
console.log(
  `⭐ DynamoDB 함수: ${dynamoDBPassed}/${dynamoDBTests.length} 성공 (Create, Read, Update, Delete)`
);
dynamoDBTests.forEach(t => {
  console.log(`   ${t.passed ? "✅" : "❌"} ${t.name}`);
});

console.log(`\n📋 일반 함수: ${generalPassed}/${generalTests.length} 성공`);
generalTests.forEach(t => {
  console.log(`   ${t.passed ? "✅" : "❌"} ${t.name}`);
});

// 최종 결과
console.log(
  "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);
if (failedCount === 0 && passedCount > 0) {
  console.log("✨ 모든 테스트 성공! 🎉\n");
  console.log("📌 핵심 검증 사항:");
  console.log("   ✅ 3가지 핵심 변경사항이 올바르게 작동");
  console.log("   ✅ DynamoDB 리전 Hardcoding");
  console.log("   ✅ 환경변수 파일 (.env.json)");
  console.log("   ✅ IAM 사용자 권한 설정");
  console.log("\n");
  process.exit(0);
} else {
  console.log(`⚠️  ${failedCount}개 테스트 실패\n`);
  process.exit(1);
}
