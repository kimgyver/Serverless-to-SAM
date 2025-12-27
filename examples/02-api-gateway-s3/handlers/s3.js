// handlers/s3.js - S3와 API Gateway 통합

const AWS = require("aws-sdk");

// S3 클라이언트 초기화
const s3 = new AWS.S3({
  region: process.env.BUCKET_REGION
});

const bucketName = process.env.BUCKET_NAME;

// 🔴 유틸
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

const log = (level, message, data = {}) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    })
  );
};

// ============================================
// 1️⃣ S3 버킷의 파일 목록 조회
// ============================================
exports.listFilesHandler = async (event, context) => {
  log("INFO", "listFiles called", {
    bucket: bucketName
  });

  try {
    const params = {
      Bucket: bucketName,
      MaxKeys: 100
    };

    // 쿼리 파라미터로 prefix 지정 가능
    // GET /files?prefix=uploads/
    if (event.queryStringParameters?.prefix) {
      params.Prefix = event.queryStringParameters.prefix;
    }

    const data = await s3.listObjectsV2(params).promise();

    return createResponse(200, {
      bucket: bucketName,
      files: (data.Contents || []).map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag
      })),
      count: data.Contents?.length || 0
    });
  } catch (error) {
    log("ERROR", "Error in listFilesHandler", { error: error.message });
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// 2️⃣ Pre-signed URL 생성 (업로드)
// ============================================
exports.uploadFileHandler = async (event, context) => {
  log("INFO", "uploadFile called");

  try {
    let body;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      body = event.body;
    }

    const { fileName, contentType, expirationTime } = body;

    if (!fileName) {
      return createResponse(400, {
        error: "Bad Request",
        message: "fileName is required"
      });
    }

    const params = {
      Bucket: bucketName,
      Key: `uploads/${Date.now()}-${fileName}`, // 시간 추가로 중복 방지
      ContentType: contentType || "application/octet-stream",
      Expires: expirationTime || 3600 // 기본 1시간
    };

    // Pre-signed URL 생성
    const uploadUrl = s3.getSignedUrl("putObject", params);

    return createResponse(200, {
      uploadUrl,
      expires: params.Expires,
      bucket: bucketName,
      key: params.Key
    });
  } catch (error) {
    log("ERROR", "Error in uploadFileHandler", { error: error.message });
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// 3️⃣ Pre-signed URL 생성 (다운로드)
// ============================================
exports.getFileHandler = async (event, context) => {
  log("INFO", "getFile called", {
    filename: event.pathParameters.filename
  });

  try {
    let { filename } = event.pathParameters;

    // URL 디코딩
    filename = decodeURIComponent(filename);

    if (!filename) {
      return createResponse(400, {
        error: "Bad Request",
        message: "filename is required"
      });
    }

    // 파일 존재 확인
    try {
      await s3
        .headObject({
          Bucket: bucketName,
          Key: filename
        })
        .promise();
    } catch (error) {
      if (error.code === "NotFound") {
        return createResponse(404, {
          error: "Not Found",
          message: `File not found: ${filename}`
        });
      }
      throw error;
    }

    // Pre-signed URL 생성 (다운로드용)
    const params = {
      Bucket: bucketName,
      Key: filename,
      Expires: 3600 // 1시간
    };

    const downloadUrl = s3.getSignedUrl("getObject", params);

    return createResponse(200, {
      downloadUrl,
      expires: params.Expires,
      bucket: bucketName,
      key: filename
    });
  } catch (error) {
    log("ERROR", "Error in getFileHandler", { error: error.message });
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// 4️⃣ S3 파일 삭제
// ============================================
exports.deleteFileHandler = async (event, context) => {
  log("INFO", "deleteFile called", {
    filename: event.pathParameters.filename
  });

  try {
    let { filename } = event.pathParameters;

    // URL 디코딩
    filename = decodeURIComponent(filename);

    if (!filename) {
      return createResponse(400, {
        error: "Bad Request",
        message: "filename is required"
      });
    }

    // 파일 삭제
    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: filename
      })
      .promise();

    return createResponse(200, {
      message: "File deleted successfully",
      bucket: bucketName,
      key: filename
    });
  } catch (error) {
    log("ERROR", "Error in deleteFileHandler", { error: error.message });
    return createResponse(500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
};

// ============================================
// 5️⃣ S3 이벤트 트리거
// ============================================
// 이 함수는 S3 업로드 이벤트로 자동 호출됨
// serverless.yml의 functions.processUpload.events.s3 부분 참고
exports.processUploadHandler = async (event, context) => {
  log("INFO", "processUpload triggered by S3 event", {
    eventCount: event.Records?.length || 0
  });

  try {
    // S3에서 보내는 이벤트는 배열 형식
    const records = event.Records || [];

    const results = await Promise.all(
      records.map(async record => {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(
          record.s3.object.key.replace(/\+/g, " ")
        );
        const eventName = record.eventName;

        log("INFO", "Processing S3 event", {
          bucket,
          key,
          eventName
        });

        // 파일 크기 확인
        const headObject = await s3
          .headObject({
            Bucket: bucket,
            Key: key
          })
          .promise();

        // 여기서 비즈니스 로직 수행
        // 예: JSON 파일 파싱, 데이터 검증, DB 저장 등

        return {
          status: "success",
          bucket,
          key,
          size: headObject.ContentLength,
          processedAt: new Date().toISOString()
        };
      })
    );

    log("INFO", "processUpload completed", {
      processedCount: results.length
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Files processed successfully",
        results
      })
    };
  } catch (error) {
    log("ERROR", "Error in processUploadHandler", { error: error.message });
    throw error; // Lambda가 자동으로 재시도하도록
  }
};

// ============================================
// 5️⃣ S3 이벤트: 파일 삭제 감지
// ============================================
exports.processDeleteHandler = async (event, context) => {
  log("INFO", "processDelete called", {
    eventSource: event.Records?.[0]?.eventSource,
    eventName: event.Records?.[0]?.eventName
  });

  try {
    // S3 이벤트에서 삭제된 파일 정보 추출
    const results = await Promise.all(
      event.Records.map(async record => {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(
          record.s3.object.key.replace(/\+/g, " ")
        );

        log("INFO", `File deleted from S3: ${key}`, {
          bucket,
          key,
          eventTime: record.eventTime
        });

        // 여기서 삭제 후 처리 로직 수행
        // 예: 데이터베이스 레코드 삭제, 캐시 무효화, 알림 전송 등

        return {
          status: "deleted",
          bucket,
          key,
          deletedAt: new Date().toISOString()
        };
      })
    );

    log("INFO", "processDelete completed", {
      deletedCount: results.length
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Deleted files processed successfully",
        results
      })
    };
  } catch (error) {
    log("ERROR", "Error in processDeleteHandler", { error: error.message });
    throw error;
  }
};
