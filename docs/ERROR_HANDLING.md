# ALIGN Platform — Error Handling & Validation Specification

**Version:** 2.0 (Phase 8 Verified)  
**Status:** FULLY IMPLEMENTED AND VERIFIED ✅  

---

## 1. Centralized Exception Strategy

All errors in ALIGN are handled uniformly at the HTTP boundary via Spring's `@RestControllerAdvice` (`GlobalExceptionHandler.java`). 
- **Uniform Response Structure:** Every error returns a standardized JSON payload regardless of origin (Spring Security, Bean Validation, Business Exception, or Infrastructure Failure).
- **Security & PII Sanitization:** Internal stack traces, raw SQL queries, and sensitive data are strictly omitted from responses.
- **RFC 7807 Alignment:** Responses feature machine-readable domain error codes (`code`), human-readable descriptions (`message`), HTTP status (`status`), and field-specific validation errors (`errors`).

```json
{
  "success": false,
  "timestamp": "2026-10-13T08:21:17.711Z",
  "status": 400,
  "message": "Human-readable description",
  "code": "DOMAIN_ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation message explaining constraint violation"
    }
  ]
}
```

---

## 2. Domain Error Code Registry

| HTTP Status | Domain Error Code | Description / Trigger Scenario |
| :--- | :--- | :--- |
| **400 Bad Request** | `TOKEN_INVALID_STATE` | Attempted state transition disallowed by state machine (e.g. `COMPLETED` → `WAITING`). |
| **400 Bad Request** | `LOCATION_CLOSED` | Customer attempted to join outside configured location operating hours. |
| **400 Bad Request** | `COUNTER_MISMATCH` | Action attempted from a counter other than the assigned counter. |
| **400 Bad Request** | `STEP_AWAY_ALREADY_USED` | Token has already consumed its one-time 15-minute grace period. |
| **401 Unauthorized** | `INVALID_CREDENTIALS` | Incorrect username, email, or password provided. |
| **401 Unauthorized** | `TOKEN_EXPIRED` | JWT access token or refresh token has exceeded its TTL. |
| **401 Unauthorized** | `TOKEN_INVALID` | JWT signature is invalid or token is malformed. |
| **401 Unauthorized** | `UNAUTHORIZED` | Protected endpoint accessed without an `Authorization: Bearer` header. |
| **403 Forbidden** | `RESOURCE_FORBIDDEN` | Authenticated user attempted to access or modify resources belonging to another organization. |
| **403 Forbidden** | `INSUFFICIENT_PERMISSIONS` | Authenticated user's role lacks the necessary `@PreAuthorize` authority. |
| **404 Not Found** | `TOKEN_NOT_FOUND` | Specified token UUID does not exist. |
| **404 Not Found** | `QUEUE_NOT_FOUND` | Specified queue UUID or queue for service does not exist. |
| **404 Not Found** | `LOCATION_NOT_FOUND` | Specified location UUID does not exist. |
| **404 Not Found** | `ORGANIZATION_NOT_FOUND` | Specified organization UUID does not exist. |
| **404 Not Found** | `COUNTER_NOT_FOUND` | Specified counter UUID does not exist. |
| **404 Not Found** | `NO_WAITING_TOKENS` | Queue has zero tokens in `WAITING` state when staff calls next. |
| **409 Conflict** | `QUEUE_FULL` | Active tokens reached or exceeded `max_capacity`. |
| **409 Conflict** | `QUEUE_PAUSED` | Queue is currently paused or closed. |
| **409 Conflict** | `COUNTER_ALREADY_SERVING`| Counter currently has an active, uncompleted token assigned. |
| **409 Conflict** | `COUNTER_NOT_AVAILABLE` | Counter availability status is not `ONLINE`. |
| **409 Conflict** | `EMAIL_ALREADY_EXISTS` | User registration attempted with an already registered email. |
| **409 Conflict** | `CODE_ALREADY_EXISTS` | Organization code collision. |
| **422 Unprocessable** | `VALIDATION_ERROR` | Jakarta Bean Validation failure on request body fields. |
| **500 Internal Error** | `INTERNAL_SERVER_ERROR` | Unhandled system exception or runtime failure. |

---

## 3. Input Validation Specifications (Jakarta Bean Validation)

Untrusted client inputs are strictly validated at the controller boundary using `@Valid`.

### 3.1 Authentication DTOs
- **`LoginRequest`:**
  - `email`: `@NotBlank`, `@Email`
  - `password`: `@NotBlank`, `@Size(min=1, max=100)`
- **`RefreshTokenRequest`:**
  - `refreshToken`: `@NotBlank`

### 3.2 Token DTOs
- **`TokenJoinRequest`:**
  - `orgId`: `@NotNull`, valid UUID
  - `locationId`: `@NotNull`, valid UUID
  - `serviceId`: `@NotNull`, valid UUID
  - `customerName`: `@Size(max=255)` (Optional)
  - `customerPhone`: `@Pattern(regexp = "^\\+?[1-9]\\d{1,14}$")` (E.164 phone format, Optional)
  - `smsConsent`: `@NotNull` boolean
  - `idempotencyKey`: `@Size(max=100)` (Optional)

### 3.3 Location DTOs
- **`CreateLocationRequest` / `UpdateLocationRequest`:**
  - `name`: `@NotBlank`, `@Size(max=255)`
  - `address`: `@Size(max=1000)`
  - `city`: `@Size(max=100)`
  - `timezone`: `@NotBlank` (Valid IANA timezone, defaults to `UTC`)
  - `enforceSchedule`: `@NotNull` boolean

### 3.4 Service DTOs
- **`CreateServiceRequest` / `UpdateServiceRequest`:**
  - `name`: `@NotBlank`, `@Size(max=255)`
  - `description`: `@Size(max=2000)`
  - `enabled`: `@NotNull` boolean
  - `isFastTrack`: `@NotNull` boolean

### 3.5 Queue DTOs
- **`CreateQueueRequest` / `UpdateQueueRequest`:**
  - `name`: `@NotBlank`, `@Size(max=255)`
  - `tokenPrefix`: `@NotBlank`, `@Size(min=1, max=5)`, uppercase alphanumeric
  - `maxCapacity`: `@Min(1)`, `@Max(10000)`
  - `autoPauseAtCapacity`: `@NotNull` boolean
