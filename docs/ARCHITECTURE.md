# ALIGN BACKEND — ARCHITECTURE

**Version:** 1.0
**Last Updated:** 2026-09-05
**Status:** PLANNED — Implementation NOT YET STARTED

> NOTE: This document describes the approved target architecture.
> No backend code exists yet. Update this document as implementation progresses
> to reflect only what is actually implemented and validated.

---

## Module Structure

```
backend/
└── src/main/java/com/align/qms/
    ├── config/           Spring configuration classes
    ├── security/         JWT, filter, principal, tenant context
    ├── controller/       REST controllers (entry points)
    ├── service/          Business logic / application services
    ├── repository/       Spring Data JPA repositories
    ├── entity/           JPA entities
    ├── dto/
    │   ├── request/      Inbound API request objects
    │   └── response/     Outbound API response objects
    ├── mapper/           Entity ↔ DTO conversion
    ├── exception/        Custom exceptions + GlobalExceptionHandler
    ├── validation/       Custom Jakarta validators
    ├── websocket/        WebSocket config + event publishers
    ├── scheduled/        Background jobs (@Scheduled)
    └── util/             Utility classes, constants
```

---

## Request Flow

```
HTTP Request
    ↓
JwtAuthenticationFilter
    → validates Bearer token
    → sets SecurityContext (UserPrincipal)
    ↓
Spring Security (HttpSecurity)
    → public vs. protected routing
    ↓
Controller (@RestController)
    → @Valid on request body
    → extract path/query params
    ↓
@PreAuthorize (role check)
    ↓
Application Service
    → tenant ownership validation
    → business rule enforcement
    → domain operation
    → TokenEvent recording (within same transaction)
    → ApplicationEventPublisher.publishEvent() (domain event, not yet broadcast)
    ↓
Repository (JPA / JDBC)
    ↓
PostgreSQL
    ↓
Transaction commits
    ↓
@TransactionalEventListener(AFTER_COMMIT)
    → WebSocket broadcast (if realtime event)
    ↓
Response DTO → JSON
```

---

## Authentication

**Mechanism:** HTTP Bearer JWT
**Filter:** `JwtAuthenticationFilter` — runs before every request
**Token structure:**
```json
{
  "sub": "<userId UUID>",
  "orgId": "<orgId UUID>",
  "role": "STAFF|ORG_ADMIN|PLATFORM_ADMIN",
  "locationId": "<locationId UUID or null>",
  "iat": 1698000000,
  "exp": 1698000900
}
```
**Secret:** Environment variable `JWT_SECRET` — never hardcoded
**Access token TTL:** 15 minutes
**Refresh token TTL:** 7 days, stored in `refresh_tokens` table

---

## Authorization

**RBAC:** `@PreAuthorize("hasRole('STAFF')")` or `hasAnyRole(...)` on all protected endpoints.
**Tenant check:** Service layer verifies `resource.orgId == UserPrincipal.orgId` for every org-scoped operation.
**Object-level:** Resources are fetched and ownership verified before any mutation.
**PLATFORM_ADMIN exception:** Read-only cross-tenant access. Cannot perform operational actions (CALL NEXT, complete, configure org queues).

---

## Tenant Isolation

**Strategy:** Application-level (NOT PostgreSQL RLS — see ADR-005)

**Layers:**
1. JWT `orgId` claim injected at login, not trusted from client input
2. `UserPrincipal.getOrgId()` extracted from validated SecurityContext
3. AOP `@RequireTenantAccess` aspect validates org ownership on annotated service methods
4. Repository queries always filter by `org_id`
5. Service layer independently verifies ownership before mutations

---

## Database Architecture

- **Engine:** PostgreSQL 15+
- **Migrations:** Flyway, sequential versioned scripts `V1__...` through `V12__...`
- **JPA mode:** `ddl-auto: validate` (Flyway owns all schema changes)
- **Connection pool:** HikariCP, max 10 connections (development)
- **Full schema:** See `/docs/DATABASE.md`

---

## Transaction Boundaries

Critical transactional operations:
- `TokenService.joinQueue()` — capacity check + atomic counter increment + token insert
- `StaffOperationsService.callNext()` — lock token row + update token + update counter
- `StaffOperationsService.completeService()` — update token + clear counter
- `TokenService.activateStepAway()` — update token state + set expiry timestamp
- `StepAwayExpirationJob.expireStepAwayTokens()` — batch AWAY→EXPIRED transitions

`@Transactional` is applied deliberately at the service method level.
`TokenEventService.recordEvent()` uses `Propagation.MANDATORY` — must always run inside an existing transaction.

---

## Concurrency Strategy

**Token issuance:**
- `UPDATE queues SET next_token_number = next_token_number + 1 WHERE id = ? RETURNING next_token_number`
- Atomic at DB level; no application-side counter
- Backed by `UNIQUE(queue_id, token_number)` as safety net

**CALL NEXT:**
- `SELECT * FROM tokens WHERE queue_id = ? AND state = 'WAITING' ORDER BY joined_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
- Guarantees zero duplicate token assignments under concurrent staff operations

**Idempotency:**
- `UNIQUE(idempotency_key)` partial index on `tokens` table
- Service catches `DataIntegrityViolationException` and returns existing token

**Capacity enforcement:**
- Capacity count inside same transaction as token insert
- `FOR UPDATE` on queue row prevents race on capacity check + insert

---

## Realtime Architecture

**Protocol:** STOMP over WebSocket
**Endpoint:** `/ws-align` (SockJS fallback)

**Topics:**
- `/topic/tenant/{orgId}/location/{locId}/public` — called token number + counter number, NO customer PII
- `/topic/tenant/{orgId}/location/{locId}/staff` — full event detail for staff console
- `/topic/token/{tokenId}` — customer-specific state updates

**Publishing strategy:**
1. Service publishes `ApplicationEvent` (in-memory) during transaction
2. `@TransactionalEventListener(AFTER_COMMIT)` listener receives event only after DB commit
3. `SimpMessagingTemplate` broadcasts to topics

**Rollback safety:** If transaction rolls back, Spring discards the pending event — no false broadcast.

---

## Event Architecture

**Domain events (in-process Spring events):**
- `TokenCalledEvent`, `TokenCompletedEvent`, `TokenCancelledEvent`, etc.
- Published via `ApplicationEventPublisher.publishEvent()`
- Consumed by `WebSocketEventPublisher` with `@TransactionalEventListener(AFTER_COMMIT)`

**Token lifecycle events (database):**
- Every state transition recorded in `token_events` table via `TokenEventService`
- Required for analytics, audit, and ML data foundation (ADR-010)

---

## Background Jobs

| Job | Trigger | Purpose |
|-----|---------|---------|
| `StepAwayExpirationJob` | `@Scheduled(fixedRate=60000)` | Expire AWAY tokens past `step_away_expires_at` |

All scheduled jobs must be:
- Idempotent (safe to run twice)
- Transactionally wrapped
- Observable (logged)

---

## External Integrations

**None in current scope.**

Out of scope: SMS, WhatsApp, payment, email notifications, IoT, AI/ML inference.

---

## Deployment

**Development:** Local JAR + local PostgreSQL or Docker Compose
**Configuration:** Environment variables via `.env` (never committed)
**See:** `/docs/DEPLOYMENT.md` (to be created in Phase 8)

---

## Observability

- Structured logging via Logback + SLF4J
- Request correlation (to be added)
- `GET /actuator/health` — Spring Boot Actuator
- Security events logged (failed auth, tenant access denials)
- Never log: passwords, JWT tokens, secrets, sensitive PII

---

## Implementation Status

| Module | Status |
|--------|--------|
| Foundation (Spring Boot + Flyway + DB) | NOT STARTED |
| Security (JWT + RBAC) | NOT STARTED |
| Organization Domain | NOT STARTED |
| Token Engine | NOT STARTED |
| Staff Operations | NOT STARTED |
| Realtime (WebSocket) | NOT STARTED |
| Administration & Analytics | NOT STARTED |
| Testing | NOT STARTED |
| Documentation | ARCHITECTURE COMPLETE |

---

**Last Updated:** 2026-09-05
**Next Review:** After Phase 0 completion — update to reflect actual implementation
