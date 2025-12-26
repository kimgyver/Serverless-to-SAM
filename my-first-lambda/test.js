/**
 * test.js - Node.js에서 handler 함수를 직접 테스트하기 위한 파일
 *
 * 📝 주의: 현재는 필요 없습니다!
 * - npm run offline:start로 실제 Lambda 환경 시뮬레이션 가능
 * - curl로 HTTP API 테스트 가능
 *
 * 💾 유지하는 이유:
 * - 함수 로직만 빠르게 테스트하고 싶을 때 유용할 수 있음
 * - 필요 시 나중에 사용 가능
 *
 * 사용법 (필요시): node test.js
 */

const { hello } = require("./handler");

// Mock API Gateway event
const event = {
  httpMethod: "GET",
  path: "/hello",
  queryStringParameters: {
    name: "Jason"
  }
};

// Mock context
const context = {};

console.log("🧪 로컬 테스트 시작...\n");

hello(event, context)
  .then(result => {
    console.log("✅ 응답:");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error("❌ 에러:", error);
  });
