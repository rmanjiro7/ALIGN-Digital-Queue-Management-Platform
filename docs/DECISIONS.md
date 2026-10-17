# ALIGN BACKEND — ARCHITECTURE DECISION RECORDS (ADR)

**Version:** 1.1  
**Last Updated:** 2026-09-01  
**Status:** APPROVED

---

## ADR-001: Token Number Generation Strategy

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Token numbers must be generated atomically to prevent duplicates under concurrent requests.

### Decision

Use **atomic per-queue counter** stored in the `queues` table.

**Implementation:**
```sql
-- Add column to queues table
ALTER TABLE queues ADD COLUMN next_token_number BIGINT DEFAULT 1;

-- Atomic increment
UPDATE queues 
SET next_token_number = next_token_number + 1 
WHERE id = ? 
RETURNING next_token_number;
```

**Token Number Format:**
```
{tokenPrefix}-{paddedNumber}
Example: A-043, B-105, C-012
```

### Rationale

**Why NOT PostgreSQL sequence objects:**
- Queues are dynamically created by organization admins
- Creating/managing one sequence per queue adds operational complexity
- Sequences would need dynamic creation, naming, and cleanup
- Counter approach is simpler and equally atomic

**Why atomic counter:**
- Single UPDATE statement guarantees atomicity
- `RETURNING` clause provides value in same transaction
- No gap/collision issues under concurrent load
- Simpler database schema
- Easier to reset/configure per-queue starting values

### Constraints

```sql
-- Prevent duplicate token numbers
ALTER TABLE tokens 
ADD CONSTRAINT uq_token_number_queue UNIQUE(queue_id, token_number);

-- Prevent negative counters
ALTER TABLE queues
ADD CONSTRAINT chk_next_token_positive CHECK (next_token_number >= 1);
```

### Alternatives Considered

| Alternative | Rejected Reason |
|------------|-----------------|
| PostgreSQL sequence per queue | Dynamic sequence management complexity |
| `max(token_number) + 1` in application | NOT atomic, race condition vulnerability |
| UUID token numbers | Frontend/PRD requires human-readable format (A-042) |
| Global counter | Violates per-queue numbering requirement |

---

## ADR-002: Token Event History Model

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Need comprehensive token lifecycle tracking separate from general audit logs.

### Decision

Create separate **TokenEvent** entity/table to record token lifecycle events.

**Schema:**
```sql
CREATE TABLE token_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    from_state VARCHAR(20),
    to_state VARCHAR(20),
    counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_events_token ON token_events(token_id, created_at DESC);
CREATE INDEX idx_token_events_type ON token_events(event_type);
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

### Separation of Concerns

| Table | Purpose | Use Case |
|-------|---------|----------|
| **token_events** | Token lifecycle history | Customer journey, analytics, wait time analysis, ML training data |
| **audit_logs** | Administrative actions | Security audit, compliance, actor accountability, system operations |

**Example Distinction:**
- Token #A-042 called to Counter 3 → `TokenEvent` (lifecycle event)
- Admin disables Queue "Walk-In Triage" → `AuditLog` (administrative action)

### Benefits

1. **Analytics Foundation:** Clean event stream for wait time analysis
2. **ML Readiness:** Historical patterns for AI prediction models
3. **Customer Timeline:** Complete journey reconstruction
4. **Performance:** Separate indexes/queries don't mix lifecycle + audit data
5. **Retention Policies:** Can archive old token events without losing audit trail

---

## ADR-003: Idempotency Strategy

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Network retries must not create duplicate tokens.

### Decision

Use **database-enforced idempotency** with unique constraint + conflict handling.

**Implementation:**

1. **Database Constraint:**
```sql
CREATE UNIQUE INDEX idx_tokens_idempotency 
ON tokens(idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

2. **Service Layer (PostgreSQL-specific):**
```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    try {
        // Attempt insert with idempotency key
        Token token = createAndSaveToken(request);
        publishTokenCreatedEvent(token);
        return token;
        
    } catch (DataIntegrityViolationException ex) {
        // Unique constraint violation on idempotency_key
        if (isIdempotencyKeyConflict(ex)) {
            // Retrieve existing token
            return tokenRepository.findByIdempotencyKey(request.getIdempotencyKey())
                .orElseThrow(() -> new TokenNotFoundException(
                    "Token with idempotency key exists but could not be retrieved"
                ));
        }
        throw ex;
    }
}
```

### Why NOT Check-Then-Insert

**Vulnerable Pattern (DO NOT USE):**
```java
// ❌ UNSAFE — Race condition
Optional<Token> existing = tokenRepository.findByIdempotencyKey(key);
if (existing.isPresent()) {
    return existing.get();
}
Token token = tokenRepository.save(newToken); // Concurrent request can insert here
```

**Problem:** Between check and insert, another request can create the token.

### Idempotency Key Format

**Client-Provided:**
```
{clientId}-{timestamp}-{random}
Example: customer-app-1698156000-a3f9d
```

**Requirements:**
- Max length: 100 characters
- Unique per join request
- Client must generate and persist before API call
- Valid for 24 hours (cleanup policy)

### Cleanup Policy

```java
@Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
public void cleanupExpiredIdempotencyKeys() {
    Instant cutoff = Instant.now().minus(Duration.ofDays(7));
    tokenRepository.deleteIdempotencyKeysOlderThan(cutoff);
}
```

---

## ADR-004: Active Token Definition

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Queue capacity enforcement requires authoritative definition of "active".

### Decision

**Active Token States:**
```java
public enum TokenState {
    // ACTIVE STATES (count toward capacity)
    WAITING,
    AWAY,
    CALLED,
    IN_SERVICE,
    
    // TERMINAL STATES (do not count toward capacity)
    COMPLETED,
    NO_SHOW,
    CANCELLED,
    EXPIRED
}

public static final Set<TokenState> ACTIVE_STATES = Set.of(
    TokenState.WAITING,
    TokenState.AWAY,
    TokenState.CALLED,
    TokenState.IN_SERVICE
);
```

### Consistent Usage

**1. Capacity Check (Token Join):**
```java
long activeCount = tokenRepository.countByQueueIdAndStateIn(
    queueId, TokenState.ACTIVE_STATES
);
if (activeCount >= queue.getMaxCapacity()) {
    throw new QueueFullException(queueId);
}
```

**2. Queue Statistics:**
```sql
SELECT COUNT(*) 
FROM tokens 
WHERE queue_id = ? 
  AND state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE');
```

**3. Dashboard Analytics:**
```java
public QueueStatusResponse getQueueStatus(UUID queueId) {
    long activeCount = tokenRepository.countActiveTokens(queueId);
    long waitingCount = tokenRepository.countByQueueIdAndState(queueId, WAITING);
    // ...
}
```

### Rationale

**Why AWAY counts as active:**
- Customer has 15-minute grace period to return
- Queue position preserved
- Operational impact similar to WAITING

**Why CALLED/IN_SERVICE count as active:**
- Still occupying queue resource
- Not yet completed service
- Counter capacity is limited

---

## ADR-005: Tenant Isolation Strategy

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Organization A must never access Organization B resources.

### Decision

Use **application-level tenant isolation** enforced through:
1. Spring Security authorization
2. AOP aspect-oriented filtering
3. Repository method-level filtering
4. Service layer validation

**NOT using PostgreSQL Row-Level Security (RLS).**

### Implementation Layers

**Layer 1: JWT Claims**
```json
{
  "sub": "user-uuid",
  "orgId": "org-abc-uuid",
  "role": "STAFF"
}
```

**Layer 2: Security Context**
```java
@Component
public class TenantContext {
    private static final ThreadLocal<UUID> currentOrgId = new ThreadLocal<>();
    
    public static UUID getCurrentOrgId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return principal.getOrgId();
    }
}
```

**Layer 3: AOP Enforcement**
```java
@Aspect
@Component
public class TenantIsolationAspect {
    
    @Around("@annotation(RequireTenantAccess)")
    public Object enforceTenantAccess(ProceedingJoinPoint joinPoint) {
        UUID requestedOrgId = extractOrgIdFromArguments(joinPoint);
        UUID userOrgId = TenantContext.getCurrentOrgId();
        
        if (!userOrgId.equals(requestedOrgId) && 
            !hasRole("PLATFORM_ADMIN")) {
            throw new UnauthorizedTenantAccessException();
        }
        
        return joinPoint.proceed();
    }
}
```

**Layer 4: Repository Filtering**
```java
@Repository
public interface LocationRepository extends JpaRepository<Location, UUID> {
    
    @Query("SELECT l FROM Location l WHERE l.orgId = :orgId")
    List<Location> findByOrgId(@Param("orgId") UUID orgId);
    
    // Automatic tenant check via method security
    @PreAuthorize("#orgId == authentication.principal.orgId or hasRole('PLATFORM_ADMIN')")
    List<Location> findSecuredByOrgId(UUID orgId);
}
```

### Why NOT PostgreSQL RLS

**Reasons:**
1. Application-level isolation provides sufficient security for this use case
2. RLS adds database-level complexity
3. Connection pooling complications with RLS `SET LOCAL` per request
4. Testing complexity increases
5. Migration path to separate databases per tenant remains open

**If RLS is implemented later:**
- Document in separate ADR
- Update all repository queries
- Test with connection pool behavior
- Update deployment documentation

### Exception: PLATFORM_ADMIN

Platform administrators have **read-only cross-tenant access** for:
- Tenant listing
- Platform-level analytics
- System monitoring

Platform admin **CANNOT:**
- Modify organization operational data
- Call next token
- Complete service
- Configure queues

---

## ADR-006: Integration Test Database

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** PostgreSQL-specific behavior must be tested accurately.

### Decision

Use **Testcontainers with PostgreSQL** for integration tests.

**DO NOT use H2 for PostgreSQL-specific tests.**

### Scope

**Must run against real PostgreSQL:**
1. Concurrent token issuance test
2. Concurrent CALL NEXT test
3. `SELECT FOR UPDATE SKIP LOCKED` behavior
4. Unique constraint violation handling
5. Idempotency key conflict resolution
6. Token counter atomic increment
7. Transaction isolation tests

**Can use H2 (optional):**
- Fast unit tests without external dependencies
- Simple CRUD operations
- Entity validation tests

### Testcontainers Configuration

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
            .withPassword("test");
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

### Rationale

**Why Testcontainers:**
- Real PostgreSQL behavior (locking, concurrency, constraints)
- `SKIP LOCKED` works correctly
- Accurate transaction isolation
- Flyway migrations run against real schema
- CI/CD compatible (Docker required)

**H2 Limitations:**
- Does not support `FOR UPDATE SKIP LOCKED`
- Different transaction isolation behavior
- Different constraint violation messages
- Not PostgreSQL-compatible for complex queries

---

## ADR-007: CALL NEXT Concurrency Strategy

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Multiple staff operators must not retrieve the same waiting token.

### Decision

Use **PostgreSQL `SELECT FOR UPDATE SKIP LOCKED`** inside a transaction.

**Implementation:**
```sql
-- Repository query
SELECT * FROM tokens 
WHERE queue_id = :queueId 
  AND state = 'WAITING'
ORDER BY joined_at ASC, id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**Service Transaction:**
```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public Token callNext(UUID counterId) {
    Counter counter = validateCounterCanCallNext(counterId);
    
    // Acquire row lock on next eligible token
    Token token = tokenRepository.findNextWaitingTokenWithLock(counter.getQueueId())
        .orElseThrow(() -> new NoWaitingTokensException());
    
    // Update token state
    token.transitionTo(TokenState.CALLED);
    token.setCalledAt(Instant.now());
    token.setCounterId(counterId);
    tokenRepository.save(token);
    
    // Update counter
    counter.setCurrentServingTokenId(token.getId());
    counterRepository.save(counter);
    
    // Record event
    tokenEventService.recordEvent(token, TokenEventType.TOKEN_CALLED);
    
    return token;
}
```

### How SKIP LOCKED Works

**Scenario: 2 staff call next simultaneously**

```
Time T0: Staff A begins transaction → locks Token #42
Time T1: Staff B begins transaction → tries Token #42 (LOCKED)
         → SKIP LOCKED → retrieves Token #43 instead
Time T2: Staff A commits → Token #42 state = CALLED, counter = 3
Time T3: Staff B commits → Token #43 state = CALLED, counter = 5
```

**Result:** ✅ No duplicate assignment.

### Acceptance Test

```java
@Test
public void testConcurrentCallNext() throws Exception {
    // Setup: Create 20 waiting tokens
    UUID queueId = setupQueueWithWaitingTokens(20);
    
    // Execute: 10 staff operators call next concurrently
    ExecutorService executor = Executors.newFixedThreadPool(10);
    List<Future<Token>> futures = new ArrayList<>();
    
    for (int i = 0; i < 10; i++) {
        UUID counterId = createCounter(i + 1);
        futures.add(executor.submit(() -> 
            staffOperationsService.callNext(counterId)
        ));
    }
    
    // Collect results
    Set<UUID> calledTokenIds = new HashSet<>();
    for (Future<Token> future : futures) {
        Token token = future.get();
        calledTokenIds.add(token.getId());
    }
    
    // Assert: Exactly 10 unique tokens called
    assertThat(calledTokenIds).hasSize(10);
    
    // Assert: Each counter has exactly one token
    for (int i = 1; i <= 10; i++) {
        Counter counter = counterRepository.findByNumber(i).get();
        assertThat(counter.getCurrentServingTokenId()).isNotNull();
    }
}
```

**Success Criteria:** 0 duplicate assignments across 100+ test runs.

---

## ADR-008: WebSocket Event Timing

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Realtime events must not be broadcast before database commits.

### Decision

Use Spring **`@TransactionalEventListener(phase = AFTER_COMMIT)`**.

**Implementation:**
```java
// 1. Service publishes domain event
@Service
@Transactional
public class StaffOperationsService {
    
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    
    public Token callNext(UUID counterId) {
        // ... database operations ...
        tokenRepository.save(token);
        counterRepository.save(counter);
        
        // Publish domain event (in-memory, not broadcast yet)
        eventPublisher.publishEvent(new TokenCalledEvent(token, counter));
        
        return token;
        // Transaction commits here ←
    }
}

// 2. Listener broadcasts AFTER commit
@Component
public class WebSocketEventPublisher {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleTokenCalled(TokenCalledEvent event) {
        // Broadcast to WebSocket topics
        messagingTemplate.convertAndSend(
            "/topic/tenant/" + event.getOrgId() + "/location/" + event.getLocationId() + "/public",
            toPublicDto(event)
        );
        
        messagingTemplate.convertAndSend(
            "/topic/tenant/" + event.getOrgId() + "/location/" + event.getLocationId() + "/staff",
            toStaffDto(event)
        );
    }
}
```

### Why AFTER_COMMIT

**Problem with immediate broadcast:**
```
Time T0: Service calls token.setState(CALLED)
Time T1: WebSocket broadcasts TOKEN_CALLED event → customers see it
Time T2: Transaction fails and rolls back
Time T3: Database state = WAITING (but customers saw CALLED)
```

**Solution:**
- Event published after successful commit
- If transaction rolls back, event is discarded
- Clients never see uncommitted state

### Trade-off

**Latency:** ~5-20ms additional delay (transaction commit time)  
**Benefit:** Guaranteed consistency between database and realtime events

---

## ADR-009: Token State Machine Enforcement

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Prevent invalid token state transitions.

### Decision

Use **explicit state transition validation** in entity + service layer.

**Entity-Level Guard:**
```java
@Entity
public class Token {
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TokenState state;
    
    public void transitionTo(TokenState targetState) {
        if (!this.state.canTransitionTo(targetState)) {
            throw new InvalidTokenStateException(
                String.format("Cannot transition from %s to %s", 
                    this.state, targetState)
            );
        }
        this.state = targetState;
    }
    
    // ❌ Direct setter is private
    private void setState(TokenState state) {
        this.state = state;
    }
}
```

**Enum Validation:**
```java
public enum TokenState {
    WAITING,
    AWAY,
    CALLED,
    IN_SERVICE,
    COMPLETED,
    NO_SHOW,
    CANCELLED,
    EXPIRED;
    
    public boolean canTransitionTo(TokenState target) {
        return switch (this) {
            case WAITING -> target == CALLED || target == AWAY || target == CANCELLED;
            case AWAY -> target == WAITING || target == CANCELLED || target == EXPIRED;
            case CALLED -> target == IN_SERVICE || target == NO_SHOW;
            case IN_SERVICE -> target == COMPLETED;
            case COMPLETED, NO_SHOW, CANCELLED, EXPIRED -> false; // Terminal states
        };
    }
}
```

**Service-Level Enforcement:**
```java
@Service
public class TokenService {
    
    public void cancelToken(UUID tokenId) {
        Token token = tokenRepository.findById(tokenId)
            .orElseThrow(() -> new TokenNotFoundException(tokenId));
        
        // ✅ Uses guarded transition method
        token.transitionTo(TokenState.CANCELLED);
        tokenRepository.save(token);
    }
}
```

**Controller Protection:**
```java
// ❌ NEVER allow direct state changes from API
// Controllers only expose business operations:
//   - POST /api/v1/tokens/join
//   - POST /api/v1/staff/call-next
//   - POST /api/v1/tokens/{id}/cancel
// NOT: PUT /api/v1/tokens/{id}/state
```

---

## ADR-010: Future Intelligence Data Foundation

**Date:** 2026-09-01  
**Status:** ✅ APPROVED  
**Context:** Support future AI/ML capabilities without implementing them now.

### Decision

Capture **accurate operational data** required for future intelligence features.

**DO NOT implement now:**
- AI wait time prediction
- Demand forecasting
- Queue overload prediction
- Staffing recommendations
- Intelligent routing

**DO capture now:**
1. **Token Events** — Complete lifecycle with timestamps
2. **Service Durations** — `called_at`, `served_at`, `completed_at`
3. **Queue Patterns** — Hourly/daily token volume
4. **Counter Utilization** — Active/idle time per counter
5. **Step Away Behavior** — Grace period usage patterns
6. **No-Show Rates** — By service, time of day
7. **Peak Times** — High-traffic periods

### Schema Support

**TokenEvent Table:**
```sql
-- Already captures:
-- - event_type (lifecycle transitions)
-- - created_at (precise timing)
-- - from_state/to_state (duration calculation)
-- - counter_id (resource assignment)
-- - metadata JSONB (extensible)
```

**Token Table:**
```sql
-- Critical timestamps:
-- - joined_at (queue entry)
-- - called_at (customer called)
-- - served_at (service started) ← ADD THIS
-- - completed_at (service ended)
-- - step_away_expires_at (behavior tracking)
```

**Counter Table:**
```sql
-- Utilization tracking:
-- - service_start_time (counter becomes busy)
-- - availability transitions (tracked in audit_logs)
```

### Future ML Use Cases

**1. Wait Time Prediction:**
```
Input: time_of_day, day_of_week, current_queue_depth, active_counters
Output: predicted_wait_minutes, confidence_interval
Training Data: token_events (joined_at → called_at duration)
```

**2. Demand Forecasting:**
```
Input: historical_token_volume, date, hour, service_type
Output: predicted_arrivals_next_hour
Training Data: token_events (created events per hour)
```

**3. Staffing Optimization:**
```
Input: predicted_demand, target_wait_time, service_duration_avg
Output: recommended_active_counters
Training Data: counter utilization, service durations
```

**4. Queue Routing:**
```
Input: service_requirements, customer_priority, queue_states
Output: optimal_queue_assignment
Training Data: service durations, customer satisfaction (future)
```

### Implementation Note

When AI features are implemented:
1. Create separate `ml/` module
2. Read-only access to `token_events`
3. Separate prediction cache table
4. Do not modify core operational logic

---

---

## ADR-011: Structured Operating Hours & Timezone Evaluation

**Date:** 2026-10-01  
**Status:** ✅ APPROVED  
**Context:** Locations operate in different timezones and customer queue intake must respect branch schedules.  
**Decision:** Store IANA timezone strings and 7-day schedule intervals (`location_schedules`) with `enforce_schedule` boolean flag on locations. Evaluate current local time against active intervals before queue insertion.

---

## ADR-012: Token Transfer with Priority Inheritance

**Date:** 2026-10-02  
**Status:** ✅ APPROVED  
**Context:** When a customer is redirected to a specialist queue, they should not lose their waiting priority relative to newly arriving customers.  
**Decision:** When transferring a token, create a child token in the target queue and copy the parent token's `joined_at` timestamp into `priority_timestamp`. Sort `CALL NEXT` queries by `priority_timestamp ASC NULLS LAST, joined_at ASC`.

---

## ADR-013: Explicit Customer SMS Consent Capture

**Date:** 2026-10-02  
**Status:** ✅ APPROVED  
**Context:** Regulatory compliance requires explicit consent before dispatching queue notification SMS messages.  
**Decision:** Store `sms_consent` (boolean) and `sms_consent_timestamp` on `tokens`. If customer requests SMS consent without supplying a phone number, reject with HTTP 422.

---

## ADR-014: Service Preparation Requirements & Multi-Stage Journeys

**Date:** 2026-10-03  
**Status:** ✅ APPROVED  
**Context:** Customers frequently reach counters missing required paperwork, wasting teller capacity.  
**Decision:** Model `preparation_requirements` tied to services and `journeys` / `journey_stages` for complex multi-counter workflows. Present requirements in Screen 04 before queue confirmation.

---

## ADR-015: Windows WMI Process Detachment & Port Probing for Launcher

**Date:** 2026-10-13  
**Status:** ✅ APPROVED  
**Context:** Spawning background Vite dev server processes from PowerShell terminates upon script completion due to job object cleanup, and probing `localhost` hangs on IPv6 `::1`.  
**Decision:** Use Windows Management Instrumentation (`win32_process.Create`) to detach the background process and bind probing directly to IPv4 loopback `127.0.0.1`.

---

## SUMMARY OF ACTIVE DECISIONS

| ADR | Decision | Status | Impact |
|:---|:---|:---|:---|
| ADR-001 | Atomic counter token generation | ✅ APPROVED | Database schema, queue counter |
| ADR-002 | TokenEvent entity for lifecycle history | ✅ APPROVED | Database schema, event recording |
| ADR-003 | Database-enforced idempotency | ✅ APPROVED | Token service, error handling |
| ADR-004 | Active token state definition | ✅ APPROVED | Capacity checks, statistics |
| ADR-005 | Application-level tenant isolation | ✅ APPROVED | Security, AOP, repositories |
| ADR-006 | Testcontainers for PostgreSQL tests | ✅ APPROVED | Test infrastructure |
| ADR-007 | SKIP LOCKED for CALL NEXT | ✅ APPROVED | Concurrency safety |
| ADR-008 | AFTER_COMMIT WebSocket events | ✅ APPROVED | Realtime consistency |
| ADR-009 | State machine enforcement | ✅ APPROVED | Token entity, services |
| ADR-010 | ML data foundation | ✅ APPROVED | Schema design, timestamps |
| ADR-011 | Structured Operating Hours | ✅ APPROVED | Location schedules, timezone |
| ADR-012 | Token Transfer Priority Inheritance | ✅ APPROVED | Priority sorting, queue transfers |
| ADR-013 | Customer SMS Consent Capture | ✅ APPROVED | Compliance, token schema |
| ADR-014 | Preparation Requirements & Journeys | ✅ APPROVED | Pre-service triage, customer UI |
| ADR-015 | WMI Background Detachment Launcher | ✅ APPROVED | Automation, process orchestration |

---

**Last Updated:** 2026-10-13  
**Status:** ALL ARCHITECTURAL DECISIONS IMPLEMENTED & VERIFIED ✅
