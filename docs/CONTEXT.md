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

## Current Phase & Verification Status

**All Phases 0 through 8 are COMPLETE and VERIFIED ✅**

- **Phase 0 (Foundation):** Spring Boot 3.2.5, PostgreSQL 15, Actuator, Flyway baseline.
- **Phase 1 (Security):** JWT HS512, Refresh Tokens, RBAC, TenantContext isolation.
- **Phase 2 (Organization Domain):** Organization, Location, Service, Queue, Counter CRUD & guards.
- **Phase 3 (Token Engine):** Atomic sequence, Queue capacity enforcement, Idempotency, 15m Grace step-away.
- **Phase 4 (Staff Operations):** Concurrency-safe calling (`SKIP LOCKED`), Serve, Complete, Transfer, Recall, No-show.
- **Phase 5 (Realtime):** WebSocket STOMP broker (`/ws-align`), transaction-bound `AFTER_COMMIT` publishing.
- **Phase 6 (Admin & Analytics):** Historical metric aggregation (Summary, Queues, Traffic, Services, Counters), audit logs.
- **Phase 7 (Hardening):** Structured operating hours, SMS consent, Rate limiting filter, concurrency stress tests.
- **Phase 8 (MVP Gaps & E2E):** Preparation requirements, announcements, public TV audio chime, Puppeteer E2E suites.
- **Platform Stabilization:** Single-command launch orchestrator (`start.ps1`, `start.bat`), defensive frontend normalization, error boundary.

---

## Current Status Matrix

| Component | Status | Validation Reference |
| :--- | :--- | :--- |
| **Backend Codebase** | ✅ COMPLETE | 217/217 Tests Passing via Maven Surefire & Failsafe |
| **Spring Security & Auth** | ✅ COMPLETE | `SecurityIntegrationTest`, `UserManagementIntegrationTest` |
| **Flyway Schema (V1–V16)** | ✅ COMPLETE | `DATABASE.md`, verified against PostgreSQL 15 |
| **Concurrency & Queuing** | ✅ COMPLETE | `SkipLockedConcurrencyTest`, `QueueCapacityConcurrencyTest` |
| **Realtime WebSocket** | ✅ COMPLETE | `/ws-align` STOMP topics verified in E2E tests |
| **Frontend PWA** | ✅ COMPLETE | React 19 + TypeScript (`bun run lint` & `bun run build` pass) |
| **Automated End-to-End** | ✅ COMPLETE | Multi-role Puppeteer suite passes 9/9 screens with 0 errors |
| **Single-Command Launcher** | ✅ COMPLETE | `start.ps1`, `start.ps`, `start.bat` verified |

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
