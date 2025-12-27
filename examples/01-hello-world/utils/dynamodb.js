/**
 * utils/dynamodb.js - DynamoDB 연동 유틸리티
 *
 * 역할:
 * - DynamoDB 클라이언트 관리 (로컬/AWS 자동 선택)
 * - CRUD 작업 함수 제공
 * - 에러 처리 및 로깅
 *
 * 로컬 테스트:
 * - IS_OFFLINE=true npm run offline
 * - AWS DynamoDB 개발 테이블 사용 (hello-world-items-dev)
 *
 * 프로덕션:
 * - AWS DynamoDB 프로덕션 테이블 사용 (hello-world-items)
 */

const AWS = require("aws-sdk");

// ==========================================
// DynamoDB 클라이언트 초기화
// ==========================================

let dynamodb;

if (process.env.IS_OFFLINE) {
  // 로컬 테스트 모드: AWS DynamoDB 개발 테이블
  // serverless-offline이 이 환경변수를 자동으로 설정함
  dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: "local",
    secretAccessKey: "local"
  });
  console.log("✅ DynamoDB: AWS 개발 테이블 (hello-world-items-dev)");
} else {
  // 프로덕션 모드: AWS DynamoDB (실제 AWS 자격증명 사용)
  dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.AWS_REGION || "us-east-1"
  });
  console.log("✅ DynamoDB: AWS 프로덕션 테이블");
}

// 테이블명 (환경변수 또는 기본값)
const TABLE_NAME = process.env.ITEMS_TABLE || "hello-world-items-dev";

// ==========================================
// CRUD 작업 함수들
// ==========================================

/**
 * 아이템 생성
 * @param {object} item - { id, title, description?, status? }
 * @returns {Promise<object>} 생성된 아이템
 * @throws {Error} 생성 실패 시
 */
const createItem = async item => {
  const params = {
    TableName: TABLE_NAME,
    Item: {
      id: item.id,
      title: item.title,
      description: item.description || "",
      status: item.status || "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  await dynamodb.put(params).promise();
  return params.Item;
};

/**
 * 아이템 조회
 * @param {string} id - 아이템 ID
 * @returns {Promise<object|undefined>} 조회된 아이템 또는 undefined
 * @throws {Error} 조회 실패 시
 */
const getItem = async id => {
  const params = {
    TableName: TABLE_NAME,
    Key: { id }
  };

  const result = await dynamodb.get(params).promise();
  return result.Item;
};

/**
 * 아이템 업데이트
 * @param {string} id - 아이템 ID
 * @param {object} updates - { title, description, status }
 * @returns {Promise<object>} - 업데이트된 아이템
 */
const updateItem = async (id, updates) => {
  const updateExpressions = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  if (updates.title) {
    updateExpressions.push("#title = :title");
    expressionAttributeValues[":title"] = updates.title;
    expressionAttributeNames["#title"] = "title";
  }

  if (updates.description !== undefined) {
    updateExpressions.push("description = :description");
    expressionAttributeValues[":description"] = updates.description;
  }

  if (updates.status) {
    updateExpressions.push("#status = :status");
    expressionAttributeValues[":status"] = updates.status;
    expressionAttributeNames["#status"] = "status";
  }

  updateExpressions.push("updatedAt = :updatedAt");
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  const params = {
    TableName: TABLE_NAME,
    Key: { id },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(Object.keys(expressionAttributeNames).length > 0 && {
      ExpressionAttributeNames: expressionAttributeNames
    }),
    ReturnValues: "ALL_NEW"
  };

  const result = await dynamodb.update(params).promise();
  return result.Attributes;
};

/**
 * 아이템 삭제
 * @param {string} id - 아이템 ID
 * @returns {Promise<void>}
 */
const deleteItem = async id => {
  const params = {
    TableName: TABLE_NAME,
    Key: { id }
  };

  await dynamodb.delete(params).promise();
};

/**
 * 모든 아이템 조회
 * @returns {Promise<Array<object>>} 아이템 배열
 * @throws {Error} 조회 실패 시
 */
const getAllItems = async () => {
  const params = {
    TableName: TABLE_NAME
  };

  const result = await dynamodb.scan(params).promise();
  return result.Items || [];
};

/**
 * 아이템 존재 여부 확인
 * @param {string} id - 아이템 ID
 * @returns {Promise<boolean>} 존재 여부
 * @throws {Error} 조회 실패 시
 */
const itemExists = async id => {
  const item = await getItem(id);
  return !!item;
};

module.exports = {
  createItem,
  getItem,
  updateItem,
  deleteItem,
  getAllItems,
  itemExists,
  TABLE_NAME
};
