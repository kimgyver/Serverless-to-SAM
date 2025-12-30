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

exports.helloHandler = async (event, context) => {
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

exports.greetHandler = async (event, context) => {
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

exports.createMessageHandler = async (event, context) => {
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

exports.divideHandler = async (event, context) => {
  const logger = createLogger("Divide");

  try {
    logger.log("Received request", {
      path: event.path,
      method: event.httpMethod,
      pathParameters: event.pathParameters
    });

    // Get dividend and divisor from path parameters
    const { a, b } = event.pathParameters || {};
    const dividend = a ? Number(a) : undefined;
    const divisor = b ? Number(b) : undefined;

    // Validation
    if (dividend === undefined || isNaN(dividend)) {
      logger.error("Missing or invalid dividend parameter");
      return createResponse(400, {
        error: "Bad Request",
        message:
          "dividend (path parameter 'a') is required and must be a number"
      });
    }

    if (divisor === undefined || isNaN(divisor)) {
      logger.error("Missing or invalid divisor parameter");
      return createResponse(400, {
        error: "Bad Request",
        message: "divisor (path parameter 'b') is required and must be a number"
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

// ============================================
// DynamoDB Handlers
// ============================================

const AWS = require("aws-sdk");

// DynamoDB Configuration
const dynamodbConfig = {
  region: "us-east-1" // Explicitly set to us-east-1 for AWS
};

// For LocalStack integration: configure endpoint when DYNAMODB_ENDPOINT is provided
if (process.env.DYNAMODB_ENDPOINT) {
  dynamodbConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamodbConfig.region = process.env.AWS_REGION || "us-west-2"; // LocalStack uses different region
}

const dynamodb = new AWS.DynamoDB.DocumentClient(dynamodbConfig);

// Table name from environment or use default
const tableName = process.env.ITEMS_TABLE || "sam-hello-world-items";

// Handler: ListItems
exports.listItemsHandler = async (event, context) => {
  const logger = createLogger("ListItems");

  try {
    logger.log("Received request", {
      path: event.path,
      method: event.httpMethod
    });

    const result = await dynamodb
      .scan({
        TableName: tableName
      })
      .promise();

    logger.log("Items retrieved", { count: result.Items.length });
    return createResponse(200, {
      items: result.Items,
      count: result.Items.length,
      stage: process.env.STAGE
    });
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// Handler: CreateItem
exports.createItemHandler = async (event, context) => {
  const logger = createLogger("CreateItem");

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

    const { title, description, author } = body;

    // Validation
    if (!title) {
      logger.error("Missing required fields", { title });
      return createResponse(400, {
        error: "Bad Request",
        message: "title is required"
      });
    }

    const id = `item-${Date.now()}`;
    const item = {
      id,
      title,
      description: description || "",
      author: author || "Anonymous",
      createdAt: new Date().toISOString(),
      stage: process.env.STAGE
    };

    await dynamodb
      .put({
        TableName: tableName,
        Item: item
      })
      .promise();

    logger.log("Item created", { itemId: id });
    return createResponse(201, item);
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// Handler: UpdateItem
exports.updateItemHandler = async (event, context) => {
  const logger = createLogger("UpdateItem");

  try {
    const { id } = event.pathParameters || {};

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
      itemId: id,
      bodyKeys: Object.keys(body)
    });

    if (!id) {
      logger.error("Missing item id");
      return createResponse(400, {
        error: "Bad Request",
        message: "id path parameter is required"
      });
    }

    const { title, description, author } = body;

    // Build update expression
    const updateParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (title !== undefined) {
      updateParts.push("#t = :title");
      expressionAttributeValues[":title"] = title;
      expressionAttributeNames["#t"] = "title";
    }

    if (description !== undefined) {
      updateParts.push("#d = :description");
      expressionAttributeValues[":description"] = description;
      expressionAttributeNames["#d"] = "description";
    }

    if (author !== undefined) {
      updateParts.push("#a = :author");
      expressionAttributeValues[":author"] = author;
      expressionAttributeNames["#a"] = "author";
    }

    if (updateParts.length === 0) {
      logger.error("No fields to update");
      return createResponse(400, {
        error: "Bad Request",
        message: "At least one field (title, description, author) is required"
      });
    }

    updateParts.push("#u = :updatedAt");
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();
    expressionAttributeNames["#u"] = "updatedAt";

    const result = await dynamodb
      .update({
        TableName: tableName,
        Key: { id },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW"
      })
      .promise();

    logger.log("Item updated", { itemId: id });
    return createResponse(200, result.Attributes);
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// Handler: DeleteItem
exports.deleteItemHandler = async (event, context) => {
  const logger = createLogger("DeleteItem");

  try {
    const { id } = event.pathParameters || {};

    logger.log("Received request", {
      path: event.path,
      method: event.httpMethod,
      itemId: id
    });

    if (!id) {
      logger.error("Missing item id");
      return createResponse(400, {
        error: "Bad Request",
        message: "id path parameter is required"
      });
    }

    await dynamodb
      .delete({
        TableName: tableName,
        Key: { id }
      })
      .promise();

    logger.log("Item deleted", { itemId: id });
    return createResponse(200, {
      message: "Item deleted successfully",
      itemId: id,
      stage: process.env.STAGE
    });
  } catch (error) {
    logger.error("Handler failed", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};
