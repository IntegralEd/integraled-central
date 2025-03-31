# Lambda MVP Launch Checklist (03/31/2025)

## Architectural Principles
- [x] No new tools/tech - stick to existing proven stack
- [x] Clear consistent comments - document decisions and rationale
- [x] Assume deliberate architecture - respect existing 300+ hours of work
- [x] Efficient decision making process:
  1. AI proposes best options based on rules/values
  2. Internal CTO review using MDC (Minimum Decision Criteria)
  3. Present aligned paths for execution
  4. Get user approval on final decisions

### Webhook Architecture
- Webhooks are ONLY for async operations (GET/POST)
- Preflight, streaming, and assistant options MUST be handled in Lambda
- This architecture enables:
  - More assistant options beyond GET/POST
  - Traditional HTTPS for data capture
  - Better performance for chat operations

## Initial Setup
- [x] Verify Node.js version matches Lambda runtime
  ```bash
  node -v  # Should be v18.x
  ```
  - If incorrect: `nvm install 18 && nvm use 18`

- [x] Install required packages
  ```bash
  npm install node-fetch aws-sdk dotenv
  ```

## Environment Configuration
- [x] Verify AWS CLI configuration
  ```bash
  aws configure list
  ```
  Expected region: us-east-2

- [x] Verify API Gateway endpoint
  ```
  https://tixnmh1pe8.execute-api.us-east-2.amazonaws.com/prod/IntegralEd-Main
  ```

## Test Sequence

### Core Lambda Functionality
- [ ] Preflight Handling
  - Verify CORS headers
  - Check OPTIONS method
  - Validate response format

- [ ] Assistant Routing
  - Verify direct assistant connection
  - Check streaming response
  - Validate thread management

### Async Operations
- [ ] Airtable Integration
  - Verify data capture
  - Check error handling
  - Validate async timing

- [ ] Documentation Storage
  - Verify storage process
  - Check metadata handling
  - Validate async timing

## Debug Logging Levels

### Level 1: Core Functionality
```javascript
console.log('Lambda Request:', {
    method,
    headers,
    body: JSON.stringify(body)
});
console.log('Lambda Response:', {
    status,
    headers: Object.fromEntries(response.headers),
    body: await response.json()
});
```

### Level 2: Assistant Interaction
```javascript
console.log('Assistant Request:', {
    thread_id,
    assistant_id,
    message
});
console.log('Assistant Response:', {
    completion,
    usage
});
```

### Level 3: Async Operations
```javascript
console.log('Async Operation:', {
    type,
    status,
    timing
});
```

## Common Failure Points
1. Lambda Timeouts
   - Monitor execution time
   - Check async operations
   - Verify promise handling

2. Assistant Connection
   - Verify credentials
   - Check rate limits
   - Monitor response times

3. Async Operations
   - Verify webhook URLs
   - Check payload format
   - Monitor success rates

## Success Criteria
- Core functionality tests pass
- Async operations complete successfully
- Response times under 10 seconds
- Error handling graceful and informative

## Monitoring Setup
- [ ] CloudWatch Logs enabled
- [ ] API Gateway metrics visible
- [ ] Lambda concurrent execution monitored
- [ ] Error rate alerting configured

## Rollback Plan
- Save current Lambda version ARN
- Keep previous API Gateway stage
- Document reversion commands:
  ```bash
  aws lambda update-alias --function-name IntegralEd-Main --name prod --function-version [PREVIOUS_VERSION]
  ``` 

## Git Workflow Protocol
- [ ] Before each commit:
  1. Zip Lambda changes: `./scripts/zip-lambda.sh`
  2. Save current Lambda version ARN
  3. Update test results in commit message

- [ ] Commit message format:
  ```
  test: [test-name] - [result]
  - [key observation]
  - [rollback ARN]
  ```

- [ ] After commit:
  1. Push to main branch
  2. Tag with version number
  3. Document rollback command

- [ ] Rollback procedure:
  1. Use saved Lambda version ARN
  2. Execute rollback command:
     ```bash
     aws lambda update-alias --function-name IntegralEd-Main --name prod --function-version [PREVIOUS_VERSION]
     ```
  3. Verify rollback in AWS Console 