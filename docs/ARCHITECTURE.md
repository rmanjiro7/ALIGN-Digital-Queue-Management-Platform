# ALIGN Platform — Living System Architecture

**Version:** 2.0 (Phase 8 MVP & Operational Verification)  
**Last Updated:** 2026-10-13  
**Status:** FULLY IMPLEMENTED & OPERATIONAL ✅  

---

## 1. System Overview

ALIGN is a modern, production-oriented, multi-tenant **Digital Queue Management Platform (QMS)** designed to eliminate physical waiting lines for service organizations. The system delivers:
- **Customer Self-Service PWA:** Mobile-first queue discovery, real-time token tracking, SMS consent, and estimated wait times.
- **Staff Operations Station:** Real-time counter management, concurrency-safe token calling (`FOR UPDATE SKIP LOCKED`), transfers, recalls, and completions.
- **Public TV Display Mode:** Anonymized real-time ticket display with acoustic chime and speech synthesis.
- **Organization & Platform Consoles:** Real-time analytics, queue monitoring, location management, operating hours enforcement, and multi-tenant management.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (BROWSER / PWA)                    │
│  ┌──────────────────┬──────────────────┬─────────────────────────────┐ │
│  │ Customer Portal  │  Staff Station   │  Org & Platform Admin       │ │
│  │ (Screens 01-05)  │  (Screens 08-11) │  (Screens 12-17, 22 TV)     │ │
│  └──────────────────┴──────────────────┴─────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / REST (8080) & WSS (/ws-align)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   BACKEND LAYER (SPRING BOOT 3.2.5 / JAVA 17)          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Security Filter Chain: JwtAuthenticationFilter (HS512), CORS    │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Controllers: Auth, Location, Service, Queue, Counter, Token,     │  │
│  │              StaffOps, Analytics, Announcement, Journey          │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Service Domain: TokenService, StaffOpsService, AnalyticsService, │  │
│  │                 LocationScheduleService, AnnouncementService     │  │
│  └──────────────────┬──────────────────────────────┬────────────────┘  │
│                     │ Transaction Boundary         │ After Commit      │
│                     ▼                              ▼                   │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────┐  │
│  │ Spring Data JPA Repositories (Hikari│  │ WebSocket/STOMP Broker  │  │
│  │ + Postgres Dialect)                 │  │ (SimpMessagingTemplate) │  │
│  └──────────────────┬──────────────────┘  └─────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────────────────┘
                      │ SQL via Port 5432
                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER (POSTGRESQL 15+)                   │
│  Flyway Migrations (V1–V16) | 16 Normalized Tables | B-Tree & Partial  │
│  Indexes | Row-level Constraints | Atomic Sequences                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Package Structure

```
backend/src/main/java/com/align/qms/
├── admin/                 Org Admin & Platform audit events & controllers
├── analytics/             AnalyticsService, queries, KPI DTOs
├── announcement/          Announcement templates & broadcasting
├── auth/                  AuthController, AuthService, RefreshToken entities & DTOs
├── common/                Constants, Base entities, Audit fields
├── config/                WebSecurityConfig, WebSocketConfig, AsyncConfig
├── counter/               Counter entity, CounterRepository, assignments
├── exception/             GlobalExceptionHandler, domain exception hierarchy
├── journey/               Customer journey stages & tracking
├── location/              Location, LocationSchedule, LocationScheduleService
├── notification/          Notification entity & mock dispatchers
├── organization/          Organization entity, TenantContext, isolation aspects
├── queue/                 Queue entity, QueueRepository, status management
├── security/              JwtService, JwtAuthenticationFilter, UserPrincipal, RBAC
├── service/               Service entity, preparation requirements
├── token/                 Token entity, TokenService, StaffOperationsService, TokenState
├── user/                  User entity, UserRepository, UserRole, UserStatus
└── websocket/             WebSocketEventPublisher, STOMP event dispatchers
```

---

## 3. End-to-End Request Flow & Concurrency

### 3.1 Token Creation (`joinQueue`)
```
Customer Request (POST /api/v1/tokens)
  ↓
JwtAuthenticationFilter (Anonymous permitted for public join)
  ↓
TokenService.joinQueueTx() [@Transactional]
  1. Queue lookup with FOR UPDATE lock on Queue row
  2. Operating hours verification: LocationScheduleService.isLocationOpen()
  3. Queue status check (Must not be PAUSED or CLOSED)
  4. Capacity check against maxCapacity (Auto-pause if configured)
  5. Atomic token sequence generation via queueRepository.allocateNextTokenNumber()
  6. Token insert with WAITING state and SMS consent timestamp
  7. TokenEvent insert (Propagation.MANDATORY)
  8. ApplicationEventPublisher.publishEvent(TokenCreatedEvent)
  ↓
Transaction Commit
  ↓
@TransactionalEventListener(AFTER_COMMIT)
  → WebSocket broadcast to /topic/token/{tokenId} and /topic/location/{locationId}/public
  ↓
Returns HTTP 201 Created with live token & JWT tracking signature
```

### 3.2 Staff Concurrency-Safe Calling (`callNextToken`)
```
Staff Station (POST /api/v1/staff/counters/{counterId}/call-next)
  ↓
JwtAuthenticationFilter validates Bearer token (Requires ROLE_STAFF)
  ↓
StaffOperationsService.callNext() [@Transactional]
  1. Verify counter belongs to staff's location & assigned staff
  2. Check counter availability (Must be ONLINE) and not already serving
  3. Fetch highest priority waiting token using:
     SELECT * FROM tokens 
     WHERE queue_id IN (:assignedQueues) 
       AND state = 'WAITING' 
     ORDER BY priority_timestamp ASC NULLS LAST, joined_at ASC 
     LIMIT 1 FOR UPDATE SKIP LOCKED
  4. Transition token: WAITING → CALLED (called_at = Instant.now(), counter_id = counter.id)
  5. Assign token to counter.currentServingTokenId
  6. Record TokenEvent (TOKEN_CALLED)
  ↓
Transaction Commit
  ↓
@TransactionalEventListener(AFTER_COMMIT)
  → Broadcast to TV display topic /topic/location/{locId}/public (Chime & Audio announcement)
  → Broadcast to customer topic /topic/token/{tokenId}
  ↓
Returns HTTP 200 OK with called token details
```

---

## 4. Security & Tenant Isolation

1. **Authentication:**
   - **Algorithm:** HMAC-SHA512 (`HS512`) symmetric signature via `io.jsonwebtoken:jjwt`.
   - **Access Token:** 15-minute TTL carrying `sub` (userId), `orgId`, `role`, and `locationId`.
   - **Refresh Token:** 7-day TTL with SHA-256 hashed persistence in PostgreSQL and cryptographic rotation.
2. **Role-Based Access Control (RBAC):**
   - `@PreAuthorize` guards on all operational and administrative endpoints:
     - `CUSTOMER`: Public discovery, queue entry, token position tracking, cancellation.
     - `STAFF`: Counter operations, queue calling, token serving, completing, and transfers.
     - `ORG_ADMIN`: Organization dashboards, queue configurations, staff assignments, analytics.
     - `PLATFORM_ADMIN`: Cross-tenant read-only telemetry, tenant creation, and system monitoring.
3. **Tenant Isolation:**
   - Client-supplied `orgId` in bodies is strictly validated against `SecurityContext` extracted from the cryptographically verified JWT token. Cross-tenant access attempts immediately fail with HTTP 403 Forbidden.

---

## 5. Frontend Architecture

- **Core Framework:** React 19 + TypeScript + Vite.
- **Styling:** Vanilla Tailwind CSS with high-contrast, accessibility-audited design tokens (`bg-base`, `surface`, `surface-elevated`, `content-primary`, `accent`).
- **Resilience:** Global `<ErrorBoundary>` wrapping all active screen viewports to prevent uncaught runtime exceptions from unmounting the app.
- **State Management:** Reactive Observer Pattern (`QueueStore`) with safe fallback defaults, defensive normalization, and `localStorage` persistence.
- **API Client:** Singleton `apiClient` supporting automatic JWT bearer token injection, transparent refresh token rotation, and safe error normalization.

---

## 6. Implementation Status Matrix

| Subsystem | Components | Status |
| :--- | :--- | :--- |
| **Foundation & Database** | PostgreSQL 15, Flyway V1–V16, Spring Boot Actuator, Health Endpoints | **COMPLETE & VALIDATED** ✅ |
| **Security & Auth** | JWT HS512, Refresh Tokens, BCrypt (12 rounds), RBAC, Tenant Isolation | **COMPLETE & VALIDATED** ✅ |
| **Organization Domain** | Organizations, Locations, Services, Queues, Counters, Assignments | **COMPLETE & VALIDATED** ✅ |
| **Token Engine** | Atomic ticket generator, Queue capacity enforcement, Idempotency, State machine | **COMPLETE & VALIDATED** ✅ |
| **Staff Station** | Concurrency-safe calling (`SKIP LOCKED`), Serve, Complete, Transfer, Recall, No-show | **COMPLETE & VALIDATED** ✅ |
| **Realtime Engine** | WebSocket/STOMP broker (`/ws-align`), Transaction-bound publishers (`AFTER_COMMIT`) | **COMPLETE & VALIDATED** ✅ |
| **Admin & Analytics** | KPI aggregation, Historical date-filtering, CSV reports, Queue config | **COMPLETE & VALIDATED** ✅ |
| **Customer Journey** | Preparation requirements, Journey stages, Operating hours schedule validation | **COMPLETE & VALIDATED** ✅ |
| **Testing & Automation** | Testcontainers integration suite, Puppeteer E2E suite, `start.ps1` orchestrator | **COMPLETE & VALIDATED** ✅ |
