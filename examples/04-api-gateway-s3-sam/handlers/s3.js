// AWS S3 Handler using AWS SDK v3
// Migrated from aws-sdk v2 to @aws-sdk/client-s3 for Node.js 18 Lambda runtime

const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  HeadObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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
    "X-Service": "S3FileService",
    "X-Stage": process.env.STAGE || "unknown",
    ...headers
  },
  body: typeof body === "string" ? body : JSON.stringify(body)
});

// ============================================
// S3 Client Initialization
// ============================================

let s3Client = null;

const getS3Client = () => {
  if (s3Client) return s3Client;

  // Hardcode region for SAM Local consistency (similar to DynamoDB fix)
  const clientConfig = {
    region: "us-west-2"
  };

  // For local testing with LocalStack (overrides hardcoded region)
  if (process.env.S3_LOCAL_ENDPOINT) {
    clientConfig.endpoint = process.env.S3_LOCAL_ENDPOINT;
    clientConfig.region = process.env.AWS_REGION || "us-west-2";
    clientConfig.forcePathStyle = true;
  }

  s3Client = new S3Client(clientConfig);
  return s3Client;
};

// ============================================
// Handler: ListFiles
// ============================================

exports.listFiles = async (event, context) => {
  const logger = createLogger("ListFiles");

  try {
    const s3 = getS3Client();
    const bucketName = process.env.BUCKET_NAME;

    logger.log("Listing files from bucket", { bucketName });

    const params = {
      Bucket: bucketName,
      MaxKeys: 100
    };

    // Get prefix from query parameters
    if (event.queryStringParameters?.prefix) {
      params.Prefix = event.queryStringParameters.prefix;
    }

    const command = new ListObjectsV2Command(params);
    const data = await s3.send(command);

    const files = (data.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      storageClass: obj.StorageClass
    }));

    logger.log("Successfully listed files", { fileCount: files.length });

    return createResponse(200, {
      bucket: bucketName,
      fileCount: files.length,
      files,
      prefix: params.Prefix || "/",
      isTruncated: data.IsTruncated
    });
  } catch (error) {
    logger.error("Failed to list files", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// Handler: UploadFile (Generate Pre-signed URL)
// ============================================

exports.uploadFile = async (event, context) => {
  const logger = createLogger("UploadFile");

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

    logger.log("Generate pre-signed upload URL", {
      bodyKeys: Object.keys(body)
    });

    const { fileName, contentType } = body;

    if (!fileName) {
      logger.error("Missing fileName parameter");
      return createResponse(400, {
        error: "Bad Request",
        message: "fileName is required"
      });
    }

    const s3 = getS3Client();
    const bucketName = process.env.BUCKET_NAME;
    const expirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY || "3600", 10);

    const key = `uploads/${Date.now()}-${fileName}`;
    const params = {
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || "application/octet-stream"
    };

    const command = new PutObjectCommand(params);
    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: expirySeconds
    });

    logger.log("Generated pre-signed URL", {
      key,
      expirySeconds
    });

    return createResponse(200, {
      uploadUrl,
      bucket: bucketName,
      key,
      expiresIn: expirySeconds,
      instructions: "Use PUT request with the uploadUrl to upload file"
    });
  } catch (error) {
    logger.error("Failed to generate upload URL", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// Handler: GetFile (Download with Pre-signed URL)
// ============================================

exports.getFile = async (event, context) => {
  const logger = createLogger("GetFile");

  try {
    const { key } = event.pathParameters || {};

    logger.log("Generate pre-signed download URL", { key });

    if (!key) {
      logger.error("Missing key parameter");
      return createResponse(400, {
        error: "Bad Request",
        message: "key path parameter is required"
      });
    }

    const s3 = getS3Client();
    const bucketName = process.env.BUCKET_NAME;
    const expirySeconds = parseInt(process.env.SIGNED_URL_EXPIRY || "3600", 10);

    // Verify object exists
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key
      });
      await s3.send(headCommand);
    } catch (headError) {
      if (
        headError.name === "NotFound" ||
        headError.$metadata?.httpStatusCode === 404
      ) {
        logger.error("File not found", { key });
        return createResponse(404, {
          error: "Not Found",
          message: `File not found: ${key}`
        });
      }
      throw headError;
    }

    const params = {
      Bucket: bucketName,
      Key: key
    };

    const command = new GetObjectCommand(params);
    const downloadUrl = await getSignedUrl(s3, command, {
      expiresIn: expirySeconds
    });

    logger.log("Generated download URL", {
      key,
      expirySeconds
    });

    return createResponse(200, {
      downloadUrl,
      bucket: bucketName,
      key,
      expiresIn: expirySeconds,
      instructions: "Use GET request with the downloadUrl to download file"
    });
  } catch (error) {
    logger.error("Failed to generate download URL", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// Handler: DeleteFile
// ============================================

exports.deleteFile = async (event, context) => {
  const logger = createLogger("DeleteFile");

  try {
    const { key } = event.pathParameters || {};

    logger.log("Delete file request", { key });

    if (!key) {
      logger.error("Missing key parameter");
      return createResponse(400, {
        error: "Bad Request",
        message: "key path parameter is required"
      });
    }

    const s3 = getS3Client();
    const bucketName = process.env.BUCKET_NAME;

    // Verify object exists first
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key
      });
      await s3.send(headCommand);
    } catch (headError) {
      if (
        headError.name === "NotFound" ||
        headError.$metadata?.httpStatusCode === 404
      ) {
        logger.error("File not found", { key });
        return createResponse(404, {
          error: "Not Found",
          message: `File not found: ${key}`
        });
      }
      throw headError;
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    await s3.send(command);

    logger.log("File deleted successfully", { key });

    return createResponse(200, {
      message: "File deleted successfully",
      bucket: bucketName,
      key
    });
  } catch (error) {
    logger.error("Failed to delete file", error);
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// Handler: ProcessUpload (S3 Event)
// ============================================

exports.processUpload = async (event, context) => {
  const logger = createLogger("ProcessUpload");

  try {
    logger.log("Processing S3 event", {
      Records: event.Records?.length || 0
    });

    if (!event.Records || event.Records.length === 0) {
      logger.log("No records to process");
      return { statusCode: 200, body: "No records" };
    }

    const s3 = getS3Client();
    const results = [];

    // Process each record
    for (const record of event.Records) {
      const { bucket, object } = record.s3;
      const bucketName = bucket.name;
      const key = decodeURIComponent(object.key.replace(/\+/g, " "));

      logger.log("Processing S3 event", {
        bucket: bucketName,
        key,
        eventName: record.eventName
      });

      try {
        // Get object metadata
        const headCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: key
        });
        const headResponse = await s3.send(headCommand);

        // Read object content (assuming JSON)
        let content = {};
        if (key.endsWith(".json")) {
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
          });
          const getResponse = await s3.send(getCommand);
          const bodyText = await getResponse.Body.transformToString();
          content = JSON.parse(bodyText);
        }

        const result = {
          bucket: bucketName,
          key,
          size: headResponse.ContentLength,
          contentType: headResponse.ContentType,
          lastModified: headResponse.LastModified,
          parsedContent: content,
          processedAt: new Date().toISOString(),
          status: "success"
        };

        results.push(result);
        logger.log("Successfully processed file", {
          key,
          size: headResponse.ContentLength
        });
      } catch (recordError) {
        logger.error("Failed to process record", recordError);
        results.push({
          bucket: bucketName,
          key,
          status: "error",
          error: recordError.message
        });
      }
    }

    logger.log("Processing complete", {
      totalRecords: event.Records.length,
      successCount: results.filter(r => r.status === "success").length
    });

    // Return success (even if some records failed)
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Processing complete",
        results
      })
    };
  } catch (error) {
    logger.error("Handler failed", error);
    // Return success to prevent Lambda from retrying
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: "Processing failed",
        message: error.message
      })
    };
  }
};
