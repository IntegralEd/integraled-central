# IntegralEd API Reference

## Event Payloads

### Base Event Structure
All events follow this base structure:
```json
{
  "event_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "source": {
    "url": "string",
    "tenant": "string",
    "preview": "boolean"
  },
  "actor": {
    "type": "user|agent|system",
    "id": "string",
    "metadata": {}
  },
  "context": {
    "session_id": "string",
    "feature": "string",
    "page": "string",
    "metadata": {}
  }
}
```

### Chat Message Event
```json
{
  ...baseEvent,
  "type": "chat_message",
  "data": {
    "message": "string",
    "thread_id": "string?",
    "agent_id": "string?",
    "direction": "inbound|outbound",
    "metadata": {
      "sentiment": "string?",
      "intent": "string?",
      "entities": "array?"
    }
  }
}
```

### Learning Record Store (LRS) Integration
```json
{
  ...baseEvent,
  "type": "learning_record",
  "data": {
    "verb": "string",
    "object": {
      "id": "string",
      "type": "string",
      "definition": {}
    },
    "result": {
      "completion": "boolean?",
      "success": "boolean?",
      "score": "number?",
      "duration": "string?"
    },
    "context": {
      "registration": "string",
      "contextActivities": {},
      "extensions": {}
    }
  }
}
```

### Support Ticket Event
```json
{
  ...baseEvent,
  "type": "support_ticket",
  "data": {
    "ticket_id": "string",
    "status": "new|open|resolved",
    "priority": "low|medium|high",
    "category": "access|content|technical",
    "description": "string",
    "metadata": {
      "browser": "string?",
      "os": "string?",
      "error_code": "string?",
      "attempted_url": "string?"
    }
  }
}
```

## Webhook Endpoints

### Chat Webhook
- URL: `https://hook.us1.make.com/r7d3v4vyohi00s68spr8y5mcsgk7jsbz`
- Method: `POST`
- Expected Response:
```json
{
  "message": "string",
  "thread_id": "string",
  "metadata": {
    "next_steps": "array?",
    "suggested_resources": "array?",
    "confidence_score": "number?"
  }
}
```

## Agent Configuration

### Agent Identity Format
```json
{
  "id": "string",
  "name": "string",
  "role": "string",
  "icon": "url",
  "capabilities": ["array"],
  "context": {
    "domain": "string",
    "location": "string?",
    "specialty": "string?"
  },
  "configuration": {
    "model": "string",
    "temperature": "number",
    "max_tokens": "number"
  }
}
```

### Tenant Configuration Format
```json
{
  "tenant_id": "string",
  "name": "string",
  "domain": "string",
  "branding": {
    "primary_color": "string",
    "logo_url": "string"
  },
  "agents": {
    "primary": "agent_id",
    "support": "agent_id",
    "specialists": ["array"]
  },
  "features": {
    "rag_chat": "boolean",
    "support_chat": "boolean",
    "feedback": "boolean"
  }
}
```

## Learning Management System (LMS) Integration

### Course Structure
```json
{
  "course_id": "string",
  "title": "string",
  "modules": [{
    "id": "string",
    "title": "string",
    "activities": [{
      "id": "string",
      "type": "string",
      "completion_criteria": {},
      "metadata": {}
    }]
  }]
}
```

### Progress Tracking
```json
{
  "user_id": "string",
  "course_id": "string",
  "progress": {
    "started_at": "ISO-8601",
    "completed_at": "ISO-8601?",
    "current_module": "string",
    "completion_percentage": "number",
    "achievements": ["array"]
  }
}
```

## AI Assistant Reference URLs

### Configuration Endpoints
- Agent Definitions: `https://cdn.integral-ed.com/config/agents.json`
- Tenant Configs: `https://cdn.integral-ed.com/config/tenants.json`
- Feature Flags: `https://cdn.integral-ed.com/config/features.json`

### Documentation
- Human Readme: `https://docs.integral-ed.com/readme.html`
- Agent Readme: `https://docs.integral-ed.com/agent-readme.json`
- API Reference: `https://docs.integral-ed.com/api-reference.html`

## Event Logging Standards

### Log Levels
- `DEBUG`: Development-only logging
- `INFO`: Normal operational events
- `WARN`: Unexpected but handled events
- `ERROR`: Application errors requiring attention
- `CRITICAL`: System-wide failures

### Log Format
```json
{
  "timestamp": "ISO-8601",
  "level": "string",
  "event": "string",
  "source": "string",
  "tenant": "string",
  "message": "string",
  "data": {},
  "error": {
    "code": "string?",
    "stack": "string?"
  }
}
```

### Sensitive Data Handling
- Never log PII (Personally Identifiable Information)
- Mask sensitive fields (e.g., "email": "****@domain.com")
- Use reference IDs instead of actual data
- Follow HIPAA compliance for health data 