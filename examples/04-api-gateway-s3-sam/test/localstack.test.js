#!/usr/bin/env node

/**
 * LocalStack 통합 테스트 (AWS SDK v3)
 * S3 API Gateway Lambda 함수들을 LocalStack에서 테스트합니다.
 *
 * 실행 전 준비:
 * 1. docker-compose up -d (LocalStack 시작)
 * 2. npm test
 */

const {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const {
  listFiles,
  uploadFile,
  getFile,
  deleteFile,
  processUpload
} = require("../handlers/s3");

// ============================================
// LocalStack S3 클라이언트 설정
// ============================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-west-2",
  endpoint: process.env.S3_LOCAL_ENDPOINT || "http://localhost:4566",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test"
  }
});

const bucketName = process.env.ITEMS_TABLE || "api-s3-fileupload-local";

// ============================================
// 테스트 유틸리티
// ============================================

const createTestEnv = functionName => ({
  BUCKET_NAME: bucketName,
  BUCKET_REGION: process.env.AWS_REGION || "us-west-2",
  S3_LOCAL_ENDPOINT: process.env.S3_LOCAL_ENDPOINT || "http://localhost:4566",
  STAGE: "local",
  SIGNED_URL_EXPIRY: "3600",
  LOG_LEVEL: "INFO"
});

// 버킷의 모든 파일 삭제
const clearBucket = async () => {
  try {
    const listResult = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucketName })
    );
    if (listResult.Contents && listResult.Contents.length > 0) {
      for (const obj of listResult.Contents) {
        await s3Client.send(
          new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key })
        );
      }
    }
  } catch (error) {
    console.warn(`⚠️ 버킷 정리 중 경고: ${error.message}`);
  }
};

const runTests = async () => {
  console.log("🧪 시작: S3 API Gateway Lambda 통합 테스트 (LocalStack)\n");

  let passCount = 0;
  let failCount = 0;

  const testFn = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passCount++;
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`);
      failCount++;
    }
  };

  // ========================================
  // 0️⃣ LocalStack 준비
  // ========================================
  console.log("📌 그룹 0: LocalStack 준비\n");

  // S3 버킷 생성
  await testFn("S3 버킷 생성", async () => {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    } catch (error) {
      if (
        error.Code === "BucketAlreadyOwnedByYou" ||
        error.Code === "BucketAlreadyExists"
      ) {
        return;
      }
      throw error;
    }
  });

  // 버킷의 기존 파일 정리
  await testFn("버킷 정리 (기존 파일 삭제)", async () => {
    await clearBucket();
  });

  // 환경변수 설정 (모든 함수용)
  Object.assign(process.env, createTestEnv(""));

  // ========================================
  // 1️⃣ ListFiles 테스트
  // ========================================
  console.log("\n📌 그룹 1: ListFiles 테스트\n");

  await testFn("ListFiles - 빈 버킷", async () => {
    const event = {
      requestContext: { http: { method: "GET", path: "/files" } },
      queryStringParameters: null,
      headers: {}
    };
    const result = await listFiles(event);
    const body = JSON.parse(result.body);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
    if (!Array.isArray(body.files)) {
      throw new Error("Files should be an array");
    }
    if (body.fileCount !== 0) {
      throw new Error(`Expected 0 files, got ${body.fileCount}`);
    }
  });

  // ========================================
  // 2️⃣ UploadFile 테스트
  // ========================================
  console.log("\n📌 그룹 2: UploadFile (Pre-signed URL) 테스트\n");

  let uploadUrl = null;
  let uploadedKey = null;

  await testFn("UploadFile - Pre-signed URL 생성", async () => {
    const event = {
      requestContext: { http: { method: "POST", path: "/files/upload" } },
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: "test-file.txt",
        contentType: "text/plain"
      })
    };
    const result = await uploadFile(event);
    const body = JSON.parse(result.body);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
    if (!body.uploadUrl) {
      throw new Error("Missing uploadUrl");
    }
    if (!body.key) {
      throw new Error("Missing key");
    }

    uploadUrl = body.uploadUrl;
    uploadedKey = body.key;
  });

  await testFn("UploadFile - fileName 없음", async () => {
    const event = {
      requestContext: { http: { method: "POST", path: "/files/upload" } },
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    };
    const result = await uploadFile(event);

    if (result.statusCode !== 400) {
      throw new Error(`Expected 400, got ${result.statusCode}`);
    }
  });

  // ========================================
  // 3️⃣ 파일 업로드
  // ========================================
  console.log("\n📌 그룹 3: 파일 업로드\n");

  await testFn("S3에 테스트 파일 업로드", async () => {
    if (!uploadedKey) {
      throw new Error("No uploadedKey available");
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uploadedKey,
        Body: "This is a test file content",
        ContentType: "text/plain"
      })
    );
  });

  // ========================================
  // 4️⃣ ListFiles - 파일 업로드 후
  // ========================================
  console.log("\n📌 그룹 4: 파일 업로드 후 ListFiles\n");

  await testFn("ListFiles - 파일 조회", async () => {
    const event = {
      requestContext: { http: { method: "GET", path: "/files" } },
      queryStringParameters: null,
      headers: {}
    };
    const result = await listFiles(event);
    const body = JSON.parse(result.body);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
    if (body.fileCount !== 1) {
      throw new Error(`Expected 1 file, got ${body.fileCount}`);
    }
    if (!body.files[0].key) {
      throw new Error("File should have a key");
    }
  });

  await testFn("ListFiles - prefix 파라미터", async () => {
    const event = {
      requestContext: {
        http: { method: "GET", path: "/files?prefix=uploads" }
      },
      queryStringParameters: { prefix: "uploads" },
      headers: {}
    };
    const result = await listFiles(event);
    const body = JSON.parse(result.body);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
  });

  // ========================================
  // 5️⃣ GetFile 테스트
  // ========================================
  console.log("\n📌 그룹 5: GetFile (Download Pre-signed URL) 테스트\n");

  await testFn("GetFile - Pre-signed URL 생성", async () => {
    if (!uploadedKey) {
      throw new Error("No uploaded key available");
    }

    const event = {
      requestContext: {
        http: {
          method: "GET",
          path: `/files/${encodeURIComponent(uploadedKey)}`
        }
      },
      pathParameters: { key: uploadedKey },
      headers: {}
    };
    const result = await getFile(event);
    const body = JSON.parse(result.body);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
    if (!body.downloadUrl) {
      throw new Error("Missing downloadUrl");
    }
  });

  await testFn("GetFile - key 없음", async () => {
    const event = {
      requestContext: { http: { method: "GET", path: "/files/" } },
      pathParameters: { key: "" },
      headers: {}
    };
    const result = await getFile(event);

    if (result.statusCode !== 400) {
      throw new Error(`Expected 400, got ${result.statusCode}`);
    }
  });

  await testFn("GetFile - 존재하지 않는 파일", async () => {
    const event = {
      requestContext: {
        http: { method: "GET", path: "/files/nonexistent.txt" }
      },
      pathParameters: { key: "nonexistent.txt" },
      headers: {}
    };
    const result = await getFile(event);

    if (result.statusCode !== 404) {
      throw new Error(`Expected 404, got ${result.statusCode}`);
    }
  });

  // ========================================
  // 6️⃣ DeleteFile 테스트
  // ========================================
  console.log("\n📌 그룹 6: DeleteFile 테스트\n");

  await testFn("DeleteFile - 정상 삭제", async () => {
    if (!uploadedKey) {
      throw new Error("No uploaded key available");
    }

    const event = {
      requestContext: {
        http: {
          method: "DELETE",
          path: `/files/${encodeURIComponent(uploadedKey)}`
        }
      },
      pathParameters: { key: uploadedKey },
      headers: {}
    };
    const result = await deleteFile(event);
    const body = JSON.parse(result.body);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
    if (!body.message.includes("deleted")) {
      throw new Error("Message should indicate deletion");
    }
  });

  await testFn("DeleteFile - key 없음", async () => {
    const event = {
      requestContext: { http: { method: "DELETE", path: "/files/" } },
      pathParameters: { key: "" },
      headers: {}
    };
    const result = await deleteFile(event);

    if (result.statusCode !== 400) {
      throw new Error(`Expected 400, got ${result.statusCode}`);
    }
  });

  // ========================================
  // 7️⃣ ProcessUpload S3 이벤트 테스트
  // ========================================
  console.log("\n📌 그룹 7: ProcessUpload (S3 Event) 테스트\n");

  await testFn("ProcessUpload - S3 이벤트 처리", async () => {
    const testKey = `uploads/${Date.now()}-test.json`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: JSON.stringify({ test: "data" }),
        ContentType: "application/json"
      })
    );

    const event = {
      Records: [
        {
          eventName: "ObjectCreated:Put",
          s3: {
            bucket: { name: bucketName },
            object: { key: testKey }
          }
        }
      ]
    };

    const result = await processUpload(event);
    const body = JSON.parse(result.body);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
    if (!Array.isArray(body.results)) {
      throw new Error("Results should be an array");
    }
  });

  await testFn("ProcessUpload - 빈 이벤트", async () => {
    const event = { Records: [] };
    const result = await processUpload(event);

    if (result.statusCode !== 200) {
      throw new Error(`Expected 200, got ${result.statusCode}`);
    }
  });

  // ========================================
  // 최종 결과
  // ========================================
  console.log("\n" + "=".repeat(50));
  console.log(`📊 테스트 결과: ${passCount}개 통과, ${failCount}개 실패`);
  console.log("=".repeat(50));

  if (failCount === 0) {
    console.log("✨ 모든 테스트 통과!");
    process.exit(0);
  } else {
    console.log("⚠️ 실패한 테스트가 있습니다.");
    process.exit(1);
  }
};

// 테스트 실행
runTests().catch(error => {
  console.error("❌ 테스트 실행 중 오류:", error);
  process.exit(1);
});
