# ALIGN BACKEND — API CONTRACT

**Version:** 1.1
**Last Updated:** 2026-09-07
**Base Path:** `/api/v1`
**Status:** Phase 1 auth endpoints IMPLEMENTED AND VALIDATED ✅

> Auth endpoints are live. All other endpoints are planned for later phases.

---

## Conventions

- All responses are JSON
- All IDs are UUID v4
- All timestamps are ISO-8601 UTC strings
- Authentication: `Authorization: Bearer <accessToken>` header
- Pagination: `?page=0&size=20` (Spring Data defaults)

**Standard success wrapper (where used):**
```json
{ "success": true, "data": { ... } }
```

**Standard error format:**
```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "DOMAIN_ERROR_CODE",
  "errors": [
    { "field": "fieldName", "message": "why invalid" }
  ]
}
```

---

## Authentication

### POST /api/v1/auth/login
**Auth:** None
**Request:**
```json
{ "email": "string", "password": "string" }
```
**Response 200:**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 900,
  "user": { "id": "uuid", "name": "string", "email": "string", "role": "STAFF", "orgId": "uuid", "locationId": "uuid" }
}
```
**Errors:** 401 `INVALID_CREDENTIALS`, 422 `VALIDATION_ERROR`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/auth/refresh
**Auth:** None
**Request:** `{ "refreshToken": "string" }`
**Response 200:** `{ "accessToken": "string", "expiresIn": 900 }`
**Errors:** 401 `TOKEN_EXPIRED`, 401 `TOKEN_INVALID`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/auth/logout
**Auth:** Required (any role)
**Request:** None
**Response 204:** No content
**Status:** NOT IMPLEMENTED

---

### GET /api/v1/auth/me
**Auth:** Required (any role)
**Response 200:** `{ "id": "uuid", "name": "string", "email": "string", "role": "string", "orgId": "uuid", "locationId": "uuid" }`
**Errors:** 401 `UNAUTHORIZED`
**Status:** NOT IMPLEMENTED

---

## Tenants / Organizations (Platform Admin)

### GET /api/v1/tenants
**Auth:** PLATFORM_ADMIN
**Response 200:** `{ "content": [TenantResponse], "totalElements": n, ... }`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/tenants
**Auth:** PLATFORM_ADMIN
**Request:** `{ "name": "string", "code": "string", "sector": "string", "contactEmail": "string" }`
**Response 201:** `TenantResponse`
**Errors:** 409 `CODE_ALREADY_EXISTS`, 422 `VALIDATION_ERROR`
**Status:** NOT IMPLEMENTED

---

### GET /api/v1/tenants/{orgId}
**Auth:** PLATFORM_ADMIN
**Response 200:** `TenantResponse`
**Errors:** 404 `ORGANIZATION_NOT_FOUND`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/tenants/{orgId}
**Auth:** PLATFORM_ADMIN
**Response 200:** `TenantResponse`
**Status:** NOT IMPLEMENTED

---

## Locations

### GET /api/v1/locations?orgId={orgId}
**Auth:** ORG_ADMIN (own org), PLATFORM_ADMIN (any org)
**Response 200:** `[LocationResponse]`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/locations
**Auth:** ORG_ADMIN, PLATFORM_ADMIN
**Request:** `{ "orgId": "uuid", "name": "string", "address": "string", "city": "string", "operatingHours": "string", "isHQ": false }`
**Response 201:** `LocationResponse`
**Status:** NOT IMPLEMENTED

---

### GET /api/v1/locations/{locationId}
**Auth:** ORG_ADMIN (own org), PLATFORM_ADMIN
**Response 200:** `LocationResponse`
**Errors:** 404 `LOCATION_NOT_FOUND`, 403 `RESOURCE_FORBIDDEN`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/locations/{locationId}
**Auth:** ORG_ADMIN (own org)
**Response 200:** `LocationResponse`
**Status:** NOT IMPLEMENTED

---

## Services

### GET /api/v1/services?locationId={locationId}
**Auth:** Public (for customer discovery) or authenticated
**Response 200:** `[ServiceResponse]` — includes `waitingCount`, `estWaitMins`, `estWaitRange`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/services
**Auth:** ORG_ADMIN
**Request:** `{ "locationId": "uuid", "name": "string", "description": "string", "isFastTrack": false }`
**Response 201:** `ServiceResponse`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/services/{serviceId}
**Auth:** ORG_ADMIN (own org)
**Response 200:** `ServiceResponse`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/services/{serviceId}/status
**Auth:** ORG_ADMIN
**Request:** `{ "enabled": true|false }`
**Response 200:** `ServiceResponse`
**Status:** NOT IMPLEMENTED

---

## Queues

### GET /api/v1/queues/{queueId}
**Auth:** ORG_ADMIN (own org), PLATFORM_ADMIN
**Response 200:** `QueueResponse`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/queues/{queueId}/status
**Auth:** ORG_ADMIN, STAFF (own location)
**Request:** `{ "status": "ACTIVE|PAUSED|CLOSED" }`
**Response 200:** `QueueResponse`
**Errors:** 404 `QUEUE_NOT_FOUND`, 403 `RESOURCE_FORBIDDEN`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/queues/{queueId}/config
**Auth:** ORG_ADMIN
**Request:** `{ "maxCapacity": 100, "autoPauseAtCapacity": false, "tokenPrefix": "A" }`
**Response 200:** `QueueResponse`
**Status:** NOT IMPLEMENTED

---

## Counters

### GET /api/v1/counters?locationId={locationId}
**Auth:** STAFF, ORG_ADMIN (own org)
**Response 200:** `[CounterResponse]`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/counters/{counterId}/availability
**Auth:** STAFF (own counter), ORG_ADMIN
**Request:** `{ "availability": "ONLINE|ON_BREAK|AWAY|OFFLINE" }`
**Response 200:** `CounterResponse`
**Realtime:** Publishes `COUNTER_STATUS_CHANGED` to staff topic AFTER_COMMIT
**Status:** NOT IMPLEMENTED

---

## Tokens (Customer Operations)

### POST /api/v1/tokens/join
**Auth:** None (anonymous join) or CUSTOMER
**Request:**
```json
{
  "serviceId": "uuid",
  "customerName": "string (optional, max 255)",
  "customerPhone": "string (optional, E.164)",
  "idempotencyKey": "string (optional, max 100)"
}
```
**Response 201:**
```json
{
  "tokenId": "uuid",
  "tokenNumber": "A-043",
  "state": "WAITING",
  "queueId": "uuid",
  "serviceId": "uuid",
  "locationId": "uuid",
  "orgId": "uuid",
  "peopleAhead": 5,
  "estimatedWaitMinutes": 15,
  "estimatedWaitRange": "12-18 min",
  "confidence": "HIGH",
  "joinedAt": "2026-09-05T10:00:00Z",
  "stepAwayExpiresAt": null
}
```
**Errors:** 404 `QUEUE_NOT_FOUND`, 409 `QUEUE_FULL`, 409 `QUEUE_PAUSED`
**Idempotency:** Duplicate `idempotencyKey` returns existing token with 200
**Status:** NOT IMPLEMENTED

---

### GET /api/v1/tokens/{tokenId}
**Auth:** None for public status lookup (token owner verified by tokenId knowledge), or authenticated
**Response 200:** `TokenResponse` (same shape as join response, with updated state/position)
**Errors:** 404 `TOKEN_NOT_FOUND`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/tokens/{tokenId}/step-away
**Auth:** None (customer self-service) or CUSTOMER
**Response 200:** `TokenResponse` with `state: "AWAY"`, `stepAwayExpiresAt` set
**Errors:** 400 `TOKEN_INVALID_STATE` (if not WAITING), 404 `TOKEN_NOT_FOUND`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/tokens/{tokenId}/return
**Auth:** None or CUSTOMER
**Response 200:** `TokenResponse` with `state: "WAITING"`, `stepAwayExpiresAt: null`
**Errors:** 400 `TOKEN_INVALID_STATE` (if not AWAY), 404 `TOKEN_NOT_FOUND`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/tokens/{tokenId}/cancel
**Auth:** None (customer self) or CUSTOMER
**Response 200:** `TokenResponse` with `state: "CANCELLED"`
**Errors:** 400 `TOKEN_INVALID_STATE`, 404 `TOKEN_NOT_FOUND`
**Status:** NOT IMPLEMENTED

---

### GET /api/v1/tokens
**Auth:** CUSTOMER (own history) or authenticated user
**Query params:** `?phone={phone}` or `?customerId={id}` or session-based
**Response 200:** `[TokenResponse]` (terminal state tokens)
**Status:** NOT IMPLEMENTED

---

## Staff Operations

### POST /api/v1/staff/call-next
**Auth:** STAFF, ORG_ADMIN
**Request:** `{ "counterId": "uuid" }` (or derived from JWT staff context)
**Response 200:** `TokenResponse` with `state: "CALLED"`, counter assignment
**Errors:**
- 409 `COUNTER_NOT_AVAILABLE` — counter not ONLINE
- 409 `COUNTER_ALREADY_SERVING` — counter has active token
- 404 `NO_WAITING_TOKENS` — queue empty
- 403 `RESOURCE_FORBIDDEN` — counter not in staff's location
**Realtime:** Publishes `TOKEN_CALLED` to public and staff topics AFTER_COMMIT
**Concurrency:** `SELECT FOR UPDATE SKIP LOCKED`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/staff/recall
**Auth:** STAFF, ORG_ADMIN
**Request:** `{ "tokenId": "uuid", "counterId": "uuid" }`
**Response 200:** `TokenResponse` — state unchanged (still CALLED), `calledAt` updated
**Errors:** 400 `TOKEN_INVALID_STATE` (must be CALLED), 400 `COUNTER_MISMATCH`
**Realtime:** Publishes `TOKEN_RECALLED` AFTER_COMMIT
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/staff/complete
**Auth:** STAFF, ORG_ADMIN
**Request:** `{ "tokenId": "uuid" }`
**Response 200:** `TokenResponse` with `state: "COMPLETED"`
**Realtime:** Publishes `TOKEN_COMPLETED` AFTER_COMMIT
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/staff/skip
**Auth:** STAFF, ORG_ADMIN
**Request:** `{ "tokenId": "uuid" }`
**Response 200:** `TokenResponse` with `state: "NO_SHOW"`
**Realtime:** Publishes `TOKEN_NO_SHOW` AFTER_COMMIT
**Status:** NOT IMPLEMENTED

---

### GET /api/v1/staff/queue
**Auth:** STAFF, ORG_ADMIN
**Query params:** `?counterId={uuid}`
**Response 200:**
```json
{
  "counter": { CounterResponse },
  "currentServingToken": { TokenResponse } | null,
  "waitingTokens": [TokenResponse],
  "waitingCount": 12,
  "awayCount": 2
}
```
**Status:** NOT IMPLEMENTED

---

## Staff Management (Org Admin)

### GET /api/v1/organizations/{orgId}/staff
**Auth:** ORG_ADMIN (own org), PLATFORM_ADMIN
**Response 200:** `[StaffUserResponse]`
**Status:** NOT IMPLEMENTED

---

### POST /api/v1/staff
**Auth:** ORG_ADMIN
**Request:** `{ "orgId": "uuid", "locationId": "uuid", "name": "string", "email": "string", "role": "STAFF|ORG_ADMIN", "assignedCounterNumber": 3 }`
**Response 201:** `StaffUserResponse`
**Errors:** 409 `EMAIL_ALREADY_EXISTS`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/staff/{staffId}/assign-counter
**Auth:** ORG_ADMIN
**Request:** `{ "counterNumber": 3 }`
**Response 200:** `StaffUserResponse`
**Status:** NOT IMPLEMENTED

---

### PUT /api/v1/staff/{staffId}/status
**Auth:** ORG_ADMIN
**Request:** `{ "status": "ACTIVE|INACTIVE" }`
**Response 200:** `StaffUserResponse`
**Status:** NOT IMPLEMENTED

---

## Analytics

### GET /api/v1/organizations/{orgId}/analytics/dashboard
**Auth:** ORG_ADMIN (own org), PLATFORM_ADMIN
**Response 200:**
```json
{
  "tokensServedToday": 142,
  "avgWaitMinutes": 11.4,
  "activeQueues": 3,
  "activeCounters": 5,
  "totalCounters": 8,
  "waitingNow": 23,
  "noShowRateToday": 0.04
}
```
**Status:** NOT IMPLEMENTED

---

### GET /api/v1/platform/analytics/dashboard
**Auth:** PLATFORM_ADMIN
**Response 200:**
```json
{
  "activeOrganizations": 12,
  "totalTokensLast7Days": 8421,
  "avgWaitAcrossPlatform": 13.2,
  "systemAlerts": [SystemAlertResponse]
}
```
**Status:** NOT IMPLEMENTED

---

## WebSocket Topics (STOMP)

**Connection endpoint:** `ws://{host}/ws-align` (SockJS: `http://{host}/ws-align`)

| Topic | Subscribers | Events |
|-------|-------------|--------|
| `/topic/tenant/{orgId}/location/{locId}/public` | Public display, customers | `TOKEN_CALLED` (no PII), `TOKEN_RECALLED`, `QUEUE_PAUSED`, `QUEUE_RESUMED` |
| `/topic/tenant/{orgId}/location/{locId}/staff` | Staff, Org Admin | All above + `TOKEN_JOINED`, `TOKEN_COMPLETED`, `TOKEN_CANCELLED`, `TOKEN_NO_SHOW`, `COUNTER_STATUS_CHANGED` |
| `/topic/token/{tokenId}` | Token owner | `TOKEN_STATE_CHANGED`, `POSITION_UPDATED`, `STEP_AWAY_EXPIRING` |

**Event payload structure:**
```json
{
  "eventType": "TOKEN_CALLED",
  "timestamp": "2026-09-05T10:42:35.123Z",
  "orgId": "uuid",
  "locationId": "uuid",
  "data": { ... event-specific fields ... }
}
```

**Rule:** Public topic data object must never contain `customerName` or `customerPhone`.

---

## HTTP Status Code Reference

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, operation |
| 201 | Created | Successful POST creating a resource |
| 204 | No Content | Successful DELETE or logout |
| 400 | Bad Request | Business rule violation, invalid state |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT but insufficient role/tenant access |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Capacity full, counter unavailable, duplicate |
| 422 | Unprocessable Entity | Input validation failure |
| 500 | Internal Server Error | Unexpected server error |

---

**Last Updated:** 2026-09-05
**Next Review:** Update after each phase adds/changes endpoints
