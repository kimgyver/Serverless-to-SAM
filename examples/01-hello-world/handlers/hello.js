// handlers/hello.js - 가장 기본적인 Lambda 함수들

const stage = process.env.STAGE;
const logLevel = process.env.LOG_LEVEL;

// 🔴 유틸: HTTP 응답 생성 헬퍼
const createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
};

// 🔴 유틸: 로깅
const log = (level, message, data = {}) => {
  if (['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      stage,
      message,
      data,
    }));
  }
};

// ============================================
// 1️⃣ 기본: 파라미터 없이 "Hello" 반환
// ============================================
exports.helloHandler = async (event, context) => {
  log('INFO', 'sayHello called', {
    requestId: context.requestId,
    functionName: context.functionName,
  });

  try {
    return createResponse(200, {
      message: 'Hello from Serverless Framework!',
      timestamp: new Date().toISOString(),
      stage,
      requestId: context.requestId,
    });
  } catch (error) {
    log('ERROR', 'Error in helloHandler', { error: error.message });
    return createResponse(500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};

// ============================================
// 2️⃣ 경로 파라미터: GET /hello/{name}
// ============================================
exports.greetHandler = async (event, context) => {
  log('INFO', 'greet called', {
    pathParameters: event.pathParameters,
  });

  try {
    const { name } = event.pathParameters;

    if (!name) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Name parameter is required',
      });
    }

    return createResponse(200, {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      stage,
      requestId: context.requestId,
    });
  } catch (error) {
    log('ERROR', 'Error in greetHandler', { error: error.message });
    return createResponse(500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};

// ============================================
// 3️⃣ POST 본문 처리: POST /message
// ============================================
exports.createMessageHandler = async (event, context) => {
  log('INFO', 'createMessage called', {
    body: event.body,
  });

  try {
    let body;

    // 🔴 중요: API Gateway에서 body는 String으로 옴
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body);
    } else {
      body = event.body;
    }

    const { message, author } = body;

    if (!message) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Message field is required',
      });
    }

    return createResponse(201, {
      id: Math.random().toString(36).substr(2, 9),
      message,
      author: author || 'Anonymous',
      createdAt: new Date().toISOString(),
      stage,
    });
  } catch (error) {
    log('ERROR', 'Error in createMessageHandler', { error: error.message });
    return createResponse(500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};

// ============================================
// 4️⃣ 에러 처리: GET /divide/{a}/{b}
// ============================================
exports.divideHandler = async (event, context) => {
  log('INFO', 'divide called', {
    pathParameters: event.pathParameters,
  });

  try {
    const { a, b } = event.pathParameters;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);

    // 파라미터 검증
    if (isNaN(numA) || isNaN(numB)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Both a and b must be valid numbers',
      });
    }

    // 비즈니스 로직 검증
    if (numB === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'Cannot divide by zero',
      });
    }

    const result = numA / numB;

    return createResponse(200, {
      operation: 'division',
      a: numA,
      b: numB,
      result,
      timestamp: new Date().toISOString(),
      stage,
    });
  } catch (error) {
    log('ERROR', 'Error in divideHandler', { error: error.message });
    return createResponse(500, {
      error: 'Internal Server Error',
      message: error.message,
    });
  }
};
