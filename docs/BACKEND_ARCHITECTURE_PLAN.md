# ALIGN BACKEND — ARCHITECTURE PLAN
## Java / Spring Boot Implementation Strategy

**Version:** 1.0  
**Date:** 2026-09-01  
**Status:** APPROVED FOR IMPLEMENTATION

---

## 1. EXECUTIVE SUMMARY

This document defines the complete architecture for the ALIGN Digital Queue Management Platform backend.

**Technology Stack:**
- **Language:** Java 17+
- **Framework:** Spring Boot 3.2+
- **Database:** PostgreSQL 15+
- **Build Tool:** Maven 3.9+
- **Security:** Spring Security + JWT
- **Realtime:** WebSocket + STOMP
- **Migrations:** Flyway
- **Testing:** JUnit 5 + Mockito + Spring Test

**Architecture Style:** **Modular Monolith** (Layered Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    REST API Layer                            │
│  ┌───────────┬──────────┬──────────┬───────────┬─────────┐ │
│  │   Auth    │  Tenant  │ Location │  Service  │  Token  │ │
│  │Controller │Controller│Controller│Controller │Controller│ │
│  └───────────┴──────────┴──────────┴───────────┴─────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌───────────┬──────────┬──────────┬───────────┬─────────┐ │
│  │   Auth    │  Tenant  │ Location │  Queue    │  Token  │ │
│  │  Service  │ Service  │ Service  │  Service  │ Service │ │
│  └───────────┴──────────┴──────────┴───────────┴─────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                Repository Layer (JPA)                        │
│  ┌───────────┬──────────┬──────────┬───────────┬─────────┐ │
│  │   User    │   Org    │ Location │  Queue    │  Token  │ │
│  │Repository │Repository│Repository│Repository │Repository│ │
│  └───────────┴──────────┴──────────┴───────────┴─────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 15+                            │
│        (Row-Level Security + Transactional Integrity)        │
└─────────────────────────────────────────────────────────────┘
```

**Cross-Cutting Concerns:**
- Security: JWT authentication + RBAC authorization
- Realtime: WebSocket/STOMP event broadcasting
- Audit: Comprehensive audit logging
- Validation: Input validation at API boundaries
- Exception Handling: Centralized error responses

---

## 2. PROJECT STRUCTURE

```
backend/
├── pom.xml                                 Maven build configuration
├── .env.example                            Environment variable template
├── .gitignore                              Exclude target/, .env, etc.
├── README.md                               Backend-specific documentation
│
├── src/main/
│   ├── java/com/align/qms/
│   │   │
│   │   ├── AlignApplication.java           Spring Boot entry point
│   │   │
│   │   ├── config/                         Configuration classes
│   │   │   ├── SecurityConfig.java         Spring Security + JWT
│   │   │   ├── WebSocketConfig.java        STOMP configuration
│   │   │   ├── CorsConfig.java             CORS policy
│   │   │   ├── JpaConfig.java              JPA/Hibernate settings
│   │   │   └── AsyncConfig.java            Async task executor
│   │   │
│   │   ├── security/                       Security infrastructure
│   │   │   ├── JwtTokenProvider.java       JWT generation/validation
│   │   │   ├── JwtAuthenticationFilter.java Request filter
│   │   │   ├── UserPrincipal.java          Security principal
│   │   │   ├── TenantContext.java          Thread-local tenant context
│   │   │   └── AuthorizationService.java   Permission checks
│   │   │
│   │   ├── controller/                     REST API Controllers
│   │   │   ├── AuthController.java         POST /api/v1/auth/login, /refresh, /me
│   │   │   ├── TenantController.java       Tenant CRUD (Platform Admin)
│   │   │   ├── LocationController.java     Location CRUD (Org Admin)
│   │   │   ├── ServiceController.java      Service management
│   │   │   ├── QueueController.java        Queue configuration
│   │   │   ├── TokenController.java        Token join/lookup/cancel
│   │   │   ├── StaffOperationsController.java  CALL NEXT, recall, complete
│   │   │   ├── CounterController.java      Counter availability
│   │   │   ├── StaffManagementController.java  Staff CRUD + assignment
│   │   │   ├── AnalyticsController.java    Dashboard metrics
│   │   │   └── HealthController.java       Health checks
│   │   │
│   │   ├── service/                        Business Logic Layer
│   │   │   ├── AuthService.java            Login, JWT generation
│   │   │   ├── UserService.java            User CRUD
│   │   │   ├── TenantService.java          Tenant operations
│   │   │   ├── LocationService.java        Location operations
│   │   │   ├── ServiceService.java         Service configuration
│   │   │   ├── QueueService.java           Queue management
│   │   │   ├── TokenService.java           Token lifecycle (join, cancel)
│   │   │   ├── StaffOperationsService.java CALL NEXT, complete, skip
│   │   │   ├── CounterService.java         Counter management
│   │   │   ├── WaitTimeCalculator.java     Wait estimation algorithm
│   │   │   ├── AuditLogService.java        Audit trail recording
│   │   │   └── WebSocketEventPublisher.java Event broadcasting
│   │   │
│   │   ├── repository/                     Data Access Layer (JPA)
│   │   │   ├── UserRepository.java
│   │   │   ├── OrganizationRepository.java
│   │   │   ├── LocationRepository.java
│   │   │   ├── ServiceRepository.java
│   │   │   ├── QueueRepository.java
│   │   │   ├── TokenRepository.java
│   │   │   ├── CounterRepository.java
│   │   │   ├── RefreshTokenRepository.java
│   │   │   └── AuditLogRepository.java
│   │   │
│   │   ├── entity/                         JPA Entities
│   │   │   ├── User.java                   Users table
│   │   │   ├── Organization.java           Organizations table
│   │   │   ├── Location.java               Locations table
│   │   │   ├── Service.java                Services table
│   │   │   ├── Queue.java                  Queues table
│   │   │   ├── Token.java                  Tokens table (CRITICAL)
│   │   │   ├── Counter.java                Counters table
│   │   │   ├── RefreshToken.java           Refresh tokens table
│   │   │   ├── AuditLog.java               Audit logs table
│   │   │   └── BaseEntity.java             Abstract base (id, timestamps)
│   │   │
│   │   ├── dto/
│   │   │   ├── request/                    Request DTOs
│   │   │   │   ├── LoginRequest.java
│   │   │   │   ├── RefreshTokenRequest.java
│   │   │   │   ├── TokenJoinRequest.java
│   │   │   │   ├── StepAwayRequest.java
│   │   │   │   ├── CallNextRequest.java
│   │   │   │   ├── CreateLocationRequest.java
│   │   │   │   ├── CreateServiceRequest.java
│   │   │   │   ├── CreateTenantRequest.java
│   │   │   │   └── UpdateCounterAvailabilityRequest.java
│   │   │   │
│   │   │   └── response/                   Response DTOs
│   │   │       ├── ApiResponse.java        Generic wrapper
│   │   │       ├── ErrorResponse.java      Error structure
│   │   │       ├── LoginResponse.java      JWT tokens
│   │   │       ├── UserResponse.java       Current user info
│   │   │       ├── TokenResponse.java      Token details
│   │   │       ├── QueueStatusResponse.java
│   │   │       ├── LocationResponse.java
│   │   │       ├── ServiceResponse.java
│   │   │       ├── TenantResponse.java
│   │   │       ├── CounterResponse.java
│   │   │       └── DashboardAnalyticsResponse.java
│   │   │
│   │   ├── mapper/                         Entity ↔ DTO conversion
│   │   │   ├── TokenMapper.java
│   │   │   ├── LocationMapper.java
│   │   │   ├── ServiceMapper.java
│   │   │   └── UserMapper.java
│   │   │
│   │   ├── exception/                      Exception Handling
│   │   │   ├── GlobalExceptionHandler.java @ControllerAdvice handler
│   │   │   ├── AlignException.java         Base exception
│   │   │   ├── ResourceNotFoundException.java
│   │   │   ├── DuplicateTokenException.java
│   │   │   ├── QueueFullException.java
│   │   │   ├── QueuePausedException.java
│   │   │   ├── InvalidTokenStateException.java
│   │   │   ├── UnauthorizedTenantAccessException.java
│   │   │   ├── CounterNotAvailableException.java
│   │   │   └── InvalidCredentialsException.java
│   │   │
│   │   ├── validation/                     Custom Validators
│   │   │   ├── PhoneNumber.java            @PhoneNumber annotation
│   │   │   ├── PhoneNumberValidator.java   Implementation
│   │   │   └── UUIDFormat.java             @UUIDFormat annotation
│   │   │
│   │   ├── websocket/                      WebSocket/STOMP
│   │   │   ├── WebSocketEventListener.java Session lifecycle
│   │   │   ├── QueueEventPublisher.java    Publish to topics
│   │   │   └── events/                     Event POJOs
│   │   │       ├── TokenCalledEvent.java
│   │   │       ├── TokenJoinedEvent.java
│   │   │       ├── TokenCompletedEvent.java
│   │   │       └── CounterStatusChangedEvent.java
│   │   │
│   │   ├── util/                           Utility Classes
│   │   │   ├── Constants.java              Application constants
│   │   │   ├── DateTimeUtil.java           Date/time helpers
│   │   │   └── SequenceGenerator.java      Token number generation
│   │   │
│   │   └── scheduled/                      Background Jobs
│   │       ├── StepAwayExpirationJob.java  Expire AWAY tokens
│   │       └── QueueStatisticsJob.java     Update avg wait times
│   │
│   └── resources/
│       ├── application.yml                 Main configuration
│       ├── application-dev.yml             Development profile
│       ├── application-prod.yml            Production profile
│       ├── application-test.yml            Test profile
│       ├── logback-spring.xml              Logging configuration
│       │
│       └── db/migration/                   Flyway SQL migrations
│           ├── V1__create_organizations.sql
│           ├── V2__create_users.sql
│           ├── V3__create_locations.sql
│           ├── V4__create_services.sql
│           ├── V5__create_queues.sql
│           ├── V6__create_counters.sql
│           ├── V7__create_tokens.sql
│           ├── V8__create_audit_logs.sql
│           ├── V9__create_refresh_tokens.sql
│           ├── V10__create_indexes.sql
│           ├── V11__create_sequences.sql
│           └── V12__seed_demo_data.sql
│
└── src/test/
    ├── java/com/align/qms/
    │   ├── integration/                    Integration Tests
    │   │   ├── TokenConcurrencyTest.java   CRITICAL: Concurrent token issuance
    │   │   ├── CallNextConcurrencyTest.java CRITICAL: Concurrent CALL NEXT
    │   │   ├── TenantIsolationTest.java    Security test
    │   │   └── AuthenticationTest.java
    │   │
    │   ├── service/                        Service Unit Tests
    │   │   ├── TokenServiceTest.java
    │   │   ├── StaffOperationsServiceTest.java
    │   │   └── WaitTimeCalculatorTest.java
    │   │
    │   ├── repository/                     Repository Tests
    │   │   ├── TokenRepositoryTest.java
    │   │   └── UserRepositoryTest.java
    │   │
    │   └── controller/                     Controller Tests
    │       ├── TokenControllerTest.java
    │       └── AuthControllerTest.java
    │
    └── resources/
        ├── application-test.yml
        └── test-data.sql
```

---

## 3. MAVEN DEPENDENCIES (`pom.xml`)

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Database -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>

    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Utilities -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <scope>provided</scope>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## 4. DATABASE ARCHITECTURE

### 4.1 Entity Relationship Diagram

⭐ **CORRECTED:** Added `token_events` table, `next_token_number` in queues

```
┌─────────────────┐
│  organizations  │
│─────────────────│
│ id (PK)         │◄────────┐
│ code (UNIQUE)   │         │
│ name            │         │
│ sector          │         │
│ status          │         │
└─────────────────┘         │
        │                   │
        │ 1:N               │
        ▼                   │
┌─────────────────┐         │
│   locations     │         │
│─────────────────│         │
│ id (PK)         │◄───┐    │
│ org_id (FK)     │────┘    │
│ name            │         │
│ address         │         │
│ status          │         │
└─────────────────┘         │
        │                   │
        │ 1:N               │
        ▼                   │
┌─────────────────┐         │
│    services     │         │
│─────────────────│         │
│ id (PK)         │◄───┐    │
│ org_id (FK)     │────┼────┘
│ location_id (FK)│────┘
│ name            │
│ enabled         │
└─────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────┐         ┌─────────────────┐
│     queues      │         │     counters    │
│─────────────────│         │─────────────────│
│ id (PK)         │◄───┐    │ id (PK)         │
│ service_id (FK) │────┘    │ location_id (FK)│
│ token_prefix    │    ┌───►│ number          │
│ status          │    │    │ availability    │
│ max_capacity    │    │    │ assigned_staff  │
└─────────────────┘    │    └─────────────────┘
        │              │            │
        │ 1:N          │            │
        ▼              │            │
┌─────────────────┐    │            │
│     tokens      │    │            │
│─────────────────│    │            │
│ id (PK)         │    │            │
│ queue_id (FK)   │────┘            │
│ token_number    │                 │
│ state           │                 │
│ counter_id (FK) │◄────────────────┘
│ customer_name   │
│ customer_phone  │
│ joined_at       │
│ step_away_exp   │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│      users      │         │   audit_logs    │
│─────────────────│         │─────────────────│
│ id (PK)         │         │ id (PK)         │
│ org_id (FK)     │         │ org_id (FK)     │
│ email (UNIQUE)  │         │ actor_id (FK)   │
│ password_hash   │         │ action          │
│ role            │         │ aggregate_id    │
│ location_id (FK)│         │ before_state    │
└─────────────────┘         │ after_state     │
                            └─────────────────┘
```

### 4.2 Critical Indexes

```sql
-- Token lookup performance
CREATE INDEX idx_tokens_queue_state ON tokens(queue_id, state) 
  WHERE state IN ('WAITING', 'CALLED');

CREATE INDEX idx_tokens_location_state ON tokens(location_id, state);

CREATE INDEX idx_tokens_customer_phone ON tokens(customer_phone) 
  WHERE customer_phone IS NOT NULL;

-- Counter operations
CREATE INDEX idx_counters_location_availability ON counters(location_id, availability);

-- Tenant isolation
CREATE INDEX idx_locations_org ON locations(org_id);
CREATE INDEX idx_services_org_location ON services(org_id, location_id);
CREATE INDEX idx_users_org_email ON users(org_id, email);

-- Audit trail
CREATE INDEX idx_audit_logs_org_action ON audit_logs(org_id, action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at DESC);
```

### 4.3 Token Number Generation Strategy ⭐ CORRECTED

**Decision:** Atomic counter stored in `queues` table.

**Database Schema:**
```sql
-- queues table includes:
next_token_number BIGINT DEFAULT 1
```

**Atomic Increment Query:**
```sql
UPDATE queues 
SET next_token_number = next_token_number + 1 
WHERE id = ? 
RETURNING next_token_number;
```

**Java Service Method:**
```java
@Transactional
public Token joinQueue(UUID serviceId, TokenJoinRequest request) {
    Queue queue = queueRepository.findByIdForUpdate(serviceId)
        .orElseThrow(() -> new QueueNotFoundException(serviceId));
    
    // Atomic increment
    Long nextNumber = jdbcTemplate.queryForObject(
        "UPDATE queues SET next_token_number = next_token_number + 1 " +
        "WHERE id = ? RETURNING next_token_number",
        Long.class,
        queue.getId()
    );
    
    String tokenNumber = queue.getTokenPrefix() + "-" + 
        String.format("%03d", nextNumber);
    
    Token token = Token.builder()
        .queueId(queue.getId())
        .tokenNumber(tokenNumber)
        .state(TokenState.WAITING)
        .idempotencyKey(request.getIdempotencyKey())
        .build();
    
    return tokenRepository.save(token);
}
```

**Rationale:** Simpler than per-queue PostgreSQL sequences, equally atomic, no dynamic sequence management required.

**See:** ADR-001 in DECISIONS.md

---

## 5. AUTHENTICATION & AUTHORIZATION ARCHITECTURE

### 5.1 JWT Token Structure

**Access Token (15 minutes):**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "admin@organization.com",
  "orgId": "org-abc-uuid",
  "role": "STAFF",
  "locationId": "loc-main-uuid",
  "iat": 1698156000,
  "exp": 1698156900
}
```

**Refresh Token (7 days):**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "iat": 1698156000,
  "exp": 1698760800
}
```

### 5.2 Authorization Matrix

| Endpoint | Customer | Staff | Org Admin | Platform Admin |
|----------|----------|-------|-----------|----------------|
| `POST /api/v1/tokens/join` | ✅ | ✅ | ✅ | ❌ |
| `GET /api/v1/tokens/{tokenId}` | ✅ (own) | ✅ (location) | ✅ (org) | ✅ |
| `POST /api/v1/staff/call-next` | ❌ | ✅ | ✅ | ❌ |
| `POST /api/v1/locations` | ❌ | ❌ | ✅ (own org) | ✅ |
| `POST /api/v1/tenants` | ❌ | ❌ | ❌ | ✅ |

### 5.3 Tenant Isolation Enforcement

**Method 1: Aspect-Oriented Programming (AOP)**
```java
@Aspect
@Component
public class TenantIsolationAspect {
    
    @Around("@annotation(RequireTenantAccess)")
    public Object enforceTenantAccess(ProceedingJoinPoint joinPoint) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        UUID requestedOrgId = extractOrgIdFromArguments(joinPoint);
        
        if (!principal.getOrgId().equals(requestedOrgId) && 
            !principal.getRole().equals("PLATFORM_ADMIN")) {
            throw new UnauthorizedTenantAccessException();
        }
        
        return joinPoint.proceed();
    }
}
```

**Method 2: Repository-Level Filtering**
```java
@Repository
public interface LocationRepository extends JpaRepository<Location, UUID> {
    
    @Query("SELECT l FROM Location l WHERE l.orgId = :orgId")
    List<Location> findByOrgId(@Param("orgId") UUID orgId);
    
    // Automatic tenant filtering via @PreAuthorize
    @PreAuthorize("#orgId == authentication.principal.orgId or hasRole('PLATFORM_ADMIN')")
    List<Location> findSecuredByOrgId(UUID orgId);
}
```

---

## 6. CONCURRENCY SAFETY ARCHITECTURE

### 6.1 Token Generation Concurrency

**Problem:** Duplicate token numbers under concurrent requests.

**Solution:** PostgreSQL sequence atomicity.

```java
@Service
@Transactional
public class TokenService {
    
    public Token joinQueue(UUID serviceId, TokenJoinRequest request) {
        // 1. Lock queue row to prevent race conditions on capacity check
        Queue queue = queueRepository.findByIdForUpdate(serviceId)
            .orElseThrow(() -> new QueueNotFoundException(serviceId));
        
        // 2. Validate capacity
        long currentCount = tokenRepository.countByQueueIdAndState(
            queue.getId(), TokenState.WAITING
        );
        if (currentCount >= queue.getMaxCapacity()) {
            throw new QueueFullException(queue.getId());
        }
        
        // 3. Generate atomic token number
        String tokenNumber = sequenceGenerator.nextTokenNumber(queue);
        
        // 4. Create token
        Token token = Token.builder()
            .tokenNumber(tokenNumber)
            .queueId(queue.getId())
            .state(TokenState.WAITING)
            .joinedAt(Instant.now())
            .idempotencyKey(request.getIdempotencyKey())
            .build();
        
        return tokenRepository.save(token);
    }
}
```

**Database Constraint:**
```sql
ALTER TABLE tokens 
ADD CONSTRAINT uq_token_number_queue UNIQUE(queue_id, token_number);
```

### 6.2 CALL NEXT Concurrency

**Problem:** Two staff operators calling next simultaneously get the same token.

**Solution:** `SELECT FOR UPDATE SKIP LOCKED` (PostgreSQL 9.5+).

```java
@Repository
public interface TokenRepository extends JpaRepository<Token, UUID> {
    
    @Query(value = """
        SELECT * FROM tokens 
        WHERE queue_id = :queueId 
          AND state = 'WAITING'
        ORDER BY joined_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<Token> findNextWaitingTokenWithLock(@Param("queueId") UUID queueId);
}
```

```java
@Service
@Transactional
public class StaffOperationsService {
    
    public Token callNext(UUID counterId) {
        Counter counter = counterRepository.findById(counterId)
            .orElseThrow(() -> new CounterNotFoundException(counterId));
        
        // Validate counter availability
        if (!counter.getAvailability().equals(CounterAvailability.ONLINE)) {
            throw new CounterNotAvailableException(counter.getNumber());
        }
        
        // Check counter is not already serving
        if (counter.getCurrentServingTokenId() != null) {
            throw new CounterAlreadyServingException(counter.getNumber());
        }
        
        // Find next eligible token (with row lock)
        Token token = tokenRepository.findNextWaitingTokenWithLock(counter.getQueueId())
            .orElseThrow(() -> new NoWaitingTokensException());
        
        // Atomically update token state
        token.setState(TokenState.CALLED);
        token.setCalledAt(Instant.now());
        token.setCounterId(counterId);
        tokenRepository.save(token);
        
        // Update counter
        counter.setCurrentServingTokenId(token.getId());
        counter.setServiceStartTime(Instant.now());
        counterRepository.save(counter);
        
        // Publish WebSocket event (after commit)
        eventPublisher.publishTokenCalledEvent(token);
        
        return token;
    }
}
```

### 6.3 Idempotency Handling

**Requirement:** Duplicate token join requests (network retry) must not create duplicate tokens.

**Implementation:**
```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    // Check idempotency key
    Optional<Token> existing = tokenRepository.findByIdempotencyKey(
        request.getIdempotencyKey()
    );
    if (existing.isPresent()) {
        return existing.get(); // Return existing token
    }
    
    // Proceed with token creation
    // ...
}
```

**Database Constraint:**
```sql
CREATE UNIQUE INDEX idx_tokens_idempotency 
ON tokens(idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

---

## 7. WEBSOCKET / REALTIME ARCHITECTURE

### 7.1 STOMP Configuration

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-align")
            .setAllowedOriginPatterns("http://localhost:3000", "https://align.example.com")
            .withSockJS();
    }
}
```

### 7.2 Event Publishing Strategy

**Critical Rule:** Events MUST be published **AFTER** transaction commits.

```java
@Service
public class WebSocketEventPublisher {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishTokenCalledEvent(TokenCalledEvent event) {
        // Public topic (no customer PII)
        messagingTemplate.convertAndSend(
            "/topic/tenant/" + event.getOrgId() + "/location/" + event.getLocationId() + "/public",
            PublicTokenCalledDto.builder()
                .tokenNumber(event.getTokenNumber())
                .counterNumber(event.getCounterNumber())
                .timestamp(event.getTimestamp())
                .build()
        );
        
        // Staff topic (full details)
        messagingTemplate.convertAndSend(
            "/topic/tenant/" + event.getOrgId() + "/location/" + event.getLocationId() + "/staff",
            StaffTokenCalledDto.builder()
                .tokenId(event.getTokenId())
                .tokenNumber(event.getTokenNumber())
                .customerName(event.getCustomerName())
                .counterNumber(event.getCounterNumber())
                .timestamp(event.getTimestamp())
                .build()
        );
        
        // Customer-specific topic
        messagingTemplate.convertAndSend(
            "/topic/token/" + event.getTokenId(),
            CustomerTokenUpdateDto.builder()
                .state("CALLED")
                .counterNumber(event.getCounterNumber())
                .message("Please proceed to Counter " + event.getCounterNumber())
                .build()
        );
    }
}
```

### 7.3 Event Types

| Event | Public Topic | Staff Topic | Token Topic |
|-------|-------------|------------|-------------|
| `TOKEN_JOINED` | ❌ | ✅ | ✅ |
| `TOKEN_CALLED` | ✅ (no PII) | ✅ (full) | ✅ |
| `TOKEN_RECALLED` | ✅ | ✅ | ✅ |
| `TOKEN_COMPLETED` | ❌ | ✅ | ✅ |
| `TOKEN_CANCELLED` | ❌ | ✅ | ✅ |
| `COUNTER_STATUS_CHANGED` | ✅ | ✅ | ❌ |
| `QUEUE_PAUSED` | ✅ | ✅ | ❌ |

---

## 8. BUSINESS RULES DOCUMENTATION

### BR-001: Token State Transitions

**Valid Transitions:**
```
WAITING → CALLED
WAITING → AWAY
WAITING → CANCELLED
AWAY → WAITING
AWAY → CANCELLED
CALLED → IN_SERVICE
CALLED → NO_SHOW (if customer doesn't appear)
IN_SERVICE → COMPLETED
```

**Invalid Transitions:**
```
COMPLETED → * (terminal state)
CANCELLED → * (terminal state)
NO_SHOW → * (terminal state)
CALLED → WAITING (use RECALL operation instead)
```

**Enforcement:**
```java
@Entity
public class Token {
    
    public void transitionTo(TokenState newState) {
        if (!this.state.canTransitionTo(newState)) {
            throw new InvalidTokenStateException(this.state, newState);
        }
        this.state = newState;
    }
}

public enum TokenState {
    WAITING, AWAY, CALLED, IN_SERVICE, COMPLETED, NO_SHOW, CANCELLED, EXPIRED;
    
    public boolean canTransitionTo(TokenState target) {
        return switch (this) {
            case WAITING -> target == CALLED || target == AWAY || target == CANCELLED;
            case AWAY -> target == WAITING || target == CANCELLED || target == EXPIRED;
            case CALLED -> target == IN_SERVICE || target == NO_SHOW;
            case IN_SERVICE -> target == COMPLETED;
            default -> false; // Terminal states
        };
    }
}
```

### BR-002: Counter Availability Rules

**Staff can CALL NEXT only when:**
1. Counter availability = `ONLINE`
2. Counter queue state = `READY` (not already serving)
3. At least one token in `WAITING` state exists

**Enforcement:**
```java
public void validateCanCallNext(Counter counter) {
    if (!counter.getAvailability().equals(CounterAvailability.ONLINE)) {
        throw new CounterNotAvailableException(
            "Counter must be ONLINE to call next"
        );
    }
    
    if (counter.getCurrentServingTokenId() != null) {
        throw new CounterAlreadyServingException(
            "Counter is currently serving token " + counter.getCurrentServingTokenNumber()
        );
    }
}
```

### BR-003: Tenant Isolation

**Rule:** Organization A resources MUST NEVER be accessible by Organization B users.

**Exceptions:**
- `PLATFORM_ADMIN` role has cross-tenant read access
- `PLATFORM_ADMIN` does NOT have operational control over organization queues/tokens

**Enforcement:** AOP + Repository-level filtering (see Section 5.3).

### BR-004: Queue Capacity Enforcement

**Rule:** Queue cannot accept new tokens when `currentCount >= maxCapacity`.

**Enforcement:**
```java
@Transactional
public Token joinQueue(TokenJoinRequest request) {
    Queue queue = queueRepository.findByIdForUpdate(serviceId)
        .orElseThrow();
    
    long currentCount = tokenRepository.countActiveTokens(queue.getId());
    if (currentCount >= queue.getMaxCapacity()) {
        throw new QueueFullException(queue.getId(), queue.getMaxCapacity());
    }
    
    // Proceed with token creation
}
```

### BR-005: Step Away Grace Period

**Rule:** Customer can activate Step Away for 15 minutes maximum.

**Behavior:**
- Token state: `WAITING` → `AWAY`
- Field `stepAwayExpiresAt` = `NOW() + 15 minutes`
- Token position preserved during grace period
- After expiration: Token state → `EXPIRED` (background job)

**Enforcement:**
```java
@Scheduled(fixedRate = 60000) // Every 60 seconds
public void expireStepAwayTokens() {
    Instant now = Instant.now();
    List<Token> expiredTokens = tokenRepository.findExpiredStepAwayTokens(now);
    
    for (Token token : expiredTokens) {
        token.setState(TokenState.EXPIRED);
        tokenRepository.save(token);
        
        auditLogService.log(
            "STEP_AWAY_EXPIRED",
            token.getId(),
            "Token expired after 15-minute grace period"
        );
    }
}
```

---

## 9. API ERROR RESPONSE FORMAT

### 9.1 Standard Error Response

```json
{
  "success": false,
  "timestamp": "2023-10-24T10:42:35.123Z",
  "status": 400,
  "error": "Bad Request",
  "code": "QUEUE_FULL",
  "message": "Queue 'Walk-In Triage' is at maximum capacity (50/50)",
  "path": "/api/v1/tokens/join",
  "errors": []
}
```

### 9.2 Validation Error Response

```json
{
  "success": false,
  "timestamp": "2023-10-24T10:42:35.123Z",
  "status": 422,
  "error": "Unprocessable Entity",
  "code": "VALIDATION_ERROR",
  "message": "Input validation failed",
  "path": "/api/v1/tokens/join",
  "errors": [
    {
      "field": "customerPhone",
      "message": "Phone number must be in E.164 format",
      "rejectedValue": "555-1234"
    }
  ]
}
```

### 9.3 Error Code Catalog

| HTTP | Code | Message | Scenario |
|------|------|---------|----------|
| 400 | `INVALID_TOKEN_STATE` | Token is in invalid state for this operation | Calling next on COMPLETED token |
| 401 | `INVALID_CREDENTIALS` | Invalid email or password | Login failure |
| 401 | `TOKEN_EXPIRED` | JWT token has expired | Expired access token |
| 403 | `UNAUTHORIZED_TENANT_ACCESS` | Access denied to organization resources | Org A user accessing Org B |
| 403 | `INSUFFICIENT_PERMISSIONS` | User role lacks required permissions | STAFF trying to create tenant |
| 404 | `TOKEN_NOT_FOUND` | Token with ID {id} not found | Invalid token lookup |
| 404 | `QUEUE_NOT_FOUND` | Queue not found for service | Service has no active queue |
| 409 | `QUEUE_FULL` | Queue is at maximum capacity | Capacity exceeded |
| 409 | `QUEUE_PAUSED` | Queue is currently paused | Joining paused queue |
| 409 | `COUNTER_NOT_AVAILABLE` | Counter is not ONLINE | CALL NEXT on OFFLINE counter |
| 409 | `COUNTER_ALREADY_SERVING` | Counter is currently serving | CALL NEXT while serving |
| 409 | `DUPLICATE_TOKEN` | Token number already exists | Sequence generation failure |
| 422 | `VALIDATION_ERROR` | Input validation failed | Invalid phone format |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected error occurred | Uncaught exception |

---

## 10. DEPLOYMENT CONFIGURATION

### 10.1 Environment Variables

**.env.example:**
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=align_qms
DB_USERNAME=align_user
DB_PASSWORD=secure_password_here

# JWT
JWT_SECRET=your-256-bit-secret-key-base64-encoded
JWT_ACCESS_TOKEN_EXPIRATION=900000       # 15 minutes in ms
JWT_REFRESH_TOKEN_EXPIRATION=604800000   # 7 days in ms

# Server
SERVER_PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,https://align.example.com

# Logging
LOG_LEVEL=INFO

# WebSocket
WEBSOCKET_MESSAGE_SIZE_LIMIT=65536       # 64 KB
```

### 10.2 application.yml

```yaml
spring:
  application:
    name: align-qms-backend
  
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:align_qms}
    username: ${DB_USERNAME:align_user}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      connection-timeout: 30000
  
  jpa:
    hibernate:
      ddl-auto: validate  # Flyway manages schema
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        jdbc:
          time_zone: UTC
  
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
  
  security:
    jwt:
      secret: ${JWT_SECRET}
      access-token-expiration: ${JWT_ACCESS_TOKEN_EXPIRATION:900000}
      refresh-token-expiration: ${JWT_REFRESH_TOKEN_EXPIRATION:604800000}

server:
  port: ${SERVER_PORT:8080}
  error:
    include-message: always
    include-binding-errors: always
    include-stacktrace: never

logging:
  level:
    root: ${LOG_LEVEL:INFO}
    com.align.qms: DEBUG
    org.springframework.security: DEBUG
    org.hibernate.SQL: DEBUG
```

### 10.3 Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: align-postgres
    environment:
      POSTGRES_DB: align_qms
      POSTGRES_USER: align_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
  
  backend:
    build: ./backend
    container_name: align-backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: align_qms
      DB_USERNAME: align_user
      DB_PASSWORD: dev_password
      JWT_SECRET: dev-secret-key-change-in-production
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres-data:
```

---

## 11. IMPLEMENTATION ROADMAP

### Week 1: Foundation
- [x] Inspection complete
- [ ] Create backend directory structure
- [ ] Maven pom.xml
- [ ] Spring Boot initialization
- [ ] PostgreSQL connection
- [ ] Flyway setup
- [ ] Environment configuration
- [ ] Exception handling framework
- [ ] Logging configuration
- [ ] Health endpoint

### Week 2: Security
- [ ] User entity + repository
- [ ] Password hashing (BCrypt)
- [ ] JWT token provider
- [ ] Authentication filter
- [ ] Login endpoint
- [ ] /auth/me endpoint
- [ ] Refresh token logic
- [ ] Spring Security configuration
- [ ] RBAC implementation
- [ ] Security tests

### Week 3: Organization Domain
- [ ] Organization entity + CRUD
- [ ] Location entity + CRUD
- [ ] Service entity + CRUD
- [ ] Queue entity + configuration
- [ ] Counter entity + CRUD
- [ ] Tenant isolation enforcement
- [ ] Authorization tests

### Week 4: Queue/Token Engine ⚠️
- [ ] Token entity
- [ ] Sequence generation strategy
- [ ] Token join endpoint
- [ ] Token lookup endpoint
- [ ] Position calculation
- [ ] Wait time calculator
- [ ] Step Away logic
- [ ] Token cancellation
- [ ] State machine validation
- [ ] **CRITICAL: Concurrent token issuance test**

### Week 5: Staff Operations ⚠️
- [ ] Counter availability management
- [ ] CALL NEXT implementation (with locking)
- [ ] Recall endpoint
- [ ] Complete service endpoint
- [ ] Skip/No-show endpoint
- [ ] Staff queue view
- [ ] Counter authorization
- [ ] **CRITICAL: Concurrent CALL NEXT test**

### Week 6: Realtime
- [ ] WebSocket configuration
- [ ] STOMP setup
- [ ] Event publisher service
- [ ] Topic structure implementation
- [ ] Post-commit event listeners
- [ ] Frontend WebSocket client integration
- [ ] Realtime integration tests

### Week 7: Admin & Analytics
- [ ] Org Admin operations
- [ ] Staff management endpoints
- [ ] Staff-counter assignment
- [ ] Platform tenant management
- [ ] Dashboard analytics (org)
- [ ] Platform analytics
- [ ] Audit log retrieval

### Week 8: Testing & Documentation
- [ ] Complete unit test suite
- [ ] Integration test suite
- [ ] Concurrency stress tests
- [ ] Security tests
- [ ] Performance baseline
- [ ] API documentation (Swagger)
- [ ] Database ERD
- [ ] Deployment guide

---

## 12. SUCCESS CRITERIA

### Phase Completion Checklist

#### ✅ Foundation Complete When:
- [ ] Spring Boot application starts successfully
- [ ] PostgreSQL connection established
- [ ] Flyway migrations execute
- [ ] Health endpoint returns 200 OK
- [ ] Environment variables loaded
- [ ] Logging operational

#### ✅ Security Complete When:
- [ ] User can login with valid credentials
- [ ] JWT access token generated
- [ ] Refresh token persisted
- [ ] /auth/me returns current user
- [ ] Invalid credentials rejected
- [ ] Expired tokens rejected
- [ ] RBAC tests pass

#### ✅ Token Engine Complete When:
- [ ] Customer can join queue
- [ ] Token number generated atomically
- [ ] Token lookup returns correct data
- [ ] Position ahead calculated correctly
- [ ] Wait time estimated
- [ ] Step Away activates correctly
- [ ] Token cancellation works
- [ ] **100 concurrent token requests = 0 duplicates**

#### ✅ Staff Operations Complete When:
- [ ] Staff can CALL NEXT
- [ ] Next waiting token retrieved correctly
- [ ] Counter status updates
- [ ] Token state transitions to CALLED
- [ ] Recall triggers announcement
- [ ] Complete service clears counter
- [ ] Skip/no-show archives token
- [ ] **10 concurrent CALL NEXT = 0 duplicate assignments**

#### ✅ Realtime Complete When:
- [ ] WebSocket connection established
- [ ] STOMP subscriptions work
- [ ] TOKEN_CALLED event received on public topic
- [ ] Staff topic receives full event
- [ ] Token-specific topic updates customer
- [ ] Events published after commit
- [ ] No PII leaked on public topics

---

## 13. RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| **Duplicate token numbers** | PostgreSQL sequences + UNIQUE constraint + integration test |
| **Race condition in CALL NEXT** | `SELECT FOR UPDATE SKIP LOCKED` + integration test |
| **Tenant data leakage** | AOP tenant isolation + repository filtering + security tests |
| **JWT secret exposure** | Environment variables + .gitignore + .env.example documentation |
| **WebSocket event before commit** | `@TransactionalEventListener(AFTER_COMMIT)` |
| **Step Away never expires** | Scheduled job + monitoring |
| **Queue capacity overflow** | Atomic capacity check + database constraint |
| **Database migration conflicts** | Flyway version control + code review |

---

**Document Status:** READY FOR IMPLEMENTATION  
**Next Action:** Begin Phase 0 - Foundation  
**Expected Timeline:** 8 weeks (1 developer, full-time)

---

**END OF ARCHITECTURE PLAN**
