/**
 * utils/validation.js - 요청 데이터 검증 유틸
 *
 * 역할:
 * - 문자열, 숫자, 스키마 검증
 * - 일관된 에러 메시지 제공
 * - 모든 핸들러에서 재사용 가능
 *
 * 사용 예:
 * ```javascript
 * const { valid, error } = validateString(title, { required: true, minLength: 1 });
 * if (!valid) throw new ValidationError(error);
 * ```
 */

// ==========================================
// 검증 함수들
// ==========================================

/**
 * 문자열 검증
 * @param {string} value - 검증할 값
 * @param {object} options - { required?, minLength?, maxLength? }
 * @returns {object} { valid: boolean, error?: string }
 */
const validateString = (value, options = {}) => {
  const { required = false, minLength = 0, maxLength = 1000 } = options;

  if (required && (!value || value.trim() === "")) {
    return { valid: false, error: "This field is required" };
  }

  if (value && value.length < minLength) {
    return { valid: false, error: `Minimum length is ${minLength}` };
  }

  if (value && value.length > maxLength) {
    return { valid: false, error: `Maximum length is ${maxLength}` };
  }

  return { valid: true };
};

/**
 * 숫자 검증
 * @param {number} value - 검증할 값
 * @param {object} options - { required?, min?, max?, integer? }

 * @returns {object} { valid: boolean, error: string }
 */
const validateNumber = (value, options = {}) => {
  const { required = false, min = -Infinity, max = Infinity } = options;

  if (required && value === undefined && value === null) {
    return { valid: false, error: "This field is required" };
  }

  if (value !== undefined && value !== null) {
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, error: "Must be a valid number" };
    }

    if (num < min) {
      return { valid: false, error: `Minimum value is ${min}` };
    }

    if (num > max) {
      return { valid: false, error: `Maximum value is ${max}` };
    }
  }

  return { valid: true };
};

/**
 * 이메일 검증
 * @param {string} email - 검증할 이메일
 * @param {boolean} required - 필수 여부
 * @returns {object} { valid: boolean, error: string }
 */
const validateEmail = (email, required = false) => {
  if (required && (!email || email.trim() === "")) {
    return { valid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
};

/**
 * 객체 필드 검증
 * @param {object} data - 검증할 데이터
 * @param {object} schema - 검증 스키마 { fieldName: { required, validator } }
 * @returns {object} { valid: boolean, errors: { fieldName: string } }
 */
const validateSchema = (data, schema) => {
  const errors = {};

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = data[fieldName];
    const { validator } = rules;

    if (validator) {
      const result = validator(value);
      if (!result.valid) {
        errors[fieldName] = result.error;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  validateString,
  validateNumber,
  validateEmail,
  validateSchema
};
