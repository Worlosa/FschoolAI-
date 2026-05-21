# FschoolAI Backend API Documentation

**Complete API reference for all endpoints.**

---

## Base URL

```
http://localhost:5000
```

## Authentication

All requests (except `/health`) require JWT token in header:

```
Authorization: Bearer <jwt_token>
```

---

## Health Check

### GET /health

Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-21T00:00:00Z",
  "environment": "development",
  "version": "1.0.0"
}
```

---

## Brain System APIs

### POST /api/brain/process

Process user input through the brain.

**Request:**
```json
{
  "userId": "user123",
  "input": "help me study calculus",
  "context": {
    "currentTopic": "derivatives",
    "difficulty": "intermediate"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agentUsed": "study",
    "response": "...",
    "insights": [...],
    "recommendations": [...]
  },
  "requestId": "req-123",
  "timestamp": "2026-05-21T00:00:00Z"
}
```

### POST /api/brain/causal-analysis

Analyze causal relationships in user data.

**Request:**
```json
{
  "userId": "user123",
  "variables": ["focus_level", "sleep_hours", "grades"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "relationships": [
      {
        "cause": "sleep_hours",
        "effect": "focus_level",
        "strength": 0.85,
        "confidence": 0.92
      }
    ],
    "rootCauses": ["sleep_hours", "motivation"]
  }
}
```

### POST /api/brain/predict

Generate predictions about user outcomes.

**Request:**
```json
{
  "userId": "user123",
  "context": {
    "currentPerformance": 0.75,
    "recentTrend": "declining"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "type": "exam_performance",
        "value": 0.68,
        "confidence": 0.81,
        "timeframe": "1 week"
      }
    ]
  }
}
```

### POST /api/brain/intervene

Get intervention recommendations.

**Request:**
```json
{
  "userId": "user123",
  "situation": "student_struggling",
  "severity": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "interventions": [
      {
        "recommendation": "Schedule tutoring session",
        "suggestedAction": "Contact tutor",
        "priority": "high"
      }
    ]
  }
}
```

### GET /api/brain/insights/:userId

Get AI-generated insights about user.

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "learning_pattern",
        "content": "Student learns best with visual examples",
        "confidence": 0.89,
        "actionable": true
      }
    ]
  }
}
```

### GET /api/brain/status?userId=user123

Get current brain status for user.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentFocus": "calculus",
    "emotionalState": "focused",
    "learningVelocity": 0.75,
    "engagementLevel": 0.82
  }
}
```

### POST /api/brain/feedback

Submit feedback to improve brain.

**Request:**
```json
{
  "userId": "user123",
  "feedbackType": "agent_response",
  "content": "The explanation was helpful",
  "context": {
    "agentUsed": "study",
    "topic": "calculus"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback processed"
}
```

---

## Agent APIs

### GET /api/agents

List all available agents.

**Response:**
```json
{
  "agents": [
    {
      "id": "study",
      "name": "Study Agent",
      "description": "Provides personalized learning explanations"
    },
    ...
  ]
}
```

### POST /api/agents/study

Get study explanation.

**Request:**
```json
{
  "userId": "user123",
  "topic": "calculus",
  "currentUnderstanding": "basic",
  "learningStyle": "visual",
  "difficulty": "intermediate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "explanation": "...",
    "examples": [...],
    "resources": [...],
    "nextSteps": [...]
  }
}
```

### POST /api/agents/focus

Manage focus mode.

**Request (Detect):**
```json
{
  "userId": "user123",
  "action": "detect"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "focusLevel": 0.75,
    "distractions": ["notifications", "background_noise"],
    "recommendation": "Enable focus mode"
  }
}
```

**Request (Enable):**
```json
{
  "userId": "user123",
  "action": "enable",
  "duration": 60
}
```

**Response:**
```json
{
  "success": true,
  "message": "Focus mode enabled for 60 minutes"
}
```

### POST /api/agents/motivation

Get motivation boost.

**Request:**
```json
{
  "userId": "user123",
  "context": "struggling_with_assignment"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "You're making great progress...",
    "encouragement": "...",
    "nextMilestone": "..."
  }
}
```

### GET /api/agents/performance?userId=user123

Get performance analysis.

**Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": 0.78,
    "strengths": ["math", "problem_solving"],
    "areasForImprovement": ["writing", "time_management"],
    "trend": "improving"
  }
}
```

### POST /api/agents/problem-solver

Get help solving a problem.

**Request:**
```json
{
  "userId": "user123",
  "problem": "How do I solve this differential equation?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "steps": [...],
    "explanation": "...",
    "commonMistakes": [...],
    "practice": [...]
  }
}
```

### POST /api/agents/synthesis

Connect concepts.

**Request:**
```json
{
  "userId": "user123",
  "concepts": ["derivatives", "integrals", "limits"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connections": [...],
    "synthesis": "...",
    "applications": [...]
  }
}
```

### POST /api/agents/personalization

Get personalized learning path.

**Request:**
```json
{
  "userId": "user123",
  "topic": "calculus"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "learningPath": [...],
    "estimatedTime": "4 weeks",
    "milestones": [...],
    "resources": [...]
  }
}
```

### POST /api/agents/reflection

Consolidate learning.

**Request:**
```json
{
  "userId": "user123",
  "sessionData": {
    "topicsCovered": ["derivatives"],
    "timeSpent": 45,
    "performanceScore": 0.85
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "...",
    "keyTakeaways": [...],
    "nextSession": "..."
  }
}
```

### GET /api/agents/recommendation?userId=user123

Get next learning recommendation.

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendation": "Practice integration problems",
    "reason": "You've mastered derivatives",
    "resources": [...],
    "estimatedTime": "30 minutes"
  }
}
```

### POST /api/agents/escalation

Check if escalation needed.

**Request:**
```json
{
  "userId": "user123",
  "context": "student_very_frustrated"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "escalationNeeded": true,
    "reason": "High frustration level",
    "recommendedAction": "Contact instructor"
  }
}
```

---

## Signal APIs

### POST /api/signals/behavioral

Log behavioral signal.

**Request:**
```json
{
  "userId": "user123",
  "action": "opened_textbook",
  "metadata": {
    "chapter": 5,
    "duration": 30
  },
  "timestamp": "2026-05-21T10:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "id": "sig-123" }
}
```

### POST /api/signals/emotional

Log emotional signal.

**Request:**
```json
{
  "userId": "user123",
  "emotion": "focused",
  "intensity": 0.8,
  "context": "studying_math"
}
```

### POST /api/signals/knowledge

Log knowledge signal.

**Request:**
```json
{
  "userId": "user123",
  "concept": "derivatives",
  "mastery": 0.75,
  "confidence": 0.8
}
```

### POST /api/signals/context

Log context signal.

**Request:**
```json
{
  "userId": "user123",
  "location": "library",
  "device": "laptop",
  "environment": "quiet"
}
```

### POST /api/signals/outcome

Log outcome signal.

**Request:**
```json
{
  "userId": "user123",
  "result": true,
  "score": 0.92,
  "feedback": "Excellent work"
}
```

### POST /api/signals/batch

Batch insert signals.

**Request:**
```json
{
  "signals": [
    {
      "user_id": "user123",
      "type": "behavioral",
      "action": "opened_textbook"
    },
    {
      "user_id": "user123",
      "type": "emotional",
      "emotion": "focused"
    }
  ]
}
```

### GET /api/signals/:userId

Get all signals for user.

**Query Parameters:**
- `limit` (default: 100) - Max results
- `offset` (default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "signals": [...],
    "total": 250
  }
}
```

---

## Canvas Integration APIs

### POST /api/canvas/oauth/authorize

Start Canvas OAuth flow.

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://canvas.instructure.com/oauth/authorize?..."
  }
}
```

### GET /api/canvas/oauth/callback

Canvas OAuth callback (handled automatically).

### POST /api/canvas/sync

Sync Canvas data.

**Request:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coursesSynced": 5,
    "assignmentsSynced": 32,
    "gradesSynced": 128
  }
}
```

### GET /api/canvas/courses?userId=user123

Get synced Canvas courses.

**Response:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "course-123",
        "name": "Calculus I",
        "code": "MATH-101",
        "term": "Spring 2026"
      }
    ]
  }
}
```

### GET /api/canvas/assignments?userId=user123

Get Canvas assignments.

**Response:**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "assign-123",
        "name": "Problem Set 5",
        "dueAt": "2026-05-25T23:59:59Z",
        "pointsPossible": 100
      }
    ]
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "requestId": "req-123",
  "timestamp": "2026-05-21T00:00:00Z"
}
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_ERROR` | 401 | Missing/invalid token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service failed |
| `DATABASE_ERROR` | 500 | Database error |
| `AGENT_ERROR` | 500 | Agent processing error |
| `BRAIN_ERROR` | 500 | Brain system error |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limiting

- **Per user:** 100 requests/minute
- **Per IP:** 1000 requests/minute
- **Response header:** `X-RateLimit-Remaining`

---

## Pagination

Use `limit` and `offset` for pagination:

```
GET /api/signals/user123?limit=50&offset=100
```

---

## Timestamps

All timestamps are ISO 8601 format:
```
2026-05-21T10:30:00Z
```

---

**API Version:** 1.0.0  
**Last Updated:** May 21, 2026
