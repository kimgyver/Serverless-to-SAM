# 03 Hello World SAM - Testing Guide

This directory contains automated test suites for the Hello World SAM project.

## Test Files

### 1. `localstack.test.js`

**Purpose**: Local unit tests using LocalStack (Docker-based AWS emulator)

**What it tests**:

- 8 Lambda functions directly (no API Gateway)
- DynamoDB operations (Create, Read, Update, Delete)
- Basic math and string manipulation functions
- Error handling and edge cases

**Requirements**:

- LocalStack running in Docker: `docker-compose up -d`
- LocalStack DynamoDB table must exist
- Environment variables: `ITEMS_TABLE`, `DYNAMODB_ENDPOINT`

**Run**:

```bash
npm run test:localstack
```

**Benefits**:

- ✅ Fast execution (no AWS API calls)
- ✅ No AWS credentials needed
- ✅ Local DynamoDB for testing
- ✅ Tests 15 scenarios (basic functions + DynamoDB CRUD + error cases)

---

### 2. `sam-local.test.js`

**Purpose**: SAM Local integration tests

**What it tests**:

- 8 Lambda functions via SAM Local runtime
- Integration between SAM and actual AWS resources (if configured)
- DynamoDB operations against real or LocalStack
- HTTP event handling

**Requirements**:

- SAM CLI installed (`sam --version`)
- AWS credentials configured
- DynamoDB table accessible (local or AWS)
- Environment file: `.env.json` with AWS region and credentials

**Run**:

```bash
npm run test:sam-local
```

**Benefits**:

- ✅ Tests actual SAM runtime environment
- ✅ Validates Lambda packaging
- ✅ Can test with real AWS resources
- ✅ Closer to production behavior

---

## Running Tests

### Individual Tests

```bash
# LocalStack tests (15 scenarios)
npm run test:localstack

# SAM Local tests (8 functions)
npm run test:sam-local
```

### All Tests

```bash
# Run all test suites
npm run test:all
```

---

## Test Results Summary

### LocalStack Test Output

Tests 3 main groups:

- **Group 1**: Basic functions (7 tests)
  - SayHello, Greet, CreateMessage, Divide with variations
- **Group 2**: DynamoDB CRUD (5 tests)
  - CreateItem, ListItems, UpdateItem, DeleteItem
- **Group 3**: Error handling (3 tests)
  - Missing fields, invalid IDs, edge cases

### SAM Local Test Output

Tests 8 functions:

- 4 basic functions (SayHello, Greet, CreateMessage, Divide)
- 4 DynamoDB functions (CreateItem, ListItems, UpdateItem, DeleteItem)
- Status codes and item counts verification

---

## Troubleshooting

### LocalStack Tests Failing

**Issue**: `Error: DynamoDB table not found`

```bash
# Verify LocalStack is running
docker ps | grep localstack

# Check the table exists
docker exec <localstack-container> awslocal dynamodb list-tables
```

**Issue**: `Error: Connection refused`

```bash
# Ensure docker-compose is running
docker-compose up -d

# Check LocalStack logs
docker-compose logs localstack
```

### SAM Local Tests Failing

**Issue**: `sam: command not found`

```bash
# Install SAM CLI
brew install aws-sam-cli

# Verify installation
sam --version
```

**Issue**: `Error: No such file or directory: .env.json`

```bash
# Create the environment file
cp .env.json.example .env.json

# Add your AWS region and credentials
cat .env.json
```

**Issue**: `sam local invoke: timeout`

```bash
# Increase timeout in sam-local.test.js
# Or check if Docker is properly configured
docker ps
```

---

## Environment Setup

### For LocalStack Testing

1. **Start LocalStack**:

   ```bash
   docker-compose up -d
   ```

2. **Create DynamoDB Table**:

   ```bash
   DYNAMODB_ENDPOINT=http://localhost:4566 AWS_REGION=us-east-1 node setup-localstack.js
   ```

3. **Run Tests**:
   ```bash
   npm run test:localstack
   ```

### For SAM Local Testing

1. **Create `.env.json`**:

   ```json
   {
     "SayHelloFunction": {
       "ITEMS_TABLE": "sam-hello-world-items",
       "DYNAMODB_ENDPOINT": ""
     },
     "GreetFunction": {
       "ITEMS_TABLE": "sam-hello-world-items"
     },
     ...
   }
   ```

2. **Run Tests**:
   ```bash
   npm run test:sam-local
   ```

---

## Expected Test Results

### ✅ All Tests Passing

```
✅ 성공: 15/15 (LocalStack)
✅ 성공: 8/8 (SAM Local)

✨ 모든 테스트 통과! 🎉
```

### ❌ Debugging Failed Tests

- Check AWS credentials
- Verify table names match environment variables
- Review handler functions for runtime errors
- Check CloudFormation template for configuration issues

---

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run LocalStack tests
  run: npm run test:localstack

- name: Run SAM Local tests
  run: npm run test:sam-local
```

---

## Test Metrics

| Test Suite | Count  | Duration    | Coverage                  |
| ---------- | ------ | ----------- | ------------------------- |
| LocalStack | 15     | ~5-10s      | Basic + DynamoDB + Errors |
| SAM Local  | 8      | ~20-30s     | Function execution        |
| **Total**  | **23** | **~30-40s** | Full test coverage        |

---

## Notes

- Tests are independent and can run in any order
- LocalStack tests should run before SAM Local tests if both are used
- Tests clean up after themselves (delete test items)
- Some tests may need adjustment if function logic changes
- Refer to main `README.md` for additional troubleshooting
