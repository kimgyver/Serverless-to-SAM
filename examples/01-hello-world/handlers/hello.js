// handlers/hello.js - 개선된 Lambda 함수들 (검증 + 에러 처리 + DynamoDB)

const stage = process.env.STAGE;
const {
  validateString,
  validateNumber,
  validateSchema
} = require("../utils/validation");
const {
  BadRequestError,
  NotFoundError,
  ValidationError,
  handleError
} = require("../utils/errors");
const {
  createItem,
  getItem,
  updateItem,
  deleteItem,
  getAllItems,
  itemExists
} = require("../utils/dynamodb");

// 🔴 유틸: HTTP 응답 생성 헬퍼
const createResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
};

// 🔴 유틸: 로깅
const log = (level, message, data = {}) => {
  if (["DEBUG", "INFO", "WARN", "ERROR"].includes(level)) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        stage,
        message,
        data
      })
    );
  }
};

// ============================================
// 1️⃣ 기본: 파라미터 없이 "Hello" 반환
// ============================================
exports.helloHandler = async (event, context) => {
  log("INFO", "helloHandler called", {
    requestId: context.requestId,
    functionName: context.functionName
  });

  try {
    return createResponse(200, {
      message: "Hello from Serverless Framework!",
      timestamp: new Date().toISOString(),
      stage,
      requestId: context.requestId
    });
  } catch (error) {
    log("ERROR", "Error in helloHandler", { error: error.message });
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// 2️⃣ 경로 파라미터: GET /hello/{name}
// ============================================
exports.greetHandler = async (event, context) => {
  log("INFO", "greetHandler called", {
    pathParameters: event.pathParameters
  });

  try {
    const { name } = event.pathParameters;

    // 검증
    const validation = validateString(name, { required: true, minLength: 1 });
    if (!validation.valid) {
      throw new BadRequestError("Name parameter is invalid", {
        field: "name",
        error: validation.error
      });
    }

    return createResponse(200, {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      stage
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// ============================================
// 3️⃣ 요청 본문 파싱: POST /message
// ============================================
exports.createMessageHandler = async (event, context) => {
  log("INFO", "createMessageHandler called", {
    body: event.body
  });

  try {
    let body;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      body = event.body;
    }

    // 스키마 검증
    const schema = {
      message: {
        validator: val =>
          validateString(val, { required: true, minLength: 1, maxLength: 500 })
      },
      author: {
        validator: val =>
          validateString(val, { required: false, minLength: 1, maxLength: 100 })
      }
    };

    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // 실제 비동기 작업 시뮬레이션 (예: API 호출)
    await simulateAsyncWork(100);

    const messageId = Math.random().toString(36).substring(2, 9);

    return createResponse(200, {
      id: messageId,
      message: body.message,
      author: body.author || "Anonymous",
      createdAt: new Date().toISOString(),
      stage
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// ============================================
// 4️⃣ 에러 처리 예제: GET /divide/{a}/{b}
// ============================================
exports.divideHandler = async (event, context) => {
  log("INFO", "divideHandler called", {
    pathParameters: event.pathParameters
  });

  try {
    const { a, b } = event.pathParameters;

    // 숫자 검증
    const aValidation = validateNumber(a, { required: true });
    const bValidation = validateNumber(b, { required: true });

    if (!aValidation.valid) {
      throw new BadRequestError("Invalid 'a' parameter", {
        field: "a",
        error: aValidation.error
      });
    }

    if (!bValidation.valid) {
      throw new BadRequestError("Invalid 'b' parameter", {
        field: "b",
        error: bValidation.error
      });
    }

    const numA = Number(a);
    const numB = Number(b);

    if (numB === 0) {
      throw new BadRequestError("Cannot divide by zero", { field: "b" });
    }

    // 비동기 작업 시뮬레이션
    await simulateAsyncWork(50);

    const result = numA / numB;

    return createResponse(200, {
      a: numA,
      b: numB,
      result,
      timestamp: new Date().toISOString(),
      stage
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// ============================================
// 5️⃣ PUT 메서드: PUT /item/{id} (DynamoDB 저장)
// ============================================
exports.updateItemHandler = async (event, context) => {
  log("INFO", "updateItemHandler called", {
    pathParameters: event.pathParameters,
    body: event.body
  });

  try {
    const { id } = event.pathParameters;

    // ID 검증
    const idValidation = validateString(id, { required: true });
    if (!idValidation.valid) {
      throw new BadRequestError("Invalid ID parameter", { field: "id" });
    }

    // 요청 본문 파싱
    let body;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      body = event.body || {};
    }

    // 스키마 검증
    const schema = {
      title: {
        validator: val =>
          validateString(val, { required: true, minLength: 1, maxLength: 200 })
      },
      description: {
        validator: val =>
          validateString(val, { required: false, maxLength: 1000 })
      },
      status: {
        validator: val => {
          const validation = validateString(val, { required: false });
          if (!validation.valid) return validation;
          if (val && !["active", "inactive", "archived"].includes(val)) {
            return {
              valid: false,
              error: "Status must be active, inactive, or archived"
            };
          }
          return { valid: true };
        }
      }
    };

    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // DynamoDB에서 기존 아이템 확인
    const existing = await itemExists(id);
    if (!existing) {
      throw new NotFoundError(`Item with id ${id} not found`, { id });
    }

    // 비동기 작업 시뮬레이션 (예: 외부 API 호출, 데이터 처리)
    await simulateAsyncWork(200);

    // DynamoDB에 업데이트
    const updated = await updateItem(id, body);

    return createResponse(200, {
      ...updated,
      stage,
      message: "Item updated successfully"
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// ============================================
// 6️⃣ DELETE 메서드: DELETE /item/{id}
// ============================================
exports.deleteItemHandler = async (event, context) => {
  log("INFO", "deleteItemHandler called", {
    pathParameters: event.pathParameters
  });

  try {
    const { id } = event.pathParameters;

    // ID 검증
    const idValidation = validateString(id, { required: true });
    if (!idValidation.valid) {
      throw new BadRequestError("Invalid ID parameter", { field: "id" });
    }

    // DynamoDB에서 아이템 확인
    const existing = await itemExists(id);
    if (!existing) {
      throw new NotFoundError(`Item with id ${id} not found`, { id });
    }

    // 비동기 작업 시뮬레이션
    await simulateAsyncWork(150);

    // DynamoDB에서 삭제
    await deleteItem(id);

    return createResponse(200, {
      id,
      message: "Item deleted successfully",
      deletedAt: new Date().toISOString(),
      stage
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// ============================================
// 7️⃣ GET /items (모든 아이템 조회)
// ============================================
exports.listItemsHandler = async (event, context) => {
  log("INFO", "listItemsHandler called", {});

  try {
    // 비동기 작업 시뮬레이션
    await simulateAsyncWork(300);

    const items = await getAllItems();

    return createResponse(200, {
      items,
      count: items.length,
      stage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// ============================================
// 8️⃣ POST /item (새 아이템 생성 with DynamoDB)
// ============================================
exports.createItemHandler = async (event, context) => {
  log("INFO", "createItemHandler called", {
    body: event.body
  });

  try {
    let body;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      body = event.body || {};
    }

    // 스키마 검증
    const schema = {
      title: {
        validator: val =>
          validateString(val, { required: true, minLength: 1, maxLength: 200 })
      },
      description: {
        validator: val =>
          validateString(val, { required: false, maxLength: 1000 })
      },
      status: {
        validator: val => {
          const validation = validateString(val, { required: false });
          if (!validation.valid) return validation;
          if (val && !["active", "inactive", "archived"].includes(val)) {
            return {
              valid: false,
              error: "Status must be active, inactive, or archived"
            };
          }
          return { valid: true };
        }
      }
    };

    const validation = validateSchema(body, schema);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // ID 생성
    const id = `item-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // 비동기 작업 시뮬레이션
    await simulateAsyncWork(200);

    // DynamoDB에 저장
    const item = await createItem({
      id,
      title: body.title,
      description: body.description || "",
      status: body.status || "active"
    });

    return createResponse(201, {
      ...item,
      stage,
      message: "Item created successfully"
    });
  } catch (error) {
    const { statusCode, body } = handleError(error, log);
    return createResponse(statusCode, body);
  }
};

// ============================================
// 유틸: 비동기 작업 시뮬레이션
// ============================================
const simulateAsyncWork = (delayMs = 100) => {
  return new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
};
