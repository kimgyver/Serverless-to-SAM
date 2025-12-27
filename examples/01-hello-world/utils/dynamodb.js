// utils/dynamodb.js - DynamoDB 연동 유틸

const AWS = require("aws-sdk");

// DynamoDB 클라이언트
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.ITEMS_TABLE || "hello-world-items";

/**
 * 아이템 생성
 * @param {object} item - { id, title, description, status }
 * @returns {Promise<object>} - 생성된 아이템
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
 * @returns {Promise<object>} - 조회된 아이템
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
 * @returns {Promise<Array>} - 아이템 배열
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
 * @returns {Promise<boolean>}
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
