"use strict";

module.exports.hello = async event => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Hello from Lambda! 🚀",
        timestamp: new Date().toISOString(),
        input: event.queryStringParameters || {}
      },
      null,
      2
    )
  };
};
