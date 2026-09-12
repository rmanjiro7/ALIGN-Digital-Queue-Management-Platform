# ALIGN BACKEND — ERROR HANDLING

**Version:** 1.0
**Last Updated:** 2026-09-05
**Status:** PLANNED — Not yet implemented

---

## Strategy

Centralized exception handling via `@ControllerAdvice` (`GlobalExceptionHandler`).
All exceptions are caught, mapped to appropriate HTTP status codes, and serialized as a consistent JSON error response.

---

## Error Response Format

```json
{
  "success": false,
  "message": "Human-readable description",
  "code": "DOMAIN_ERROR_CODE",
  "errors": [
    { "field": "fieldName", "message": "validation message", "rejectedValue": "..." }
  ]
}
```

- `errors` array is empty for non-validation errors
- `errors` array contains one entry per invalid field for validation failures
- Stack traces are NEVER included in responses

---

## Domain Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `TOKEN_INVALID_STATE` | Attempted state transition not allowed by state machine |
| 400 | `COUNTER_MISMATCH` | Recall attempted from wrong counter |
| 400 | `STEP_AWAY_ALREADY_USED` | Token already used step-away grace period |
| 401 | `INVALID_CREDENTIALS` | Email/password mismatch |
| 401 | `TOKEN_EXPIRED` | JWT or refresh token has expired |
| 401 | `TOKEN_INVALID` | JWT signature invalid or malformed |
| 401 | `UNAUTHORIZED` | No token provided on protected endpoint |
| 403 | `RESOURCE_FORBIDDEN` | Valid auth, accessing another org's resource |
| 403 | `INSUFFICIENT_PERMISSIONS` | Role lacks required permission |
| 404 | `TOKEN_NOT_FOUND` | Token ID does not exist |
| 404 | `QUEUE_NOT_FOUND` | Queue for service does not exist |
| 404 | `LOCATION_NOT_FOUND` | Location ID does not exist |
| 404 | `ORGANIZATION_NOT_FOUND` | Organization ID does not exist |
| 404 | `COUNTER_NOT_FOUND` | Counter ID does not exist |
| 404 | `NO_WAITING_TOKENS` | Queue has no tokens in WAITING state |
| 409 | `QUEUE_FULL` | Active token count >= max_capacity |
| 409 | `QUEUE_PAUSED` | Queue status is PAUSED or CLOSED |
| 409 | `COUNTER_NOT_AVAILABLE` | Counter availability != ONLINE |
| 409 | `COUNTER_ALREADY_SERVING` | Counter already has a token assigned |
| 409 | `EMAIL_ALREADY_EXISTS` | Duplicate email on user creation |
| 409 | `CODE_ALREADY_EXISTS` | Duplicate organization code |
| 422 | `VALIDATION_ERROR` | Jakarta Bean Validation failure |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## Exception Class Hierarchy

```
AlignException (base, RuntimeException)
├── ResourceNotFoundException (404)
│   ├── TokenNotFoundException
│   ├── QueueNotFoundException
│   ├── LocationNotFoundException
│   ├── OrganizationNotFoundException
│   └── CounterNotFoundException
├── BusinessException (400/409)
│   ├── InvalidTokenStateException (400)
│   ├── QueueFullException (409)
│   ├── QueuePausedException (409)
│   ├── CounterNotAvailableException (409)
│   ├── CounterAlreadyServingException (409)
│   ├── NoWaitingTokensException (404)
│   └── StepAwayAlreadyUsedException (400)
└── SecurityException (401/403)
    ├── InvalidCredentialsException (401)
    ├── TokenExpiredException (401)
    └── UnauthorizedTenantAccessException (403)
```

---

## GlobalExceptionHandler Mappings

| Exception | HTTP | Code |
|-----------|------|------|
| `ResourceNotFoundException` | 404 | `{entity}_NOT_FOUND` |
| `InvalidTokenStateException` | 400 | `TOKEN_INVALID_STATE` |
| `QueueFullException` | 409 | `QUEUE_FULL` |
| `QueuePausedException` | 409 | `QUEUE_PAUSED` |
| `CounterNotAvailableException` | 409 | `COUNTER_NOT_AVAILABLE` |
| `CounterAlreadyServingException` | 409 | `COUNTER_ALREADY_SERVING` |
| `InvalidCredentialsException` | 401 | `INVALID_CREDENTIALS` |
| `UnauthorizedTenantAccessException` | 403 | `RESOURCE_FORBIDDEN` |
| `MethodArgumentNotValidException` | 422 | `VALIDATION_ERROR` |
| `DataIntegrityViolationException` | 409 | context-dependent |
| `Exception` (catch-all) | 500 | `INTERNAL_SERVER_ERROR` |

---

## What Is Never Exposed

- Stack traces
- SQL exception messages
- Internal class names (e.g., `com.align.qms.service.TokenService`)
- Database column names
- Hibernate/JPA error details
- JWT secret values
- Any password or credential value

---

**Last Updated:** 2026-09-05
**Next Review:** After Phase 0 (GlobalExceptionHandler implementation)
