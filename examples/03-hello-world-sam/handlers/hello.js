// Copy of handlers/hello.js from example 01-hello-world
// (Same implementation works for both Serverless and SAM)

// ============================================
// Utility Functions
// ============================================

const createLogger = functionName => ({
  log: (message, data = {}) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        function: functionName,
        level: "INFO",
        message,
        ...data
      })
    );
  },
  error: (message, error = {}) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        function: functionName,
        level: "ERROR",
        message,
        error: error.message || String(error),
        stack: error.stack
      })
    );
  }
});

const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "X-Service": process.env.SERVICE_NAME || "HelloWorld",
    "X-Stage": process.env.STAGE || "unknown",
    ...headers
  },
  body: typeof body === "string" ? body : JSON.stringify(body)
});

// ============================================
// Handler: SayHello
// ============================================

exports.sayHello = async (event, context) => {
  const logger = createLogger("SayHello");

  try {
    logger.log("Received request", {
      path: event.path,
      method: event.httpMethod,
      queryParams: event.queryStringParameters
    });

    const message = {
      greeting: "Hello, World!",
      timestamp: new Date().toISOString(),
      stage: process.env.STAGE,
      environment: process.env.ENVIRONMENT
    };

    logger.log("Sending response", { statusCode: 200 });
    return createResponse(200, message);
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// Handler: Greet
// ============================================

exports.greet = async (event, context) => {
  const logger = createLogger("Greet");

  try {
    const { name } = event.pathParameters || {};

    logger.log("Received request", {
      path: event.path,
      method: event.httpMethod,
      pathParams: { name }
    });

    if (!name) {
      logger.error("Missing name parameter");
      return createResponse(400, {
        error: "Bad Request",
        message: "name path parameter is required"
      });
    }

    const message = {
      greeting: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
      name,
      stage: process.env.STAGE
    };

    logger.log("Sending response", { statusCode: 200, name });
    return createResponse(200, message);
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// Handler: CreateMessage
// ============================================

exports.createMessage = async (event, context) => {
  const logger = createLogger("CreateMessage");

  try {
    let body = {};

    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        logger.error("Invalid JSON body", parseError);
        return createResponse(400, {
          error: "Bad Request",
          message: "Request body must be valid JSON"
        });
      }
    }

    logger.log("Received request", {
      path: event.path,
      method: event.httpMethod,
      bodyKeys: Object.keys(body)
    });

    const { title, content, author } = body;

    // Validation
    if (!title || !content) {
      logger.error("Missing required fields", { title, content });
      return createResponse(400, {
        error: "Bad Request",
        message: "title and content are required"
      });
    }

    const message = {
      id: `msg-${Date.now()}`,
      title,
      content,
      author: author || "Anonymous",
      createdAt: new Date().toISOString(),
      stage: process.env.STAGE,
      environment: process.env.ENVIRONMENT
    };

    logger.log("Message created", { messageId: message.id });
    return createResponse(201, message);
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// Handler: Divide
// ============================================

exports.divide = async (event, context) => {
  const logger = createLogger("Divide");

  try {
    let body = {};

    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        logger.error("Invalid JSON body", parseError);
        return createResponse(400, {
          error: "Bad Request",
          message: "Request body must be valid JSON"
        });
      }
    }

    logger.log("Received request", {
      path: event.path,
      method: event.httpMethod,
      bodyKeys: Object.keys(body)
    });

    const { dividend, divisor } = body;

    // Validation
    if (dividend === undefined || dividend === null) {
      logger.error("Missing dividend parameter");
      return createResponse(400, {
        error: "Bad Request",
        message: "dividend is required"
      });
    }

    if (divisor === undefined || divisor === null) {
      logger.error("Missing divisor parameter");
      return createResponse(400, {
        error: "Bad Request",
        message: "divisor is required"
      });
    }

    // Division by zero check
    if (divisor === 0) {
      logger.error("Division by zero attempted", { dividend, divisor });
      return createResponse(400, {
        error: "Bad Request",
        message: "divisor cannot be zero"
      });
    }

    const result = dividend / divisor;

    const response = {
      dividend,
      divisor,
      result,
      timestamp: new Date().toISOString(),
      stage: process.env.STAGE
    };

    logger.log("Division completed", { result });
    return createResponse(200, response);
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};
