# ALIGN BACKEND — REQUIREMENTS REGISTER

**Version:** 1.0
**Last Updated:** 2026-09-05
**Source:** Frontend inspection, BACKEND_INSPECTION_REPORT.md, BUSINESS_RULES.md, master prompt

---

## Status Definitions

- `NOT STARTED` — No implementation exists
- `IN PROGRESS` — Partially implemented
- `IMPLEMENTED` — Code exists, not yet validated
- `VALIDATED` — Implementation tested and confirmed correct
- `BLOCKED` — Cannot proceed, dependency or decision needed
- `DEFERRED` — Out of scope for current phases

---

## REQ-001

**ID:** REQ-001
**Description:** Spring Boot 3.2+ application with Maven build, health endpoint, structured logging, and Actuator
**Source:** Master prompt Phase 0
**Priority:** P0 — Blocker
**Backend impact:** `backend/` directory, `pom.xml`, `AlignApplication.java`, `application.yml`, logback, Actuator config
**Status:** NOT STARTED

---

## REQ-002

**ID:** REQ-002
**Description:** PostgreSQL connection, Flyway migrations, `ddl-auto: validate`
**Source:** Master prompt Phase 0
**Priority:** P0 — Blocker
**Backend impact:** `application.yml`, Flyway config, V1–V12 migration files
**Status:** NOT STARTED

---

## REQ-003

**ID:** REQ-003
**Description:** Centralized exception handling with consistent error response format `{ success, message, code, errors }`
**Source:** Master prompt Section 32, BACKEND_ARCHITECTURE_PLAN.md Section 9
**Priority:** P0 — Blocker
**Backend impact:** `GlobalExceptionHandler.java`, `ErrorResponse.java`, domain exception classes
**Status:** NOT STARTED

---

## REQ-004

**ID:** REQ-004
**Description:** User authentication via `POST /api/v1/auth/login` returning JWT access token (15 min) and refresh token (7 days)
**Source:** Frontend Screen08Login.tsx, BACKEND_INSPECTION_REPORT.md Section 4
**Priority:** P1 — Critical
**Backend impact:** `AuthController`, `AuthService`, `JwtTokenProvider`, `JwtAuthenticationFilter`, `User` entity, `RefreshToken` entity
**Status:** NOT STARTED

---

## REQ-005

**ID:** REQ-005
**Description:** JWT refresh via `POST /api/v1/auth/refresh`. Current user via `GET /api/v1/auth/me`. Logout via `POST /api/v1/auth/logout`
**Source:** Frontend auth flow, BACKEND_INSPECTION_REPORT.md Section 8
**Priority:** P1 — Critical
**Backend impact:** `AuthController`, `AuthService`, `RefreshTokenRepository`
**Status:** NOT STARTED

---

## REQ-006

**ID:** REQ-006
**Description:** RBAC enforcement: CUSTOMER, STAFF, ORG_ADMIN, PLATFORM_ADMIN roles. Every protected endpoint must verify role.
**Source:** BR-010, Master prompt Section 23
**Priority:** P1 — Critical
**Backend impact:** `SecurityConfig`, `UserRole` enum, `@PreAuthorize` on all controllers
**Status:** NOT STARTED

---

## REQ-007

**ID:** REQ-007
**Description:** Tenant isolation: org-scoped operations must verify `resource.orgId == user.orgId`. PLATFORM_ADMIN has read-only cross-tenant access.
**Source:** ADR-005, BR-004
**Priority:** P1 — Critical
**Backend impact:** `TenantContext`, AOP aspect, all service methods, repository queries
**Status:** NOT STARTED

---

## REQ-008

**ID:** REQ-008
**Description:** Organization CRUD: list, create, get, update. PLATFORM_ADMIN scoped.
**Source:** Frontend Screen16TenantManagement.tsx, BACKEND_INSPECTION_REPORT.md Section 8
**Priority:** P2 — High
**Backend impact:** `Organization` entity, `OrganizationRepository`, `TenantService`, `TenantController`
**Status:** NOT STARTED

---

## REQ-009

**ID:** REQ-009
**Description:** Location CRUD: list by org, create, update, deactivate. ORG_ADMIN + PLATFORM_ADMIN scoped.
**Source:** Frontend Screen13LocationManagement.tsx
**Priority:** P2 — High
**Backend impact:** `Location` entity, `LocationRepository`, `LocationService`, `LocationController`
**Status:** NOT STARTED

---

## REQ-010

**ID:** REQ-010
**Description:** Service CRUD: list by location, create, update, enable/disable. ORG_ADMIN scoped.
**Source:** Frontend Screen14ServiceQueueConfig.tsx
**Priority:** P2 — High
**Backend impact:** `Service` entity, `ServiceRepository`, `ServiceService`, `ServiceController`
**Status:** NOT STARTED

---

## REQ-011

**ID:** REQ-011
**Description:** Queue management: get/update queue config, pause/resume, update capacity. One queue per service (UNIQUE constraint).
**Source:** BR-012, DATABASE.md queues table
**Priority:** P2 — High
**Backend impact:** `Queue` entity, `QueueRepository`, `QueueService`, `QueueController`
**Status:** NOT STARTED

---

## REQ-012

**ID:** REQ-012
**Description:** Counter management: list by location, update availability (ONLINE/ON_BREAK/AWAY/OFFLINE). ORG_ADMIN + STAFF scoped.
**Source:** BR-003, Frontend Screen09Operations.tsx availability switcher
**Priority:** P2 — High
**Backend impact:** `Counter` entity, `CounterRepository`, `CounterService`, `CounterController`
**Status:** NOT STARTED

---

## REQ-013

**ID:** REQ-013
**Description:** Token issuance: `POST /api/v1/tokens/join` — atomic token number generation, capacity enforcement, idempotency, TOKEN_CREATED event
**Source:** ADR-001, ADR-003, BR-005, BR-006, BR-009, Frontend Screen04JoinConfirm.tsx
**Priority:** P1 — Critical
**Backend impact:** `Token` entity, `TokenRepository`, `TokenService.joinQueue()`, `TokenNumberGenerator`, `TokenEventService`
**Status:** NOT STARTED

---

## REQ-014

**ID:** REQ-014
**Description:** Token lookup: `GET /api/v1/tokens/{tokenId}` — returns token state, position ahead, estimated wait
**Source:** Frontend Screen05ActiveStatus.tsx
**Priority:** P1 — Critical
**Backend impact:** `TokenController`, `TokenService`, `WaitTimeCalculator`, `PositionCalculator`
**Status:** NOT STARTED

---

## REQ-015

**ID:** REQ-015
**Description:** Token state machine enforcement: all transitions must follow valid paths. Invalid transitions return 400/422. No direct state mutation via API.
**Source:** ADR-009, BR-002
**Priority:** P1 — Critical
**Backend impact:** `Token.transitionTo()`, `TokenState.canTransitionTo()`, domain exception
**Status:** NOT STARTED

---

## REQ-016

**ID:** REQ-016
**Description:** Step Away: `POST /api/v1/tokens/{id}/step-away` (WAITING→AWAY, 15min expiry). `POST /api/v1/tokens/{id}/return` (AWAY→WAITING). Server-authoritative timestamp.
**Source:** BR-008, Frontend Screen05ActiveStatus.tsx step-away button
**Priority:** P2 — High
**Backend impact:** `TokenService.activateStepAway()`, `TokenService.returnFromStepAway()`, `step_away_expires_at` field
**Status:** NOT STARTED

---

## REQ-017

**ID:** REQ-017
**Description:** Step Away expiration: background job runs every 60s, transitions AWAY→EXPIRED for tokens past `step_away_expires_at`
**Source:** BR-008, ADR-010
**Priority:** P2 — High
**Backend impact:** `StepAwayExpirationJob` (@Scheduled), `TokenRepository.findExpiredStepAwayTokens()`
**Status:** NOT STARTED

---

## REQ-018

**ID:** REQ-018
**Description:** Token cancellation: `POST /api/v1/tokens/{id}/cancel` — WAITING or AWAY → CANCELLED. Token cannot be restored after cancellation.
**Source:** BR-002, Frontend Screen05ActiveStatus.tsx cancel button
**Priority:** P2 — High
**Backend impact:** `TokenService.cancelToken()`
**Status:** NOT STARTED

---

## REQ-019

**ID:** REQ-019
**Description:** Token history: `GET /api/v1/tokens` — returns customer's token history (completed, cancelled, expired tokens)
**Source:** Frontend Screen07History.tsx
**Priority:** P3 — Medium
**Backend impact:** `TokenController`, `TokenService.getHistory()`
**Status:** NOT STARTED

---

## REQ-020

**ID:** REQ-020
**Description:** CALL NEXT: `POST /api/v1/staff/call-next` — concurrency-safe via `SELECT FOR UPDATE SKIP LOCKED`, validates counter availability, transitions WAITING→CALLED
**Source:** ADR-007, BR-003, BR-007, Frontend Screen09Operations.tsx CALL NEXT button
**Priority:** P1 — Critical
**Backend impact:** `StaffOperationsService.callNext()`, `TokenRepository.findNextWaitingTokenWithLock()`
**Status:** NOT STARTED

---

## REQ-021

**ID:** REQ-021
**Description:** Recall: `POST /api/v1/staff/recall` — re-announces a CALLED token without changing state, updates `called_at` timestamp, records TOKEN_RECALLED event
**Source:** BR-011, Frontend Screen09Operations.tsx recall button
**Priority:** P2 — High
**Backend impact:** `StaffOperationsService.recallToken()`
**Status:** NOT STARTED

---

## REQ-022

**ID:** REQ-022
**Description:** Complete service: `POST /api/v1/staff/complete` — IN_SERVICE→COMPLETED, clears counter, records TOKEN_COMPLETED event
**Source:** BR-002, Frontend Screen09Operations.tsx complete button
**Priority:** P1 — Critical
**Backend impact:** `StaffOperationsService.completeService()`
**Status:** NOT STARTED

---

## REQ-023

**ID:** REQ-023
**Description:** Skip/No-show: `POST /api/v1/staff/skip` — CALLED→NO_SHOW, clears counter, records TOKEN_NO_SHOW event
**Source:** BR-002, Frontend Screen09Operations.tsx no-show button
**Priority:** P2 — High
**Backend impact:** `StaffOperationsService.skipToken()`
**Status:** NOT STARTED

---

## REQ-024

**ID:** REQ-024
**Description:** Staff queue view: `GET /api/v1/staff/queue` — returns current serving token and ordered waiting list for staff counter
**Source:** Frontend Screen09Operations.tsx waiting queue list
**Priority:** P2 — High
**Backend impact:** `StaffOperationsController`, `StaffOperationsService`
**Status:** NOT STARTED

---

## REQ-025

**ID:** REQ-025
**Description:** Token event recording: every token lifecycle transition must produce a `TokenEvent` record in `token_events` table
**Source:** ADR-002, BR-013
**Priority:** P1 — Critical
**Backend impact:** `TokenEventService`, `TokenEvent` entity, `TokenEventRepository`
**Status:** NOT STARTED

---

## REQ-026

**ID:** REQ-026
**Description:** WebSocket/STOMP realtime: token called/recalled/completed events broadcast to public topic (no PII) and staff topic (full detail), AFTER_COMMIT only
**Source:** ADR-008, BACKEND_INSPECTION_REPORT.md Section 6
**Priority:** P2 — High
**Backend impact:** `WebSocketConfig`, `WebSocketEventPublisher`, `@TransactionalEventListener`
**Status:** NOT STARTED

---

## REQ-027

**ID:** REQ-027
**Description:** Public display topic: `/topic/tenant/{orgId}/location/{locId}/public` — TOKEN_CALLED events with token number and counter number only, no customer PII
**Source:** Master prompt Section 26, BACKEND_INSPECTION_REPORT.md Section 6
**Priority:** P2 — High
**Backend impact:** `WebSocketEventPublisher`, topic payload DTOs
**Status:** NOT STARTED

---

## REQ-028

**ID:** REQ-028
**Description:** Staff management: create staff, assign to counter, deactivate. ORG_ADMIN scoped.
**Source:** Frontend Screen14ServiceQueueConfig.tsx, BACKEND_INSPECTION_REPORT.md Section 8
**Priority:** P3 — Medium
**Backend impact:** `StaffManagementService`, `StaffManagementController`
**Status:** NOT STARTED

---

## REQ-029

**ID:** REQ-029
**Description:** Organization admin dashboard analytics: tokens served today, average wait, active queues, staff utilization. Derived from `token_events`.
**Source:** Frontend Screen12OrgDashboard.tsx
**Priority:** P3 — Medium
**Backend impact:** `AnalyticsService`, `AnalyticsController`
**Status:** NOT STARTED

---

## REQ-030

**ID:** REQ-030
**Description:** Platform admin dashboard: total tokens issued (7 days), active organizations, system health metrics
**Source:** Frontend Screen15PlatformDashboard.tsx
**Priority:** P3 — Medium
**Backend impact:** `AnalyticsService.getPlatformDashboard()`
**Status:** NOT STARTED

---

## REQ-031

**ID:** REQ-031
**Description:** Audit logging: administrative actions (queue config changes, staff changes, counter changes) recorded in `audit_logs` table. Separate from token_events.
**Source:** ADR-002, BR-013, BACKEND_INSPECTION_REPORT.md Section 8
**Priority:** P3 — Medium
**Backend impact:** `AuditLog` entity, `AuditLogService`, `AuditLogRepository`
**Status:** NOT STARTED

---

## REQ-032

**ID:** REQ-032
**Description:** Input validation: all untrusted input validated via Jakarta Bean Validation. Consistent 422 response for validation failures.
**Source:** Master prompt Section 31
**Priority:** P1 — Critical
**Backend impact:** All request DTOs, `@Valid` on controllers, `GlobalExceptionHandler`
**Status:** NOT STARTED

---

## REQ-033

**ID:** REQ-033
**Description:** Concurrent token issuance safety: 100 concurrent `POST /api/v1/tokens/join` requests must produce zero duplicate token numbers
**Source:** ADR-001, BR-006, Master prompt TEST A
**Priority:** P1 — Critical
**Backend impact:** `TokenService`, `TokenNumberGenerator`, `UNIQUE(queue_id, token_number)` constraint, Testcontainers test
**Status:** NOT STARTED

---

## REQ-034

**ID:** REQ-034
**Description:** Concurrent CALL NEXT safety: 10 concurrent CALL NEXT operations must produce zero duplicate token assignments
**Source:** ADR-007, BR-007, Master prompt TEST C
**Priority:** P1 — Critical
**Backend impact:** `SELECT FOR UPDATE SKIP LOCKED` query, `StaffOperationsService.callNext()`, Testcontainers test
**Status:** NOT STARTED

---

## REQ-035

**ID:** REQ-035
**Description:** Queue capacity enforcement under concurrency: concurrent joins at capacity boundary must not exceed max_capacity
**Source:** BR-005, Master prompt TEST F
**Priority:** P1 — Critical
**Backend impact:** `TokenService.joinQueue()` capacity check within transaction
**Status:** NOT STARTED

---

## REQ-036

**ID:** REQ-036
**Description:** Tenant isolation test: Organization A user cannot access Organization B resources via any API operation
**Source:** ADR-005, BR-004, Master prompt TEST D
**Priority:** P1 — Critical
**Backend impact:** All service methods, tenant isolation aspect, integration test
**Status:** NOT STARTED

---

## REQ-037

**ID:** REQ-037
**Description:** Realtime rollback safety: if a state-change transaction rolls back, no WebSocket event must be emitted for that operation
**Source:** ADR-008, Master prompt TEST G
**Priority:** P1 — Critical
**Backend impact:** `@TransactionalEventListener(AFTER_COMMIT)` strictly enforced
**Status:** NOT STARTED

---

## SUMMARY

| Priority | Count | Status |
|----------|-------|--------|
| P0 Blocker | 3 (REQ-001, 002, 003) | ALL NOT STARTED |
| P1 Critical | 14 | ALL NOT STARTED |
| P2 High | 12 | ALL NOT STARTED |
| P3 Medium | 8 | ALL NOT STARTED |
| **Total** | **37** | **ALL NOT STARTED** |

---

**Last Updated:** 2026-09-05
**Next Review:** After Phase 1 (Security) completion
