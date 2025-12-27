"use strict";

module.exports.hello = async event => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  // POST 요청일 때 body 파싱
  let requestBody = {};
  if (event.body) {
    try {
      requestBody =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.log("Failed to parse body:", e.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Hello from Lambda! 🚀",
        timestamp: new Date().toISOString(),
        method: event.httpMethod,
        queryParams: event.queryStringParameters || {},
        bodyParams: requestBody
      },
      null,
      2
    )
  };
};
