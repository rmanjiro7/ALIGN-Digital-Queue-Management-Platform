# ALIGN — BACKEND CONTEXT

**Version:** 1.4
**Last Updated:** 2026-09-07
**Status:** ACTIVE — Phase 1 COMPLETE ✅

---

## Project

**Name:** ALIGN — Digital Queue Management Platform
**Type:** Multi-tenant SaaS, queue management for service organizations
**Repository:** `d:\align\ALIGN-Digital-Queue-Management-Platform`

---

## Purpose

ALIGN enables service-based organizations to manage customer queues digitally. Customers join queues via mobile/web, receive tokens, track their position in real-time, and are called to counters by staff — eliminating unmanaged physical waiting lines.

---

## Users / Roles

| Role | Description | Auth Required |
|------|-------------|---------------|
| `CUSTOMER` | Joins queues, tracks token, cancels, steps away | No (anonymous token issuance) |
| `STAFF` | Counter operator: calls next, recalls, completes, skips | Yes — JWT |
| `ORG_ADMIN` | Manages organization resources (locations, services, staff, queues) | Yes — JWT |
| `PLATFORM_ADMIN` | Super-admin: tenant onboarding, platform analytics, read-only cross-org | Yes — JWT |
| `PUBLIC_DISPLAY` | TV/kiosk screen showing called tokens — no write access, no PII | No |

---

## Core Modules

1. **Auth** — JWT login, refresh tokens, RBAC, tenant identity
2. **Organization Domain** — Organization → Location → Service → Queue → Counter hierarchy
3. **Token Engine** — Token issuance, state machine, capacity, idempotency, step away, expiration
4. **Staff Operations** — CALL NEXT (concurrency-safe), recall, complete, skip, no-show
5. **Realtime** — WebSocket/STOMP event broadcasting (AFTER_COMMIT)
6. **Administration & Analytics** — Staff management, queue config, dashboards, audit logs

---

## Technology Stack

| Component | Choice |
|-----------|--------|
| Language | Java 17 (Temurin 17.0.20+8) |
| Framework | Spring Boot 3.2.5 |
| Build | Maven 3.9.6 (via wrapper) |
| Database | PostgreSQL 15+ |
| Migrations | Flyway 9.22.3 |
| Security | Spring Security + JWT (jjwt 0.12.x) — Phase 1 |
| Realtime | WebSocket + STOMP — Phase 5 |
| Validation | Jakarta Bean Validation |
| Testing | JUnit 5 + Testcontainers PostgreSQL 1.21.4 |

---

## Architecture

**Style:** Modular Monolith (Layered)

```
Frontend (React/TS PWA)
    ↓ HTTP REST / WebSocket STOMP
Controller Layer
    ↓
Spring Security / Authorization
    ↓
Application Service Layer
    ↓
Domain / Business Rules
    ↓
Repository Layer
    ↓
PostgreSQL 15+
```

**Package root:** `com.align.qms`
**Backend root:** `backend/`

---

## Database

- **Engine:** PostgreSQL 15+
- **Migrations:** Flyway (`classpath:db/migration`)
- **Schema document:** `/docs/DATABASE.md`

Core tables (later phases): `organizations`, `locations`, `services`, `queues`, `counters`, `users`, `tokens`, `token_events`, `audit_logs`, `refresh_tokens`

Phase 0 tables: `schema_info`

---

## Authentication

Phase 1 — not in Phase 0.

---

## Authorization

Phase 1 — not in Phase 0.

---

## Tenant Model

- **Strategy:** Application-level isolation (NOT PostgreSQL RLS)
- **Enforcement:** JWT `orgId` claim → security context → AOP aspect → repository filtering → service validation
- **Boundary:** Organization is the tenant boundary. All resources scoped to `org_id`.
- **ADR:** ADR-005
- **Phase:** 1+ (not Phase 0)

---

## Current Phase

**Phase 0 — FOUNDATION: ✅ COMPLETE**
**Phase 1 — SECURITY: ✅ COMPLETE**

### Phase 1 — What is validated (2026-09-07)

- ✅ Spring Security 6 (stateless, JWT, CSRF disabled, HTTP Basic disabled)
- ✅ BCrypt password encoding (strength 12)
- ✅ JWT access tokens — HS512, signed, expiry 15 min (jjwt 0.12.6)
- ✅ Refresh tokens — SHA-256 hashed, rotation on use, 7-day expiry
- ✅ `JwtAuthenticationFilter` — per-request JWT validation
- ✅ `UserDetailsServiceImpl` — load by email (login) and by UUID (filter)
- ✅ `TenantContext` — reads orgId/role from SecurityContext, not client input
- ✅ `UserPrincipal` — Spring Security principal with role + tenant scope
- ✅ POST /api/v1/auth/login — valid credentials → 200, tokens, user info
- ✅ POST /api/v1/auth/refresh — valid refresh token → new access token (rotation)
- ✅ POST /api/v1/auth/logout — revokes all refresh tokens for user → 204
- ✅ GET /api/v1/auth/me — returns authenticated user from SecurityContext
- ✅ 401 on missing/invalid/expired/tampered JWT
- ✅ 401 on invalid credentials (INVALID_CREDENTIALS — no account enumeration)
- ✅ 401 on INACTIVE account (ACCOUNT_DISABLED)
- ✅ 403 via AccessDeniedHandler (insufficient role)
- ✅ 422 on validation failures (VALIDATION_ERROR)
- ✅ TenantContext.requireSameTenant blocks cross-tenant access
- ✅ V2__security.sql — organizations stub + users + refresh_tokens
- ✅ Full test suite: **30 tests PASS, 0 failures, 0 errors**

**Phase 1 Test Environment:**
- Docker Server: 29.7.2
- Testcontainers: 1.21.4
- PostgreSQL: 15.19-alpine (containerized, shared static lifecycle)
- Apache HttpClient 5 (test scope, for TestRestTemplate)
- AlignApplicationTest: 4/4 PASS
- SecurityIntegrationTest: 26/26 PASS
- Total: **30 tests PASS**

### Phase 0 — What is validated

- ✅ `backend/` directory structure
- ✅ `pom.xml` with correct Phase 0 dependencies
- ✅ Maven Wrapper (`mvnw.cmd`, maven-wrapper.jar downloaded)
- ✅ `AlignApplication.java` main class
- ✅ `application.yml` + dev/prod/test profiles
- ✅ `logback-spring.xml` structured logging
- ✅ `V1__foundation.sql` Flyway migration
- ✅ Exception handling framework: `GlobalExceptionHandler`, base exceptions, `ErrorResponse`
- ✅ Test infrastructure: `PostgresIntegrationTest` base class, `AlignApplicationTest` (4 tests)
- ✅ Maven compilation: **BUILD SUCCESS**
- ✅ Test execution: **4 tests PASS, 0 failures**
- ✅ Flyway V1 migration execution verified
- ✅ `/actuator/health` endpoint verified (HTTP 200)

---

## Current Status

| Component | Status |
|-----------|--------|
| Backend code | ✅ Implemented |
| Maven compilation | ✅ BUILD SUCCESS |
| Spring Security | ✅ COMPLETE (Phase 1) |
| JWT authentication | ✅ COMPLETE (Phase 1) |
| Refresh tokens | ✅ COMPLETE (Phase 1) |
| TenantContext / RBAC | ✅ COMPLETE (Phase 1) |
| Flyway V1 + V2 | ✅ VERIFIED (migrations executed) |
| Test execution | ✅ 30 tests PASS, 0 failures |
| Application startup | ✅ VERIFIED (Testcontainers PostgreSQL) |
| Frontend | ✅ Complete (mock store, no backend integration) |
| Architecture docs | ✅ Complete |
| ADRs | ✅ Complete (ADR-001 through ADR-011) |
| Business Rules | ✅ Complete (BR-001 through BR-013) |
| WebSocket/STOMP | ⏳ Phase 5 |
| Token Engine | ⏳ Phase 3 |
| Staff Operations | ⏳ Phase 4 |

---

## Important Constraints

1. **Never use H2 for PostgreSQL-specific tests** — use Testcontainers
2. **Token numbers are atomic per-queue counters** (`queues.next_token_number`) — NOT sequences, NOT MAX()+1
3. **CALL NEXT uses `SELECT FOR UPDATE SKIP LOCKED`** — mandatory, not optional
4. **WebSocket events publish AFTER transaction commit** — `@TransactionalEventListener(AFTER_COMMIT)`
5. **Idempotency is database-enforced** — UNIQUE constraint + conflict handling, not check-then-insert
6. **No AI implementation** — capture data foundation only
7. **No payment, SMS, WhatsApp, IoT** — not in scope
8. **Frontend is integration contract** — APIs must be compatible

---

## Critical Architecture Decisions

See `/docs/DECISIONS.md` for all ADRs.

| ADR | Summary |
|-----|---------|
| ADR-001 | Token numbering: atomic counter in `queues.next_token_number` |
| ADR-002 | Token event history: separate `token_events` table |
| ADR-003 | Idempotency: database UNIQUE constraint + conflict handling |
| ADR-004 | Active token states: `{WAITING, AWAY, CALLED, IN_SERVICE}` |
| ADR-005 | Tenant isolation: application-level (not PostgreSQL RLS) |
| ADR-006 | Test DB: Testcontainers PostgreSQL for concurrency tests |
| ADR-007 | CALL NEXT: `SELECT FOR UPDATE SKIP LOCKED` |
| ADR-008 | WebSocket timing: `@TransactionalEventListener(AFTER_COMMIT)` |
| ADR-009 | State machine: entity-level transition validation |
| ADR-010 | ML data foundation: capture now, no AI implementation |
