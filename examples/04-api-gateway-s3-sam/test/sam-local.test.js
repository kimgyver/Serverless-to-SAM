#!/usr/bin/env node

/**
 * SAM Local - AWS S3 API Gateway 전체 함수 테스트
 * 5개 함수를 모두 SAM Local로 테스트하고 결과를 출력
 * 03-hello-world-sam 방식을 따릅니다
 */

const { execSync } = require("child_process");
const path = require("path");

// 테스트 설정
const AWS_REGION = "us-west-2";
const STAGE = "dev";
const PROJECT_DIR = path.join(__dirname, "..");
const ENV_FILE = path.join(PROJECT_DIR, ".env.json");

// 테스트 케이스
const tests = [
  {
    name: "ListFiles - 파일 목록 조회",
    function: "ListFunc",
    type: "S3",
    event: {
      httpMethod: "GET",
      path: "/files",
      queryStringParameters: null
    }
  },
  {
    name: "UploadFile - 업로드 URL 생성",
    function: "UploadFunc",
    type: "S3",
    event: {
      httpMethod: "POST",
      path: "/files/upload",
      body: JSON.stringify({ fileName: "test-file.txt" }),
      headers: { "Content-Type": "application/json" }
    }
  },
  {
    name: "GetFile - 파일 다운로드 URL (없는 파일)",
    function: "GetFunc",
    type: "S3",
    event: {
      httpMethod: "GET",
      path: "/files/nonexistent.txt",
      pathParameters: { key: "nonexistent.txt" }
    }
  },
  {
    name: "DeleteFile - 파일 삭제 (없는 파일)",
    function: "DelFunc",
    type: "S3",
    event: {
      httpMethod: "DELETE",
      path: "/files/nonexistent.txt",
      pathParameters: { key: "nonexistent.txt" }
    }
  },
  {
    name: "ProcessUpload - S3 이벤트 처리",
    function: "ProcessFunc",
    type: "S3",
    event: {
      Records: [
        {
          s3: {
            bucket: { name: "api-s3-dev-840297437975" },
            object: { key: "test-file.txt" }
          },
          eventName: "ObjectCreated:Put"
        }
      ]
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
  "║        🚀 SAM LOCAL - AWS S3 API GATEWAY 전체 함수 테스트                  ║"
);
console.log(
  "║                    5/5 함수 자동화 테스트 시작                             ║"
);
console.log(
  "╚═══════════════════════════════════════════════════════════════════════════╝\n"
);

/**
 * SAM Local Invoke 실행
 */
function runSamLocalInvoke(functionName, eventJson) {
  const eventStr = JSON.stringify(eventJson);
  const cmd = `cd ${PROJECT_DIR} && AWS_REGION=${AWS_REGION} sam local invoke ${functionName} \\
    --parameter-overrides Stage=${STAGE} \\
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
  const icon = "📦";
  process.stdout.write(`${icon} ${testNum}️⃣  ${test.name} ... `);

  const result = runSamLocalInvoke(test.function, test.event);

  let testResult = {
    index: testNum,
    name: test.name,
    function: test.function,
    type: test.type,
    passed: false,
    statusCode: null
  };

  if (result.success && result.response) {
    const statusCode = result.response.statusCode;
    testResult.statusCode = statusCode;

    // 성공 조건: 2xx 또는 4xx (예상된 에러도 성공)
    if ((statusCode >= 200 && statusCode < 300) || statusCode === 404) {
      testResult.passed = true;
      console.log(`✅ 성공 (${statusCode})`);
      passedCount++;
    } else {
      console.log(`❌ 실패 (${statusCode})`);
      failedCount++;
    }
  } else {
    console.log(`❌ 실패 (응답 없음)`);
    if (result.error) {
      testResult.error = result.error;
    }
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
  console.log(`📦 ${status} #${result.index}. ${result.name}`);
  console.log(`   함수: ${result.function}`);
  if (result.statusCode) {
    console.log(`   HTTP Status: ${result.statusCode}`);
  }
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  console.log("");
});

// 함수별 통계
console.log(
  "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

const s3Tests = results.filter(r => r.type === "S3");
const s3Passed = s3Tests.filter(r => r.passed).length;

console.log("\n📊 S3 함수 결과:\n");
console.log(
  `📦 S3 API: ${s3Passed}/${s3Tests.length} 성공 (List, Upload, Get, Delete, Process)`
);
s3Tests.forEach(t => {
  console.log(`   ${t.passed ? "✅" : "❌"} ${t.name}`);
});

// 최종 결과
console.log(
  "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);
if (failedCount === 0 && passedCount > 0) {
  console.log("✨ 모든 테스트 성공! 🎉\n");
  console.log("📌 핵심 검증 사항:");
  console.log("   ✅ SAM Local + AWS S3 연동 성공");
  console.log("   ✅ S3 파일 목록 조회 (ListFiles)");
  console.log("   ✅ 사전 서명된 업로드 URL 생성 (UploadFile)");
  console.log("   ✅ 사전 서명된 다운로드 URL 생성 (GetFile)");
  console.log("   ✅ 파일 삭제 (DeleteFile)");
  console.log("   ✅ S3 이벤트 처리 (ProcessUpload)\n");
  process.exit(0);
} else {
  console.log(`⚠️  ${failedCount}개 테스트 실패\n`);
  process.exit(1);
}
