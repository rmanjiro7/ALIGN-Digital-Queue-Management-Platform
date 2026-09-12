# ALIGN BACKEND — BUSINESS RULES

**Version:** 1.1  
**Last Updated:** 2026-09-01  
**Status:** APPROVED

---

## Overview

This document defines the explicit business rules for the ALIGN Digital Queue Management Platform. Each rule has a unique identifier (BR-XXX) and must be enforced by the backend implementation.

---

## BR-001: Active Token States

**Rule:** A token is considered "active" if and only if its state is in the following set:

```java
ACTIVE_STATES = {WAITING, AWAY, CALLED, IN_SERVICE}
```

**Terminal States (NOT active):**
```java
TERMINAL_STATES = {COMPLETED, NO_SHOW, CANCELLED, EXPIRED}
```

**Enforcement Points:**
1. Queue capacity checks
2. Queue statistics calculations
3. Dashboard analytics
4. "Tokens ahead" calculations
5. Service waiting count

**Implementation:**
```java
public static final Set<TokenState> ACTIVE_STATES = Set.of(
    TokenState.WAITING,
    TokenState.AWAY,
    TokenState.CALLED,
    TokenState.IN_SERVICE
);

// Repository query
@Query("SELECT COUNT(t) FROM Token t WHERE t.queueId = :queueId AND t.state IN :states")
long countActiveTokens(@Param("queueId") UUID queueId, @Param("states") Set<TokenState> states);
```

**Rationale:**
- **WAITING:** Actively in queue
- **AWAY:** Temporary 15-minute grace period, position preserved
- **CALLED:** Customer called, awaiting service
- **IN_SERVICE:** Currently being served
- **COMPLETED/NO_SHOW/CANCELLED/EXPIRED:** Service concluded, no longer consuming queue capacity

---

## BR-002: Token State Transitions

**Rule:** Token state transitions must follow the valid state machine paths.

### Valid Transitions

| From State | To State | Triggered By | Conditions |
|-----------|----------|--------------|------------|
| **WAITING** | CALLED | Staff "Call Next" | Counter available |
| **WAITING** | AWAY | Customer "Step Away" | Grace period not active |
| **WAITING** | CANCELLED | Customer cancel | Token not yet called |
| **AWAY** | WAITING | Customer "Return" | Within grace period |
| **AWAY** | CANCELLED | Customer cancel | Within grace period |
| **AWAY** | EXPIRED | System job | Grace period expired |
| **CALLED** | IN_SERVICE | Staff confirm | Customer arrived at counter |
| **CALLED** | NO_SHOW | Staff "No-Show" | Customer did not appear |
| **IN_SERVICE** | COMPLETED | Staff "Complete" | Service finished |

### Invalid Transitions

| From State | To State | Why Invalid |
|-----------|----------|-------------|
| COMPLETED | * | Terminal state, cannot be reverted |
| CANCELLED | * | Terminal state, cannot be reverted |
| NO_SHOW | * | Terminal state, cannot be reverted |
| EXPIRED | * | Terminal state, cannot be reverted |
| CALLED | WAITING | Use "Recall" operation (doesn't change state) |
| IN_SERVICE | WAITING | Service cannot be undone |
| WAITING | COMPLETED | Must be called and served first |

### Enforcement

**Entity Level:**
```java
@Entity
public class Token {
    public void transitionTo(TokenState targetState) {
        if (!this.state.canTransitionTo(targetState)) {
            throw new InvalidTokenStateException(
                "Cannot transition from " + this.state + " to " + targetState
            );
        }
        this.state = targetState;
    }
}
```

**Service Level:**
```java
// ✅ CORRECT: Use transition method
token.transitionTo(TokenState.CALLED);

// ❌ INCORRECT: Direct setter (should be private/protected)
token.setState(TokenState.CALLED);
```

---

## BR-003: Counter Availability Rules

**Rule:** Staff can only call next token when counter meets ALL conditions:

### Conditions for CALL NEXT

1. **Counter Availability = ONLINE**
   - NOT `ON_BREAK`
   - NOT `AWAY`
   - NOT `OFFLINE`

2. **Counter Queue State = READY**
   - `currentServingTokenId` is NULL
   - Counter is not already serving a customer

3. **At least one WAITING token exists**
   - In the queue assigned to the counter
   - Ordered by `joined_at` ASC (FIFO)

### Counter Availability States

| State | Meaning | Can Call Next? |
|-------|---------|---------------|
| **ONLINE** | Counter active and ready | ✅ YES (if not serving) |
| **ON_BREAK** | Staff on scheduled break | ❌ NO |
| **AWAY** | Staff temporarily away | ❌ NO |
| **OFFLINE** | Counter closed | ❌ NO |

### Enforcement

```java
public void validateCanCallNext(Counter counter) {
    if (!counter.getAvailability().equals(CounterAvailability.ONLINE)) {
        throw new CounterNotAvailableException(
            "Counter " + counter.getNumber() + " is " + counter.getAvailability() +
            ". Must be ONLINE to call next."
        );
    }
    
    if (counter.getCurrentServingTokenId() != null) {
        throw new CounterAlreadyServingException(
            "Counter " + counter.getNumber() + " is currently serving token " +
            counter.getCurrentServingTokenNumber()
        );
    }
}
```

---

## BR-004: Tenant Isolation

**Rule:** Organization A users MUST NEVER access Organization B resources.

### Isolation Requirements

**Read Operations:**
- User can only query resources where `resource.orgId == user.orgId`
- Exception: `PLATFORM_ADMIN` has cross-tenant read access

**Write Operations:**
- User can only modify resources where `resource.orgId == user.orgId`
- Exception: `PLATFORM_ADMIN` can create tenants, NOT modify org operations

### Enforcement Layers

**Layer 1: JWT Claims**
```json
{
  "orgId": "org-abc-uuid",
  "role": "STAFF"
}
```

**Layer 2: Service Validation**
```java
@Service
public class LocationService {
    
    @RequireTenantAccess
    public Location getLocation(UUID locationId) {
        Location location = locationRepository.findById(locationId)
            .orElseThrow(() -> new LocationNotFoundException(locationId));
        
        // Validate tenant access
        UUID userOrgId = TenantContext.getCurrentOrgId();
        if (!location.getOrgId().equals(userOrgId) && !isPlatformAdmin()) {
            throw new UnauthorizedTenantAccessException(
                "User from org " + userOrgId + " cannot access location from org " + location.getOrgId()
            );
        }
        
        return location;
    }
}
```

**Layer 3: Repository Filtering**
```java
// Always filter by orgId
@Query("SELECT l FROM Location l WHERE l.orgId = :orgId")
List<Location> findByOrgId(@Param("orgId") UUID orgId);
```

### Test Requirements

```java
@Test
public void testTenantIsolation_OrgA_CannotAccessOrgB() {
    // Authenticate as Org A user
    authenticateAs(orgAUser);
    
    // Attempt to access Org B location
    assertThatThrownBy(() -> locationService.getLocation(orgBLocationId))
        .isInstanceOf(UnauthorizedTenantAccessException.class);
}
```

---

## BR-005: Queue Capacity Enforcement

**Rule:** Queue CANNOT accept new tokens when active token count >= max capacity.

### Capacity Check Algorithm

```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    // 1. Lock queue row to prevent race conditions
    Queue queue = queueRepository.findByIdForUpdate(serviceId)
        .orElseThrow(() -> new QueueNotFoundException(serviceId));
    
    // 2. Count active tokens (using BR-001 definition)
    long activeCount = tokenRepository.countByQueueIdAndStateIn(
        queue.getId(), 
        TokenState.ACTIVE_STATES
    );
    
    // 3. Enforce capacity
    if (activeCount >= queue.getMaxCapacity()) {
        throw new QueueFullException(
            queue.getId(),
            queue.getName(),
            activeCount,
            queue.getMaxCapacity()
        );
    }
    
    // 4. Proceed with token creation
    // ...
}
```

### Edge Cases

**Case 1: Queue at capacity, token cancelled**
- Cancellation frees capacity immediately
- Next join request succeeds

**Case 2: Queue at capacity, token completed**
- Completion frees capacity immediately
- Next join request succeeds

**Case 3: Queue paused**
- Capacity check still applies
- Additional check: queue status must be ACTIVE

---

## BR-006: Token Number Generation Atomicity

**Rule:** Token numbers MUST be unique within a queue and generated atomically.

### Generation Algorithm

**Database Schema:**
```sql
ALTER TABLE queues ADD COLUMN next_token_number BIGINT DEFAULT 1;
```

**Atomic Increment:**
```sql
UPDATE queues 
SET next_token_number = next_token_number + 1 
WHERE id = ? 
RETURNING next_token_number;
```

**Token Number Format:**
```
{tokenPrefix}-{paddedNumber}
Examples: A-043, B-105, C-012
```

**Service Implementation:**
```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    Queue queue = queueRepository.findByIdForUpdate(serviceId)
        .orElseThrow();
    
    // Atomic increment
    Long nextNumber = jdbcTemplate.queryForObject(
        "UPDATE queues SET next_token_number = next_token_number + 1 " +
        "WHERE id = ? RETURNING next_token_number",
        Long.class,
        queue.getId()
    );
    
    String tokenNumber = queue.getTokenPrefix() + "-" + 
        String.format("%03d", nextNumber);
    
    // Unique constraint enforces safety
    Token token = Token.builder()
        .tokenNumber(tokenNumber)
        .queueId(queue.getId())
        .build();
    
    return tokenRepository.save(token);
}
```

### Uniqueness Constraint

```sql
ALTER TABLE tokens 
ADD CONSTRAINT uq_token_number_queue UNIQUE(queue_id, token_number);
```

**Behavior on Conflict:**
- If duplicate somehow generated (programming error), database constraint fails
- Transaction rolls back
- Error returned to client: "Token number generation failed"

---

## BR-007: CALL NEXT Concurrency Safety

**Rule:** Multiple staff calling next simultaneously MUST receive different tokens.

### Concurrency Mechanism

**PostgreSQL `SELECT FOR UPDATE SKIP LOCKED`:**
```sql
SELECT * FROM tokens 
WHERE queue_id = :queueId 
  AND state = 'WAITING'
ORDER BY joined_at ASC, id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**How It Works:**
1. Staff A begins transaction → locks Token #42
2. Staff B begins transaction → tries Token #42 (LOCKED)
3. `SKIP LOCKED` → Staff B skips #42, locks Token #43 instead
4. Staff A commits → Token #42 assigned to Counter 3
5. Staff B commits → Token #43 assigned to Counter 5

**Result:** ✅ Zero duplicate assignments

### Service Transaction

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public Token callNext(UUID counterId) {
    Counter counter = validateCounterCanCallNext(counterId);
    
    // Acquire exclusive lock on next eligible token
    Token token = tokenRepository.findNextWaitingTokenWithLock(counter.getQueueId())
        .orElseThrow(() -> new NoWaitingTokensException());
    
    // Update token
    token.transitionTo(TokenState.CALLED);
    token.setCalledAt(Instant.now());
    token.setCounterId(counterId);
    tokenRepository.save(token);
    
    // Update counter
    counter.setCurrentServingTokenId(token.getId());
    counterRepository.save(counter);
    
    return token;
}
```

### Test Acceptance Criteria

```java
@Test
public void testConcurrentCallNext_NoDuplicates() {
    // Setup: 20 waiting tokens
    setupQueueWithWaitingTokens(20);
    
    // Execute: 10 staff call next concurrently
    ExecutorService executor = Executors.newFixedThreadPool(10);
    List<Future<Token>> futures = IntStream.range(0, 10)
        .mapToObj(i -> executor.submit(() -> staffService.callNext(counterIds.get(i))))
        .collect(Collectors.toList());
    
    // Collect results
    Set<UUID> calledTokenIds = futures.stream()
        .map(this::getFutureResult)
        .map(Token::getId)
        .collect(Collectors.toSet());
    
    // Assert: Exactly 10 unique tokens
    assertThat(calledTokenIds).hasSize(10);
}
```

---

## BR-008: Step Away Grace Period

**Rule:** Customer can temporarily leave queue for exactly 15 minutes.

### Grace Period Behavior

**Activation:**
```
Token State: WAITING → AWAY
Field: step_away_expires_at = NOW() + 15 minutes
```

**Position Preservation:**
- Token remains in original queue position
- Other tokens DO NOT advance past AWAY token
- Token still counts as "active" (BR-001)

**Return Within Grace Period:**
```
Token State: AWAY → WAITING
Field: step_away_expires_at = NULL
```

**Expiration After 15 Minutes:**
```
Token State: AWAY → EXPIRED (background job)
Field: completed_at = expiration time
```

### Implementation

**Service Method:**
```java
@Transactional
public Token activateStepAway(UUID tokenId) {
    Token token = tokenRepository.findById(tokenId)
        .orElseThrow(() -> new TokenNotFoundException(tokenId));
    
    // Validate current state
    if (token.getState() != TokenState.WAITING) {
        throw new InvalidTokenStateException(
            "Step Away can only be activated from WAITING state"
        );
    }
    
    // Check if already used Step Away recently
    if (hasRecentStepAwayEvent(tokenId)) {
        throw new StepAwayAlreadyUsedException(
            "Step Away grace period already used for this token"
        );
    }
    
    // Activate grace period
    token.transitionTo(TokenState.AWAY);
    token.setStepAwayExpiresAt(Instant.now().plus(Duration.ofMinutes(15)));
    
    tokenRepository.save(token);
    tokenEventService.recordEvent(token, TokenEventType.STEP_AWAY_STARTED);
    
    return token;
}
```

**Background Expiration Job:**
```java
@Scheduled(fixedRate = 60000) // Every 60 seconds
@Transactional
public void expireStepAwayTokens() {
    Instant now = Instant.now();
    
    List<Token> expiredTokens = tokenRepository.findExpiredStepAwayTokens(now);
    
    for (Token token : expiredTokens) {
        token.transitionTo(TokenState.EXPIRED);
        token.setCompletedAt(now);
        
        tokenRepository.save(token);
        tokenEventService.recordEvent(token, TokenEventType.STEP_AWAY_EXPIRED);
        
        auditLogService.log(
            "STEP_AWAY_EXPIRED",
            token.getId(),
            "Token expired after 15-minute grace period"
        );
    }
}
```

**Repository Query:**
```sql
SELECT * FROM tokens 
WHERE state = 'AWAY' 
  AND step_away_expires_at <= :now;
```

### Business Constraints

- **One Step Away per token:** Once used, cannot activate again
- **Cancellation during AWAY:** Customer can still cancel
- **Position Lock:** Other customers cannot "jump" the AWAY token
- **Notification:** System should warn customer at 13 minutes (optional)

---

## BR-009: Idempotency Key Handling

**Rule:** Duplicate join requests with same idempotency key MUST return existing token.

### Client Behavior

**Client generates idempotency key:**
```javascript
const idempotencyKey = `customer-${customerId}-${Date.now()}-${randomUUID()}`;

// First request
const token1 = await joinQueue(serviceId, { idempotencyKey });

// Network retry (same key)
const token2 = await joinQueue(serviceId, { idempotencyKey });

// Result: token1.id === token2.id ✅
```

### Backend Handling

**Database Constraint:**
```sql
CREATE UNIQUE INDEX idx_tokens_idempotency 
ON tokens(idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

**Service Implementation:**
```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    try {
        // Attempt to create new token
        Token token = createNewToken(request);
        tokenRepository.save(token);
        return token;
        
    } catch (DataIntegrityViolationException ex) {
        // Unique constraint violation
        if (isIdempotencyKeyConflict(ex)) {
            // Return existing token
            return tokenRepository.findByIdempotencyKey(request.getIdempotencyKey())
                .orElseThrow(() -> new TokenNotFoundException(
                    "Token with idempotency key exists but could not be retrieved"
                ));
        }
        throw ex;
    }
}
```

### Idempotency Key Requirements

- **Format:** Client-defined string (max 100 characters)
- **Uniqueness:** Globally unique across all tokens
- **Persistence:** Client must store key before API call
- **Expiration:** Keys valid for 24 hours, cleaned up after 7 days
- **Optional:** Can be NULL for non-critical requests

---

## BR-010: Platform Admin Permissions

**Rule:** Platform Admin has READ-ONLY cross-tenant access, NO operational control.

### Allowed Actions

✅ **Platform Admin CAN:**
- List all organizations
- Create new organizations (tenant onboarding)
- View organization details (locations, services, queues)
- View platform-level analytics
- View system alerts
- View audit logs (cross-organization)
- Access monitoring dashboards

❌ **Platform Admin CANNOT:**
- Call next token for any organization
- Complete service
- Skip/no-show tokens
- Modify queue configuration
- Change counter availability
- Assign staff to counters
- Join queue as customer
- Cancel customer tokens

### Enforcement

**Controller Level:**
```java
@PreAuthorize("hasRole('ORG_ADMIN') or hasRole('PLATFORM_ADMIN')")
@GetMapping("/api/v1/locations/{id}")
public LocationResponse getLocation(@PathVariable UUID id) {
    return locationService.getLocation(id);
}

// ❌ Platform Admin blocked from operational endpoints
@PreAuthorize("hasRole('STAFF') or hasRole('ORG_ADMIN')")
@PostMapping("/api/v1/staff/call-next")
public TokenResponse callNext(@RequestBody CallNextRequest request) {
    return staffService.callNext(request);
}
```

**Service Level:**
```java
public Token callNext(UUID counterId) {
    UserPrincipal user = getCurrentUser();
    
    if (user.getRole().equals(UserRole.PLATFORM_ADMIN)) {
        throw new InsufficientPermissionsException(
            "Platform Admin cannot perform operational actions"
        );
    }
    
    // Proceed with CALL NEXT
}
```

---

## BR-011: Recall Operation Semantics

**Rule:** Recall RE-ANNOUNCES a called token WITHOUT changing its state.

### Recall vs. State Transition

**NOT a state transition:**
```
State before: CALLED
↓ (Recall operation)
State after: CALLED (unchanged)
```

**What Recall DOES:**
1. Update `calledAt` timestamp to NOW
2. Broadcast new announcement to public display
3. Trigger audio chime + speech synthesis
4. Record `TOKEN_RECALLED` event

**What Recall DOES NOT:**
- Change token state
- Reassign to different counter
- Move token in queue
- Cancel or complete token

### Implementation

```java
@Transactional
public Token recallToken(UUID tokenId, UUID counterId) {
    Token token = tokenRepository.findById(tokenId)
        .orElseThrow(() -> new TokenNotFoundException(tokenId));
    
    // Validate token is in CALLED state
    if (token.getState() != TokenState.CALLED) {
        throw new InvalidTokenStateException(
            "Can only recall tokens in CALLED state. Current state: " + token.getState()
        );
    }
    
    // Validate counter assignment
    if (!token.getCounterId().equals(counterId)) {
        throw new CounterMismatchException(
            "Token is assigned to different counter"
        );
    }
    
    // Update timestamp (state unchanged)
    token.setCalledAt(Instant.now());
    tokenRepository.save(token);
    
    // Record event
    tokenEventService.recordEvent(token, TokenEventType.TOKEN_RECALLED);
    
    // Broadcast realtime event
    eventPublisher.publishTokenRecalledEvent(token);
    
    return token;
}
```

### Use Case

**Scenario:** Customer called to Counter 3 but doesn't appear immediately.

**Staff Action:** Click "Recall" button
- System re-announces "Token A-042, please proceed to Counter 3"
- Public display highlights the token again
- Customer hears announcement and proceeds

---

## BR-012: Queue Pause Behavior

**Rule:** Paused queues reject new token joins but continue serving existing tokens.

### Pause Effect

**When queue is paused:**
- ❌ New customers CANNOT join queue
- ✅ Existing tokens continue being served
- ✅ Staff can still CALL NEXT
- ✅ Customers can still cancel their tokens
- ✅ Step Away still functions

### Resume Effect

**When queue is resumed:**
- ✅ New customers CAN join queue
- All existing tokens remain unchanged

### Implementation

**Join Queue Check:**
```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    Queue queue = queueRepository.findByServiceId(request.getServiceId())
        .orElseThrow(() -> new QueueNotFoundException(request.getServiceId()));
    
    // Check queue status
    if (queue.getStatus() != QueueStatus.ACTIVE) {
        throw new QueuePausedException(
            queue.getId(),
            "Queue '" + queue.getName() + "' is currently " + queue.getStatus()
        );
    }
    
    // Proceed with capacity check and token creation
    // ...
}
```

**CALL NEXT Continues:**
```java
public Token callNext(UUID counterId) {
    // NO queue status check — staff can continue serving existing tokens
    Token token = tokenRepository.findNextWaitingToken(queueId)
        .orElseThrow(() -> new NoWaitingTokensException());
    // ...
}
```

### Queue Status Values

| Status | New Joins | Call Next | Description |
|--------|-----------|-----------|-------------|
| **ACTIVE** | ✅ YES | ✅ YES | Normal operation |
| **PAUSED** | ❌ NO | ✅ YES | Temporarily stopped accepting new customers |
| **CLOSED** | ❌ NO | ❌ NO | Queue shut down (e.g., end of day) |

---

## BR-013: Token Event Recording

**Rule:** All token lifecycle transitions MUST be recorded in `token_events` table.

### Recordable Events

| Event Type | Triggered By | From State | To State |
|-----------|--------------|------------|----------|
| `TOKEN_CREATED` | Customer joins queue | — | WAITING |
| `TOKEN_CALLED` | Staff calls next | WAITING | CALLED |
| `TOKEN_RECALLED` | Staff recalls | CALLED | CALLED |
| `TOKEN_SERVING_STARTED` | Staff confirms | CALLED | IN_SERVICE |
| `TOKEN_COMPLETED` | Staff completes | IN_SERVICE | COMPLETED |
| `TOKEN_SKIPPED` | Staff skips | CALLED | NO_SHOW |
| `TOKEN_NO_SHOW` | Staff marks no-show | CALLED | NO_SHOW |
| `TOKEN_CANCELLED` | Customer cancels | WAITING/AWAY | CANCELLED |
| `TOKEN_STEP_AWAY_STARTED` | Customer steps away | WAITING | AWAY |
| `TOKEN_STEP_AWAY_RETURNED` | Customer returns | AWAY | WAITING |
| `TOKEN_STEP_AWAY_EXPIRED` | System job | AWAY | EXPIRED |

### Event Schema

```sql
CREATE TABLE token_events (
    id UUID PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
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

### Service Implementation

```java
@Service
public class TokenEventService {
    
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordEvent(Token token, TokenEventType eventType) {
        TokenEvent event = TokenEvent.builder()
            .tokenId(token.getId())
            .eventType(eventType)
            .fromState(token.getPreviousState())
            .toState(token.getState())
            .counterId(token.getCounterId())
            .actorId(getCurrentUserId())
            .actorName(getCurrentUserName())
            .metadata(buildMetadata(token, eventType))
            .createdAt(Instant.now())
            .build();
        
        tokenEventRepository.save(event);
    }
}
```

### Usage in Services

```java
@Transactional
public Token callNext(UUID counterId) {
    // ... token state transition ...
    token.transitionTo(TokenState.CALLED);
    tokenRepository.save(token);
    
    // ✅ REQUIRED: Record event
    tokenEventService.recordEvent(token, TokenEventType.TOKEN_CALLED);
    
    return token;
}
```

---

## SUMMARY TABLE

| Rule ID | Rule Title | Enforcement Level | Test Required |
|---------|-----------|------------------|---------------|
| BR-001 | Active Token States | Repository, Service | ✅ Unit + Integration |
| BR-002 | Token State Transitions | Entity, Service | ✅ Unit |
| BR-003 | Counter Availability Rules | Service | ✅ Unit |
| BR-004 | Tenant Isolation | Service, AOP, Repository | ✅ Integration |
| BR-005 | Queue Capacity Enforcement | Service, Database | ✅ Integration |
| BR-006 | Token Number Atomicity | Database, Service | ✅ Integration (Concurrency) |
| BR-007 | CALL NEXT Concurrency | Database, Service | ✅ Integration (Concurrency) |
| BR-008 | Step Away Grace Period | Service, Scheduled Job | ✅ Integration |
| BR-009 | Idempotency Key Handling | Database, Service | ✅ Integration |
| BR-010 | Platform Admin Permissions | Controller, Service | ✅ Unit + Integration |
| BR-011 | Recall Operation Semantics | Service | ✅ Unit |
| BR-012 | Queue Pause Behavior | Service | ✅ Integration |
| BR-013 | Token Event Recording | Service | ✅ Integration |

---

**Document Status:** APPROVED  
**Last Updated:** 2026-09-01  
**Next Review:** After Phase 4 (Staff Operations) implementation
