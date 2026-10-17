# ALIGN Backend — Live API Contract & Specification

**Version:** 2.0 (Phase 8 Verified)  
**Base Path:** `/api/v1`  
**Status:** FULLY IMPLEMENTED AND VERIFIED ✅  

---

## 1. Global Conventions

- **Transport:** HTTP/1.1 over TLS / HTTP in local development.
- **Data Format:** Standard JSON (`application/json;charset=UTF-8`).
- **Identifiers:** Standard RFC 4122 UUID v4 strings (e.g. `e2e00000-0000-0000-0000-000000000001`).
- **Timestamps:** ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Authentication:** `Authorization: Bearer <accessToken>` HTTP header for all protected endpoints.
- **Error Response Format (RFC 7807 Aligned):**
```json
{
  "success": false,
  "timestamp": "2026-10-13T08:21:17.711Z",
  "status": 400,
  "message": "Human-readable error description",
  "code": "DOMAIN_ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation rule explanation"
    }
  ]
}
```

---

## 2. Authentication & Identity (`/api/v1/auth`)

### 2.1 Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Auth:** Public / Anonymous
- **Request Body:**
```json
{
  "email": "e2e.admin@align.local",
  "password": "e2e-password"
}
```
- **Response 200 OK:**
```json
{
  "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
  "refreshToken": "fcmpSDGpeTyZRTA...",
  "expiresIn": 900,
  "user": {
    "id": "e2e00000-0000-0000-0000-000000000008",
    "name": "E2E Admin",
    "email": "e2e.admin@align.local",
    "role": "ORG_ADMIN",
    "orgId": "e2e00000-0000-0000-0000-000000000001",
    "locationId": "e2e00000-0000-0000-0000-000000000002"
  }
}
```
- **Errors:** 401 `INVALID_CREDENTIALS`, 422 `VALIDATION_ERROR`.

### 2.2 Token Refresh
- **Endpoint:** `POST /api/v1/auth/refresh`
- **Auth:** Public
- **Request Body:** `{ "refreshToken": "string" }`
- **Response 200 OK:** `{ "accessToken": "string", "refreshToken": "string", "expiresIn": 900 }`
- **Errors:** 401 `TOKEN_EXPIRED`, 401 `TOKEN_INVALID`.

### 2.3 Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Bearer Token (Authenticated)
- **Response 204 No Content**

### 2.4 Current User Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Auth:** Bearer Token (Authenticated)
- **Response 200 OK:** Returns authenticated `User` object.

---

## 3. Customer Queue Operations (`/api/v1/tokens`)

### 3.1 Join Queue
- **Endpoint:** `POST /api/v1/tokens`
- **Auth:** Public / Anonymous
- **Request Body:**
```json
{
  "orgId": "e2e00000-0000-0000-0000-000000000001",
  "locationId": "e2e00000-0000-0000-0000-000000000002",
  "serviceId": "e2e00000-0000-0000-0000-000000000003",
  "customerName": "Jane Doe",
  "customerPhone": "+15551234567",
  "smsConsent": true,
  "idempotencyKey": "req-uuid-12345"
}
```
- **Response 201 Created:**
```json
{
  "id": "c1389868-b805-4e67-a2f2-1a48c90823db",
  "tokenNumber": "E003",
  "state": "WAITING",
  "orgId": "e2e00000-0000-0000-0000-000000000001",
  "locationId": "e2e00000-0000-0000-0000-000000000002",
  "serviceId": "e2e00000-0000-0000-0000-000000000003",
  "queueId": "e2e00000-0000-0000-0000-000000000004",
  "position": 1,
  "peopleAhead": 0,
  "estimatedWaitTimeMinutes": 8,
  "estRangeText": "5-10 min",
  "joinedAt": "2026-10-13T08:21:56.426Z",
  "realtimeToken": "eyJhbGciOi..."
}
```
- **Errors:** 400 `LOCATION_CLOSED`, 409 `QUEUE_FULL`, 409 `QUEUE_PAUSED`, 422 `VALIDATION_ERROR`.

### 3.2 Token Live Position & ETA
- **Endpoint:** `GET /api/v1/tokens/{tokenId}/position`
- **Auth:** Public
- **Response 200 OK:**
```json
{
  "tokenId": "uuid",
  "tokenNumber": "E003",
  "state": "WAITING",
  "position": 1,
  "peopleAhead": 0,
  "estimatedWaitMinutes": 8,
  "estRangeText": "5-10 min",
  "confidence": "HIGH"
}
```

### 3.3 Step Away (15-Minute Grace Window)
- **Endpoint:** `POST /api/v1/tokens/{tokenId}/step-away`
- **Auth:** Public / Customer
- **Response 200 OK:** Sets token state to `AWAY` and assigns `step_away_expires_at = now + 15m`.

### 3.4 Return from Step Away
- **Endpoint:** `POST /api/v1/tokens/{tokenId}/return`
- **Auth:** Public / Customer
- **Response 200 OK:** Restores token state to `WAITING` with original position priority intact.

### 3.5 Cancel Token
- **Endpoint:** `POST /api/v1/tokens/{tokenId}/cancel`
- **Auth:** Public / Customer
- **Response 200 OK:** Sets state to `CANCELLED` (Terminal State).

---

## 4. Staff Counter Operations (`/api/v1/staff`)

### 4.1 Call Next Token
- **Endpoint:** `POST /api/v1/staff/counters/{counterId}/call-next`
- **Auth:** Bearer Token (`ROLE_STAFF`)
- **Response 200 OK:**
```json
{
  "id": "uuid",
  "tokenNumber": "E003",
  "state": "CALLED",
  "customerName": "Jane Doe",
  "customerPhone": "+15551234567",
  "counterId": "e2e00000-0000-0000-0000-000000000005",
  "calledAt": "2026-10-13T08:21:56.426Z"
}
```
- **Errors:** 404 `NO_WAITING_TOKENS`, 409 `COUNTER_ALREADY_SERVING`, 409 `COUNTER_NOT_AVAILABLE`.

### 4.2 Start Service
- **Endpoint:** `POST /api/v1/staff/tokens/{tokenId}/serve?counterId={counterId}`
- **Auth:** Bearer Token (`ROLE_STAFF`)
- **Response 200 OK:** Transitions token state from `CALLED` to `IN_SERVICE`.

### 4.3 Complete Service
- **Endpoint:** `POST /api/v1/staff/tokens/{tokenId}/complete?counterId={counterId}`
- **Auth:** Bearer Token (`ROLE_STAFF`)
- **Response 200 OK:** Transitions token state to `COMPLETED` and clears counter current serving token.

### 4.4 Mark No-Show
- **Endpoint:** `POST /api/v1/staff/tokens/{tokenId}/no-show?counterId={counterId}`
- **Auth:** Bearer Token (`ROLE_STAFF`)
- **Response 200 OK:** Transitions token state to `NO_SHOW`.

### 4.5 Recall Token
- **Endpoint:** `POST /api/v1/staff/tokens/{tokenId}/recall?counterId={counterId}`
- **Auth:** Bearer Token (`ROLE_STAFF`)
- **Response 200 OK:** Re-triggers chime and broadcast without advancing queue sequence.

### 4.6 Transfer Token
- **Endpoint:** `POST /api/v1/staff/tokens/{tokenId}/transfer`
- **Auth:** Bearer Token (`ROLE_STAFF`)
- **Request Body:**
```json
{
  "targetServiceId": "e2e00000-0000-0000-0000-000000000010"
}
```
- **Response 200 OK:** Marks parent token `TRANSFERRED`, creates child token in target queue with `priority_timestamp` set to original token join time.

---

## 5. Organization Domain Management

### 5.1 Locations (`/api/v1/locations`)
- `GET /api/v1/locations`: List locations for authenticated user's organization.
- `GET /api/v1/locations/{id}`: Retrieve detailed location profile with operating hours.
- `POST /api/v1/locations`: Create new location (`ROLE_ORG_ADMIN`).
- `PUT /api/v1/locations/{id}`: Update location attributes, timezone, and operating schedules (`ROLE_ORG_ADMIN`).
- `GET /api/v1/locations/{id}/queue-warnings`: Retrieve active queue SLA / threshold warnings.

### 5.2 Services (`/api/v1/services`)
- `GET /api/v1/services?locationId={locationId}`: Publicly list enabled services for location.
- `GET /api/v1/services/{id}`: Retrieve service details.
- `POST /api/v1/services`: Create service (`ROLE_ORG_ADMIN`).
- `PUT /api/v1/services/{id}`: Update service config (`ROLE_ORG_ADMIN`).
- `GET /api/v1/services/{id}/preparation-requirements`: List mandatory preparation documents/steps.

### 5.3 Queues (`/api/v1/queues`)
- `GET /api/v1/queues?locationId={locationId}`: List queues.
- `GET /api/v1/queues/{id}`: Get queue metrics, prefix, capacity.
- `POST /api/v1/queues`: Create queue (`ROLE_ORG_ADMIN`).
- `PUT /api/v1/queues/{id}`: Update queue config (`ROLE_ORG_ADMIN`).
- `POST /api/v1/queues/{id}/pause`: Pause queue intake (`ROLE_ORG_ADMIN`, `ROLE_STAFF`).
- `POST /api/v1/queues/{id}/resume`: Resume queue intake (`ROLE_ORG_ADMIN`, `ROLE_STAFF`).

### 5.4 Counters (`/api/v1/counters`)
- `GET /api/v1/counters?locationId={locationId}`: List counters.
- `PUT /api/v1/counters/{id}/availability`: Update status (`ONLINE`, `ON_BREAK`, `AWAY`, `OFFLINE`).

---

## 6. Real-time Announcements & Public TV (`/api/v1/announcement-templates`, `/api/v1/staff/announcements`)

- `GET /api/v1/announcement-templates`: List announcement templates.
- `POST /api/v1/announcement-templates`: Create announcement template (`ROLE_ORG_ADMIN`).
- `POST /api/v1/staff/announcements`: Broadcast custom or template announcement to Public TV.
  - **Payload:** `{ "locationId": "uuid", "text": "Token E003 proceed to Counter 1" }`
  - **Broadcast Topic:** `/topic/location/{locationId}/public`

---

## 7. Analytics & Reporting (`/api/v1/analytics`)

**Auth Required:** `ROLE_ORG_ADMIN` or `ROLE_PLATFORM_ADMIN`  
**Required Query Parameters:** `orgId={uuid}&start={isoInstant}&end={isoInstant}`

- `GET /api/v1/analytics/summary`: Aggregate metrics (total completed, average wait time, average service duration, completion rate).
- `GET /api/v1/analytics/queues`: Queue-by-queue performance and throughput.
- `GET /api/v1/analytics/traffic`: Hourly distribution of customer arrivals and token completions.
- `GET /api/v1/analytics/services`: Service breakdown by volume, duration, and abandonment.
- `GET /api/v1/analytics/counters`: Counter operational activity and utilization percentages.
- `GET /api/v1/analytics/staff-service-duration`: Staff efficiency and processing time benchmarks.

---

## 8. WebSocket STOMP Topics (`/ws-align`)

| Topic Destination | Payload | Audience |
| :--- | :--- | :--- |
| `/topic/location/{locationId}/public` | Anonymized Ticket Call (`tokenNumber`, `counterNumber`, audio prompt) | Public TV & Kiosk Displays |
| `/topic/token/{tokenId}` | Full State Lifecycle Updates (`WAITING`, `CALLED`, `IN_SERVICE`, `COMPLETED`, position) | Customer Mobile Web PWA |
| `/topic/location/{locationId}/staff` | Operational Queue Updates & SLA Warnings | Staff Station Consoles |
