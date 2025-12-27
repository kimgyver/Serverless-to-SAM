// utils/errors.js - 에러 처리 클래스 및 유틸

/**
 * API 에러 기본 클래스
 */
class APIError extends Error {
  constructor(statusCode, message, errorCode = null, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      error: {
        code: this.errorCode || "INTERNAL_ERROR",
        message: this.message,
        timestamp: this.timestamp,
        ...(Object.keys(this.details).length > 0 && { details: this.details })
      }
    };
  }
}

/**
 * 400 Bad Request
 */
class BadRequestError extends APIError {
  constructor(message, details = {}) {
    super(400, message, "BAD_REQUEST", details);
  }
}

/**
 * 404 Not Found
 */
class NotFoundError extends APIError {
  constructor(message, details = {}) {
    super(404, message, "NOT_FOUND", details);
  }
}

/**
 * 409 Conflict
 */
class ConflictError extends APIError {
  constructor(message, details = {}) {
    super(409, message, "CONFLICT", details);
  }
}

/**
 * 422 Unprocessable Entity (Validation Error)
 */
class ValidationError extends APIError {
  constructor(errors) {
    super(422, "Validation failed", "VALIDATION_ERROR", { errors });
  }
}

/**
 * 500 Internal Server Error
 */
class InternalServerError extends APIError {
  constructor(message = "Internal Server Error", errorCode = null) {
    super(500, message, errorCode || "INTERNAL_ERROR", {});
  }
}

/**
 * 에러를 처리하고 응답 객체로 변환
 * @param {Error} error - 처리할 에러
 * @returns {object} - { statusCode, body }
 */
const handleError = (error, logger = null) => {
  if (logger) {
    logger("ERROR", "Error occurred", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      statusCode: error.statusCode || 500,
      details: error.details || {}
    });
  }

  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON()
    };
  }

  // 예상치 못한 에러
  return {
    statusCode: 500,
    body: {
      statusCode: 500,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        timestamp: new Date().toISOString()
      }
    }
  };
};

module.exports = {
  APIError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  handleError
};
