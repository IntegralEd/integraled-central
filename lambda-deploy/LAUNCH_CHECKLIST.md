# Lambda MVP Launch Checklist (03/31/2025)

## Initial Setup
- [ ] Verify Node.js version matches Lambda runtime
  ```bash
  node -v  # Should be v18.x
  ```
  - If incorrect: `nvm install 18 && nvm use 18`

- [ ] Install required packages
  ```bash
  npm install node-fetch aws-sdk dotenv
  ```

## Environment Configuration
- [ ] Verify AWS CLI configuration
  ```bash
  aws configure list
  ```
  Expected region: us-east-2

- [ ] Verify API Gateway endpoint
  ```
  https://tixnmh1pe8.execute-api.us-east-2.amazonaws.com/prod/IntegralEd-Main
  ```

## Test Sequence

### Test 1: New User Chat (No Thread ID)
- [ ] Expected behavior: Creates new thread, returns thread_id
- [ ] Payload structure:
  ```json
  {
    "message": "Hello, I'm a new user",
    "User_ID": "test_user_[timestamp]"
  }
  ```
- Debug if fails:
  - Check Lambda logs for OpenAI API errors
  - Verify User_ID format
  - Check thread creation in OpenAI

### Test 2: Form Data Preload
- [ ] Expected behavior: Creates thread with context from form data
- [ ] Payload structure:
  ```json
  {
    "message": "I want to learn about mathematics",
    "User_ID": "test_user_[timestamp]",
    "form_data": {
      "subject": "Mathematics",
      "level": "Beginner",
      "goals": ["Learn basic algebra", "Understand calculus"]
    }
  }
  ```
- Debug if fails:
  - Check form_data parsing in Lambda
  - Verify context building logic
  - Check OpenAI thread creation with metadata

### Test 3: Context-Based Chat
- [ ] Expected behavior: Uses existing thread, maintains context
- [ ] Payload structure:
  ```json
  {
    "message": "Can you help me with algebra?",
    "User_ID": "test_user_[timestamp]",
    "thread_id": "[from_test_2]"
  }
  ```
- Debug if fails:
  - Verify thread_id exists in OpenAI
  - Check message appending logic
  - Monitor context maintenance

### Test 4: Existing Thread Chat
- [ ] Expected behavior: Loads history, continues conversation
- [ ] Payload structure:
  ```json
  {
    "message": "What was our last topic?",
    "User_ID": "test_user_[timestamp]",
    "thread_id": "[from_test_3]",
    "Assistant_ID": "asst_abc123"
  }
  ```
- Debug if fails:
  - Verify Assistant_ID validity
  - Check thread history retrieval
  - Monitor response formatting

## Debug Logging Levels

### Level 1: Basic Request/Response
```javascript
console.log('Request:', {
    method,
    headers,
    body: JSON.stringify(body)
});
console.log('Response:', {
    status,
    headers: Object.fromEntries(response.headers),
    body: await response.json()
});
```

### Level 2: OpenAI Interaction
```javascript
console.log('OpenAI Request:', {
    thread_id,
    assistant_id,
    message
});
console.log('OpenAI Response:', {
    completion,
    usage
});
```

### Level 3: Thread Management
```javascript
console.log('Thread State:', {
    exists: threadExists,
    messages: messageCount,
    lastUpdate: lastMessageTimestamp
});
```

### Level 4: Context Building
```javascript
console.log('Context:', {
    formData,
    preprocessedContext,
    finalPrompt
});
```

## Common Failure Points
1. API Gateway CORS issues
   - Check exposed headers
   - Verify OPTIONS handling
   - Test preflight requests

2. Lambda Timeouts
   - Monitor execution time
   - Check async operations
   - Verify promise handling

3. OpenAI Rate Limits
   - Monitor rate limit headers
   - Implement exponential backoff
   - Check quota usage

4. Thread Management
   - Verify thread creation
   - Check message appending
   - Monitor context length

## Success Criteria
- All 4 tests pass sequentially
- Response times under 10 seconds
- Context maintained between messages
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