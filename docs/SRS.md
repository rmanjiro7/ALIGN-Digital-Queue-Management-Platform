# Software Requirements Specification (SRS)
## ALIGN — Digital Queue Management Platform

**Document Version:** 2.0 (Phase 8 MVP & Operational Baseline)  
**Date:** 2026-10-13  
**Status:** IMPLEMENTED, VERIFIED & OPERATIONAL ✅  
**Repository:** `d:\align\ALIGN-Digital-Queue-Management-Platform`  

---

## 1. Introduction & Vision

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the definitive functional, architectural, non-functional, and operational requirements for the **ALIGN Digital Queue Management Platform**. It serves as the single source of truth for engineering, product stakeholders, and architectural audits.

### 1.2 System Goals & Problem Statement
Physical waiting lines cause customer frustration, lobby congestion, lack of visibility into wait times, and inefficient teller/staff resource allocation. 

**ALIGN** solves these challenges by providing an enterprise-grade, multi-tenant digital queuing engine that:
1. **Eliminates Physical Lines:** Enables customers to discover queues, check estimated wait times, and receive digital tokens from mobile devices or on-site kiosks.
2. **Delivers Real-Time Transparency:** Streams live queue status, ticket position updates, and audio-visual calling notifications to customers and public display monitors.
3. **Optimizes Counter Staff Productivity:** Equips staff with a concurrency-safe counter console for calling, transferring, and serving customers without duplicate ticket assignments.
4. **Empowers Operational Leadership:** Provides organization administrators with real-time KPI dashboards, SLA threshold alerts, operating schedule enforcement, and historical analytics.

### 1.3 Scope of the Software
The ALIGN platform is implemented as a **Modular Monolith** comprising:
- **Frontend PWA:** React 19 + TypeScript single-page application and Progressive Web App with 16 distinct role-based screen viewports.
- **Backend Core:** Spring Boot 3.2.5 RESTful microservices and STOMP WebSocket real-time event broker.
- **Database Engine:** PostgreSQL 15+ managed through 16 incremental Flyway migrations (`V1` to `V16`).
- **Orchestration Layer:** Docker Compose and detached launcher automation scripts (`start.ps1`, `start.bat`).

### 1.4 User Classes and Personas
The system defines five primary operational roles:

| Role Identifier | Persona Description | Authentication | Access Scope |
| :--- | :--- | :--- | :--- |
| `CUSTOMER` | Public guest seeking service at a branch | Anonymous / Token Signature | Discovers locations/services, joins queue, tracks active token, steps away, cancels |
| `STAFF` | Service teller / counter agent at a branch | Authenticated (JWT) | Operates counter, calls next token, starts service, completes, marks no-show, transfers |
| `ORG_ADMIN` | Branch / organizational operations manager | Authenticated (JWT) | Manages locations, services, queues, staff counters, operating hours, analytics |
| `PLATFORM_ADMIN` | Global SaaS platform administrator | Authenticated (JWT) | Cross-tenant tenant onboarding, platform telemetry, global audit monitoring |
| `PUBLIC_DISPLAY` | Large-format TV screen or kiosk lobby board | Authenticated Display Token | Read-only ticket calling board, audio chimes, text-to-speech visual prompts (Zero PII) |

---

## 2. Overall Description & Operating Environment

### 2.1 Product Perspective & Architecture
ALIGN employs a layered architecture adhering strictly to Domain-Driven Design (DDD) principles:
- **Presentation Layer:** Vite React 19 PWA with Tailwind styling and global error boundary protection.
- **API Boundary:** Spring Security JWT Bearer filter, RFC 7807 centralized exception handling, and Bucket4j rate limiting.
- **Application Services:** Transaction-scoped domain orchestration (`@Transactional`).
- **Data Persistence:** Spring Data JPA over PostgreSQL with Flyway schema migration validation (`ddl-auto: validate`).
- **Real-Time Streaming:** In-process Spring Application Events published over STOMP WebSockets exclusively upon transaction commit (`AFTER_COMMIT`).

### 2.2 System Interfaces
- **HTTP REST API:** Base path `/api/v1` exposing 30+ endpoints for auth, queues, counters, tokens, and analytics.
- **WebSocket STOMP:** Handshake at `/ws-align` broadcasting to `/topic/location/{locId}/public`, `/topic/token/{id}`, and `/topic/location/{locId}/staff`.
- **Database Connection:** TCP connection to PostgreSQL port `5432` via HikariCP connection pool.

---

## 3. Functional Requirements

### FR-01: Tenant & Hierarchy Management
- **Description:** The system shall strictly isolate data across a hierarchical tree: `Organization` → `Location` → `Service` → `Queue` → `Counter`.
- **Acceptance Criteria:**
  - Every operational entity references an immutable `org_id`.
  - Service requests from an authenticated user of Organization A attempting to read or modify resources of Organization B must immediately be rejected with HTTP 403 Forbidden.

### FR-02: User Authentication & Role-Based Access Control (RBAC)
- **Description:** Secure user access via stateless JSON Web Tokens.
- **Acceptance Criteria:**
  - Login at `POST /api/v1/auth/login` validates credentials against 12-round BCrypt hashes.
  - Generates an HMAC-SHA512 (`HS512`) signed access token (15-minute TTL) and a cryptographically random refresh token (7-day TTL).
  - Refresh tokens are stored as SHA-256 hashes in PostgreSQL and rotated upon each refresh invocation.
  - Endpoints enforce authorization via Spring Security `@PreAuthorize("hasRole('...')")`.

### FR-03: Customer Queue Discovery & Entry
- **Description:** Customers shall discover active locations and services without pre-registration.
- **Acceptance Criteria:**
  - `GET /api/v1/services?locationId={id}` returns public service lists and current waiting count.
  - `POST /api/v1/tokens` creates a new token in `WAITING` state, validating that the location is open.
  - Supports optional customer name and E.164 formatted phone number.
  - Returns a signed `realtimeToken` enabling the customer to subscribe to private WebSocket tracking.

### FR-04: Atomic Token Sequence Generation
- **Description:** Tokens shall be numbered sequentially per queue with custom prefixes without gap creation or race conditions.
- **Acceptance Criteria:**
  - Numbering executes via atomic database increment: `UPDATE queues SET next_token_number = next_token_number + 1 WHERE id = ? RETURNING next_token_number`.
  - Enforces database constraint `UNIQUE(queue_id, token_number)`.
  - Formats tokens using queue prefix: e.g. `E001`, `E002`, `A042`.

### FR-05: Real-Time Position & Estimated Wait Calculation
- **Description:** Customers shall receive live updates on their position in line and estimated wait times.
- **Acceptance Criteria:**
  - `GET /api/v1/tokens/{id}/position` computes:
    - Exact waiting position: `COUNT(tokens where joined_at < this.joined_at and state = 'WAITING')`.
    - Estimated wait minutes based on historical average service durations for the service.
    - Wait range string (e.g. `10-15 min`) and confidence rating (`HIGH`, `MEDIUM`, `LOW`).

### FR-06: Customer Step-Away & Grace Period
- **Description:** Customers may temporarily step away from the lobby without losing their place in line.
- **Acceptance Criteria:**
  - `POST /api/v1/tokens/{id}/step-away` transitions state from `WAITING` to `AWAY` and sets `step_away_expires_at = now() + 15 minutes`.
  - Token can only use step-away once; repeat attempts return HTTP 400 `STEP_AWAY_ALREADY_USED`.
  - `POST /api/v1/tokens/{id}/return` restores state to `WAITING` with original sequence priority intact.
  - A scheduled background job (`StepAwayExpirationJob`) automatically transitions expired `AWAY` tokens to `EXPIRED`.

### FR-07: Concurrency-Safe Queue Calling (`CALL NEXT`)
- **Description:** Staff tellers shall call the next waiting customer safely under high concurrent teller load.
- **Acceptance Criteria:**
  - `POST /api/v1/staff/counters/{counterId}/call-next` queries tokens using:
    `SELECT * FROM tokens WHERE queue_id IN (...) AND state = 'WAITING' ORDER BY priority_timestamp ASC NULLS LAST, joined_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`.
  - Guarantees zero duplicate token assignments across parallel counters.
  - Rejects call request with HTTP 409 `COUNTER_ALREADY_SERVING` if counter is already serving an active token.

### FR-08: Service Progression (Serve, Complete, No-Show, Recall)
- **Description:** Staff counters shall manage customer interaction lifecycles.
- **Acceptance Criteria:**
  - `POST /api/v1/staff/tokens/{id}/serve`: Transitions `CALLED` → `IN_SERVICE`.
  - `POST /api/v1/staff/tokens/{id}/complete`: Transitions `IN_SERVICE` → `COMPLETED` and clears counter current serving token.
  - `POST /api/v1/staff/tokens/{id}/no-show`: Transitions `CALLED` → `NO_SHOW`.
  - `POST /api/v1/staff/tokens/{id}/recall`: Re-triggers chime notification to Public TV without advancing queue.

### FR-09: Inter-Queue Token Transfer
- **Description:** Staff can transfer customers to a secondary service queue without penalizing their prior wait time.
- **Acceptance Criteria:**
  - `POST /api/v1/staff/tokens/{id}/transfer` marks parent token `TRANSFERRED`.
  - Generates child token in target queue with `priority_timestamp` set to original token `joined_at` timestamp.
  - Child token is prioritized ahead of newer arrivals in the target queue.

### FR-10: Public TV Display & Audio-Visual Chimes
- **Description:** Lobby monitors shall display active calls and emit audio notifications without exposing personal data.
- **Acceptance Criteria:**
  - Screen 22 streams called tickets from `/topic/location/{locId}/public`.
  - Audio synthesizer plays acoustic prompt and announces: *"Token [X], please proceed to Counter [Y]"*.
  - Displays ticket number, counter name, and status; zero customer names or phone numbers are broadcast.

### FR-11: Structured Operating Hours & Timezone Enforcement
- **Description:** Organizations shall configure operating schedules per branch.
- **Acceptance Criteria:**
  - Locations define IANA timezones and day-of-week open/close time intervals in `location_schedules`.
  - When `enforce_schedule = true`, customer queue entry outside operating hours fails with HTTP 400 `LOCATION_CLOSED`.

### FR-12: Service Preparation Requirements & Multi-Stage Journeys
- **Description:** Present mandatory documentation requirements before customer confirms queue entry.
- **Acceptance Criteria:**
  - `GET /api/v1/services/{id}/preparation-requirements` returns checklist items.
  - Screen 04 displays required vs optional checklist items to prevent counter bottlenecks.

### FR-13: Announcement Broadcasting & Templates
- **Description:** Staff and admins can broadcast operational announcements across lobby monitors.
- **Acceptance Criteria:**
  - `POST /api/v1/staff/announcements` broadcasts custom text to lobby displays.
  - Announcement templates stored in database for standard notices (e.g. *"Lunch Break Delay"*).

### FR-14: Queue Capacity Controls & SLA Warning Monitoring
- **Description:** Automatic safeguards preventing queue overload.
- **Acceptance Criteria:**
  - Queues enforce `max_capacity`. When active tokens reach capacity, new entries are rejected with HTTP 409 `QUEUE_FULL`.
  - If `auto_pause_at_capacity = true`, queue automatically transitions to `PAUSED`.
  - Staff consoles receive visual warning badges when waiting times exceed organizational SLA thresholds.

### FR-15: Operational Analytics & Reporting
- **Description:** Aggregated operational metrics for business intelligence.
- **Acceptance Criteria:**
  - `GET /api/v1/analytics/summary` computes completed volume, average wait time, average service duration, and completion rate.
  - `GET /api/v1/analytics/traffic` computes hourly volume distributions.
  - Admin screens support CSV exports for summary, queue throughput, and staff efficiency metrics.

---

## 4. Non-Functional Requirements

### NFR-01: Performance & Latency
- All read-only REST API requests shall return within **< 100ms** at the 95th percentile under standard load.
- Token creation and queue calling transactions shall commit within **< 150ms**.
- WebSocket event propagation from database transaction commit to client receipt shall occur in **< 500ms**.

### NFR-02: Concurrency & Lock Integrity
- The system must prevent race conditions under 50+ concurrent requests attempting to call tokens or join queues.
- Handled exclusively via PostgreSQL row-level locks (`SELECT FOR UPDATE SKIP LOCKED` and queue row locking).

### NFR-03: Security & Data Protection
- Passwords must be hashed using BCrypt with a minimum cost factor of 12.
- JWT secrets must be at least 512 bits (64 bytes).
- All sensitive tokens and PII must be omitted from logs and Public TV display payloads.

### NFR-04: Tenant Isolation
- Zero data leakage across tenants. A compromised or misconfigured request must never surface or modify data across distinct `org_id` partitions.

### NFR-05: Resilience & Fault Tolerance
- Centralized `GlobalExceptionHandler` ensures all unexpected errors yield structured RFC 7807 JSON.
- Frontend includes a top-level `<ErrorBoundary>` ensuring a localized component error provides a graceful recovery option rather than a blank white screen.

### NFR-06: Rate Limiting & DoS Protection
- In-memory Bucket4j filter limits authentication endpoints to 10 requests/minute/IP and token creation to 30 requests/minute/IP.

### NFR-07: Compatibility & Accessibility
- Frontend conforms to WCAG 2.1 AA contrast requirements with high-contrast text tokens.
- Fully responsive across mobile (375px+), tablet, desktop (1440px), and 4K display monitors.

---

## 5. Current Implementation Status Matrix

### 5.1 What is Implemented & Fully Validated ✅

| Module / Feature | Backend Implementation | Frontend UI Screen | Validation Evidence |
| :--- | :--- | :--- | :--- |
| **Authentication & RBAC** | `AuthController`, `JwtService`, `SecurityConfig` | Screen 08 Login | 30/30 Security Tests Pass; E2E Login Verified |
| **Organization Hierarchy** | `LocationController`, `ServiceController`, `QueueController` | Screen 02 Discovery, Screen 13 Locations | 70/70 Org Domain Tests Pass |
| **Customer Queue Intake** | `TokenController.joinQueue`, `TokenService` | Screen 04 Join Confirm | Automated E2E test creates tokens successfully |
| **Live Token Tracking** | `TokenController.getPosition`, WebSocket STOMP | Screen 05 Active Status | Position & wait range rendered accurately |
| **Staff Counter Operations** | `StaffOperationsService.callNext`, `serve`, `complete` | Screen 09 Staff Operations | E2E `call-next` & `complete` cycle verified |
| **Concurrency Guard** | `SELECT ... FOR UPDATE SKIP LOCKED` | Counter Call Engine | `SkipLockedConcurrencyTest` passes |
| **Public TV Display** | WebSocket `/public` broadcast listener | Screen 22 Public Display | Anonymized ticket chime and SpeechSynthesis |
| **Operating Hours** | `LocationScheduleService.isLocationOpen` | Screen 13 Schedule Editor | Verified schedule enforcement & bypass |
| **Operational Analytics** | `AnalyticsService` (SQL aggregations) | Screen 17 Analytics | Summary, queues, traffic, CSV download verified |
| **Announcements** | `AnnouncementController`, templates | Screen 11 Announcement Control | Broadcast dispatch verified |
| **Resilience / Error Boundary** | `GlobalExceptionHandler.java` | Global `ErrorBoundary.tsx` | Error catching and branded recovery tested |
| **Startup Launcher** | PostgreSQL 15 + Spring Boot + Vite | CLI / Batch Launcher | `start.ps1`, `start.bat` tested and operational |

### 5.2 What is in Progress 🟡
- **Automated Container Packaging:** Dockerfile multi-stage builds optimized for cloud deployment.
- **JaCoCo Coverage Enforcement:** Tightening formal build coverage gate from 65% to 80% across administrative controllers.

### 5.3 What is Remaining / Future Backlog 📋
- **External SMS Dispatcher:** Integration with live SMS gateway (Twilio / AWS SNS) for real-time mobile SMS alerts (data schema and consent are already implemented).
- **AI/ML Wait Time Forecasting:** Transitioning heuristic wait time calculations to trained regression models using captured `token_events` dataset.
- **Distributed Redis Cache & Rate Limiting:** Transitioning from in-memory Bucket4j to Redis cluster for multi-node horizontal scaling.

---

## 6. Traceability Matrix

| Requirement | HTTP API Endpoint | Database Table | Primary UI Screen |
| :--- | :--- | :--- | :--- |
| **FR-01 (Hierarchy)** | `GET/POST /api/v1/locations`, `/services` | `organizations`, `locations`, `services` | Screen 02 Discovery, Screen 13 |
| **FR-02 (Auth)** | `POST /api/v1/auth/login`, `refresh` | `users`, `refresh_tokens` | Screen 08 Login |
| **FR-03 (Queue Join)**| `POST /api/v1/tokens` | `tokens`, `token_events` | Screen 04 Review & Join |
| **FR-04 (Sequencing)**| `POST /api/v1/tokens` | `queues.next_token_number` | Screen 04 / Screen 05 |
| **FR-05 (Tracking)** | `GET /api/v1/tokens/{id}/position` | `tokens`, `services` | Screen 05 Active Status |
| **FR-06 (Step Away)** | `POST /api/v1/tokens/{id}/step-away` | `tokens.step_away_expires_at` | Screen 05 Active Status |
| **FR-07 (Call Next)** | `POST /api/v1/staff/counters/{id}/call-next`| `counters`, `tokens` | Screen 09 Staff Operations |
| **FR-08 (Progression)**| `POST /api/v1/staff/tokens/{id}/serve`, `complete`| `tokens`, `token_events` | Screen 09 Staff Operations |
| **FR-09 (Transfer)** | `POST /api/v1/staff/tokens/{id}/transfer` | `tokens.transferred_to_token_id` | Screen 09 Staff Operations |
| **FR-10 (TV Display)** | `/topic/location/{id}/public` (WebSocket) | `token_events` | Screen 22 Public Display |
| **FR-11 (Hours)** | `GET/PUT /api/v1/locations/{id}` | `location_schedules` | Screen 13 Location Management |
| **FR-12 (Preparation)**| `GET /api/v1/services/{id}/preparation-requirements`| `preparation_requirements` | Screen 04 Review & Join |
| **FR-13 (Announce)** | `POST /api/v1/staff/announcements` | `announcement_templates` | Screen 11 Announcements |
| **FR-14 (Capacities)**| `POST /api/v1/queues/{id}/pause`, `resume` | `queues.max_capacity`, `status` | Screen 14 Queue Config |
| **FR-15 (Analytics)** | `GET /api/v1/analytics/summary`, `traffic` | `token_events`, `tokens` | Screen 17 Analytics & Reporting |
