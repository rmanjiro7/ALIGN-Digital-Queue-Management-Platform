# ALIGN BACKEND — ARCHITECTURE CORRECTIONS SUMMARY

**Date:** 2026-09-01  
**Status:** ✅ COMPLETE  
**Next Phase:** PHASE 0 IMPLEMENTATION

---

## CORRECTIONS APPLIED

### 1. ✅ Token Number Generation Strategy (MANDATORY CORRECTION)

**Previous:** Per-queue PostgreSQL sequence objects  
**Corrected:** Atomic counter in `queues` table

**Implementation:**
```sql
-- queues table
ALTER TABLE queues ADD COLUMN next_token_number BIGINT DEFAULT 1;

-- Atomic increment
UPDATE queues 
SET next_token_number = next_token_number + 1 
WHERE id = ? 
RETURNING next_token_number;
```

**Rationale:**
- Simpler than dynamic sequence management
- Equally atomic
- No sequence creation/cleanup needed per queue
- Easier to reset/configure starting values

**Documented in:** ADR-001 (DECISIONS.md)

---

### 2. ✅ Token Event History Model (MANDATORY CORRECTION)

**Added:** Separate `token_events` table for lifecycle event tracking

**Schema:**
```sql
CREATE TABLE token_events (
    id UUID PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES tokens(id),
    event_type VARCHAR(50) NOT NULL,
    from_state VARCHAR(20),
    to_state VARCHAR(20),
    counter_id UUID REFERENCES counters(id),
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Event Types:**
- `TOKEN_CREATED`
- `TOKEN_CALLED`
- `TOKEN_RECALLED`
- `TOKEN_SERVING_STARTED`
- `TOKEN_COMPLETED`
- `TOKEN_SKIPPED`
- `TOKEN_NO_SHOW`
- `TOKEN_CANCELLED`
- `TOKEN_STEP_AWAY_STARTED`
- `TOKEN_STEP_AWAY_RETURNED`
- `TOKEN_STEP_AWAY_EXPIRED`

**Separation from AuditLog:**
- **token_events:** Token lifecycle/journey (for analytics, ML training)
- **audit_logs:** Administrative actions (for security audit, compliance)

**Documented in:** ADR-002 (DECISIONS.md), DATABASE.md, BR-013 (BUSINESS_RULES.md)

---

### 3. ✅ Idempotency Handling (MANDATORY CORRECTION)

**Previous:** Check-then-insert pattern (race condition vulnerable)  
**Corrected:** Database-enforced uniqueness + conflict handling

**Implementation:**
```sql
CREATE UNIQUE INDEX idx_tokens_idempotency 
ON tokens(idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    try {
        // Attempt insert
        Token token = createAndSaveToken(request);
        return token;
        
    } catch (DataIntegrityViolationException ex) {
        // Unique constraint violation
        if (isIdempotencyKeyConflict(ex)) {
            return tokenRepository.findByIdempotencyKey(request.getIdempotencyKey())
                .orElseThrow(...);
        }
        throw ex;
    }
}
```

**Rationale:**
- Database constraint prevents race conditions
- Transaction-safe
- Handles concurrent requests with same key correctly

**Documented in:** ADR-003 (DECISIONS.md), BR-009 (BUSINESS_RULES.md)

---

### 4. ✅ Active Token Definition (MANDATORY CORRECTION)

**Defined:** Authoritative definition of "active token"

**Active States:**
```java
public static final Set<TokenState> ACTIVE_STATES = Set.of(
    TokenState.WAITING,
    TokenState.AWAY,
    TokenState.CALLED,
    TokenState.IN_SERVICE
);
```

**Terminal States (NOT active):**
```java
COMPLETED, NO_SHOW, CANCELLED, EXPIRED
```

**Used consistently in:**
- Queue capacity checks
- Queue statistics
- Dashboard analytics
- Repository queries
- All service methods

**Documented in:** ADR-004 (DECISIONS.md), BR-001 (BUSINESS_RULES.md)

---

### 5. ✅ Tenant Isolation Clarification (MANDATORY CORRECTION)

**Previous:** Mentioned PostgreSQL Row-Level Security (RLS)  
**Corrected:** Application-level tenant isolation (NOT database RLS)

**Implementation Layers:**
1. JWT claims (orgId)
2. Spring Security authorization
3. AOP aspect-oriented filtering
4. Repository method-level filtering
5. Service layer validation

**⚠️ NOT using PostgreSQL Row-Level Security policies.**

**If RLS is added later:**
- Requires separate ADR
- Update all documentation
- Test connection pool behavior
- Update deployment documentation

**Documented in:** ADR-005 (DECISIONS.md), BR-004 (BUSINESS_RULES.md)

---

### 6. ✅ Test Database Strategy (MANDATORY CORRECTION)

**Previous:** Allowed H2 for PostgreSQL-specific tests  
**Corrected:** Testcontainers with PostgreSQL for critical tests

**Must use real PostgreSQL for:**
- Concurrent token issuance test
- Concurrent CALL NEXT test
- `SELECT FOR UPDATE SKIP LOCKED` behavior
- Unique constraint conflict handling
- Idempotency key conflicts
- Transaction isolation tests

**H2 Optional for:**
- Simple CRUD unit tests
- Fast entity validation tests
- Non-PostgreSQL-specific logic

**Configuration:**
```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
public abstract class PostgresIntegrationTest {
    
    @Container
    private static final PostgreSQLContainer<?> postgres = 
        new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("align_test")
            .withUsername("test")
            .withPassword("test")
            .withReuse(true);
}
```

**Documented in:** ADR-006 (DECISIONS.md), TESTING.md

---

### 7. ✅ CALL NEXT Concurrency (CONFIRMED CORRECT)

**Strategy:** `SELECT FOR UPDATE SKIP LOCKED` (PostgreSQL 9.5+)

**No changes required** — already correctly specified.

**Query:**
```sql
SELECT * FROM tokens 
WHERE queue_id = :queueId 
  AND state = 'WAITING'
ORDER BY joined_at ASC, id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**Acceptance Test Required:**
- 10 concurrent staff CALL NEXT
- Zero duplicate assignments
- Must run against PostgreSQL (Testcontainers)

**Documented in:** ADR-007 (DECISIONS.md), BR-007 (BUSINESS_RULES.md)

---

### 8. ✅ WebSocket Event Timing (CONFIRMED CORRECT)

**Strategy:** `@TransactionalEventListener(phase = AFTER_COMMIT)`

**No changes required** — already correctly specified.

**Implementation:**
```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handleTokenCalled(TokenCalledEvent event) {
    messagingTemplate.convertAndSend("/topic/...", event);
}
```

**Ensures:** Events never broadcast before database commit.

**Documented in:** ADR-008 (DECISIONS.md)

---

### 9. ✅ Token State Machine Enforcement (CONFIRMED CORRECT)

**Strategy:** Entity-level state transition validation

**No changes required** — already correctly specified.

**Implementation:**
```java
@Entity
public class Token {
    public void transitionTo(TokenState targetState) {
        if (!this.state.canTransitionTo(targetState)) {
            throw new InvalidTokenStateException(...);
        }
        this.state = targetState;
    }
}
```

**Controllers:** Only expose business operations (join, call-next, complete), NOT direct state changes.

**Documented in:** ADR-009 (DECISIONS.md), BR-002 (BUSINESS_RULES.md)

---

### 10. ✅ Future Intelligence Data Foundation (CONFIRMED CORRECT)

**Strategy:** Capture accurate operational data, DO NOT implement AI now

**Data Captured:**
- Token events (complete lifecycle)
- Service durations (called_at → completed_at)
- Queue patterns (hourly volume)
- Counter utilization
- Step Away behavior
- No-show rates

**Future ML Use Cases (NOT implemented now):**
- Wait time prediction
- Demand forecasting
- Queue overload prediction
- Staffing recommendations
- Intelligent routing

**Documented in:** ADR-010 (DECISIONS.md)

---

### 11. ✅ Roadmap Status Correction (MANDATORY CORRECTION)

**Previous:** Some phases marked as partially complete  
**Corrected:** All phases marked as NOT STARTED

**Current Implementation Status:**
- Phase 0 (Foundation): ❌ NOT STARTED
- Phase 1 (Security): ❌ NOT STARTED
- Phase 2 (Organization Domain): ❌ NOT STARTED
- Phase 3 (Token Engine): ❌ NOT STARTED
- Phase 4 (Staff Operations): ❌ NOT STARTED
- Phase 5 (Realtime): ❌ NOT STARTED
- Phase 6 (Admin & Analytics): ❌ NOT STARTED
- Phase 7 (Testing): ❌ NOT STARTED
- Phase 8 (Documentation): ✅ ARCHITECTURE COMPLETE

**Documented in:** TODO.md

---

### 12. ✅ Documentation Updates (MANDATORY CORRECTION)

**Created/Updated:**
- ✅ `/docs/DECISIONS.md` — 10 Architecture Decision Records
- ✅ `/docs/BUSINESS_RULES.md` — 13 Business Rules (BR-001 through BR-013)
- ✅ `/docs/DATABASE.md` — Complete schema with corrections
- ✅ `/docs/TESTING.md` — Test strategy with Testcontainers
- ✅ `/docs/TODO.md` — Implementation checklist (all phases NOT STARTED)
- ✅ `/docs/BACKEND_ARCHITECTURE_PLAN.md` — Corrected architecture plan
- ✅ `/docs/ARCHITECTURE_CORRECTIONS_SUMMARY.md` — This document

**All documentation reflects actual repository state (no backend yet).**

---

## FILES CREATED/UPDATED

| File | Status | Purpose |
|------|--------|---------|
| `/docs/DECISIONS.md` | ✅ CREATED | Architecture Decision Records (ADR-001 to ADR-010) |
| `/docs/BUSINESS_RULES.md` | ✅ CREATED | Business Rules (BR-001 to BR-013) |
| `/docs/DATABASE.md` | ✅ CREATED | Complete PostgreSQL schema with token_events |
| `/docs/TESTING.md` | ✅ CREATED | Test strategy with Testcontainers requirements |
| `/docs/TODO.md` | ✅ CREATED | Phase-by-phase implementation checklist |
| `/docs/BACKEND_ARCHITECTURE_PLAN.md` | ✅ UPDATED | Corrected token generation, tenant isolation notes |
| `/docs/BACKEND_INSPECTION_REPORT.md` | ✅ EXISTING | Original inspection (reference only) |
| `/docs/ARCHITECTURE_CORRECTIONS_SUMMARY.md` | ✅ CREATED | This summary document |

---

## FINAL ARCHITECTURE DECISIONS

| Decision | Choice | ADR |
|----------|--------|-----|
| **Token Number Generation** | Atomic counter in `queues.next_token_number` | ADR-001 |
| **Token Event History** | Separate `token_events` table | ADR-002 |
| **Idempotency** | Database UNIQUE constraint + conflict handling | ADR-003 |
| **Active Token Definition** | `{WAITING, AWAY, CALLED, IN_SERVICE}` | ADR-004 |
| **Tenant Isolation** | Application-level (NOT PostgreSQL RLS) | ADR-005 |
| **Test Database** | Testcontainers PostgreSQL for concurrency tests | ADR-006 |
| **CALL NEXT Concurrency** | `SELECT FOR UPDATE SKIP LOCKED` | ADR-007 |
| **WebSocket Timing** | `@TransactionalEventListener(AFTER_COMMIT)` | ADR-008 |
| **State Machine** | Entity-level transition validation | ADR-009 |
| **ML Foundation** | Capture data, DO NOT implement AI now | ADR-010 |

---

## REMAINING AMBIGUITIES

### None

All ambiguities from the inspection report have been resolved through ADRs.

If new ambiguities arise during implementation:
1. Document in `/docs/DECISIONS.md`
2. Create new ADR with justification
3. Update affected documentation

---

## CRITICAL TESTS REQUIRED

### Phase 3 (Token Engine)
1. **Concurrent Token Issuance Test** ⚠️ MANDATORY
   - 100 concurrent join requests
   - Zero duplicate token numbers
   - Must use Testcontainers PostgreSQL

### Phase 4 (Staff Operations)
2. **Concurrent CALL NEXT Test** ⚠️ MANDATORY
   - 10 concurrent CALL NEXT operations
   - Zero duplicate token assignments
   - Must use Testcontainers PostgreSQL

### Phase 1 (Security)
3. **Tenant Isolation Test** ⚠️ MANDATORY
   - Org A user cannot access Org B resources
   - Must verify at service + repository layers

### Phase 3 (Token Engine)
4. **Idempotency Conflict Test** ⚠️ MANDATORY
   - Concurrent requests with same idempotency key
   - Only one token created
   - Must use Testcontainers PostgreSQL

---

## NEXT IMMEDIATE ACTION

**START PHASE 0: FOUNDATION**

1. Create `backend/` directory in repository root
2. Initialize Maven project (`pom.xml`)
3. Create Spring Boot main class
4. Configure PostgreSQL connection
5. Setup Flyway migrations
6. Verify application starts successfully

**Command:**
```bash
cd d:\align\ALIGN-Digital-Queue-Management-Platform
mkdir backend
cd backend
# Initialize Maven Spring Boot project
```

---

## SUMMARY

### ✅ What Was Corrected
1. Token generation strategy (counter vs. sequences)
2. Token event history (separate table added)
3. Idempotency handling (database-enforced)
4. Active token definition (explicit state set)
5. Tenant isolation clarity (application-level, NOT RLS)
6. Test database requirements (Testcontainers for critical tests)
7. Roadmap status (all phases marked NOT STARTED)
8. Complete documentation suite created

### ✅ What Was Confirmed Correct
1. CALL NEXT concurrency strategy (`SKIP LOCKED`)
2. WebSocket event timing (`AFTER_COMMIT`)
3. Token state machine enforcement (entity-level)
4. Future ML data foundation (capture now, implement later)

### ❌ What Was NOT Changed
- No code implementation (none exists yet)
- No database setup (not created yet)
- No frontend modifications (frontend complete)

### ✅ Documents Ready
- Architecture Plan
- Database Schema
- Business Rules
- Architecture Decisions
- Testing Strategy
- Implementation TODO

---

**Architecture Correction Status:** ✅ COMPLETE  
**Implementation Status:** ❌ NOT STARTED  
**Next Phase:** PHASE 0 - FOUNDATION  
**Ready to Implement:** ✅ YES

**Date Completed:** 2026-09-01
