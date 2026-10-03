# ALIGN — LIVING PROJECT ROADMAP

**Version:** 2.0 (FINAL CLOSURE - FULLY FUNCTIONAL MVP)
**Last Updated:** 2026-10-02

## CURRENT PROJECT STATE

### Completed and Verified (MVP Closure)
- **Phase 0 Foundation**
- **Phase 1 Security**
- **Phase 2 Organization Domain**
- **Phase 3 Token Engine**
- **Phase 4 Staff Operations**
- **Phase 5 Realtime**
- **Phase 6 Admin & Analytics**
- **Phase 7 Testing & Validation** (Security, Concurrency, Regression)
- **Phase 8 E2E flows & MVP Gaps** (Journey, Preparation, ETAs, Announcements)
- **Final Closure Project Hygiene**

### Implemented but Validation Pending
- None. Fully Functional MVP verified (Backend 217/217, Frontend builds/lints, E2E suite passes).

### In Progress
- Final closure completed. (This is the final checkpoint before productionization/SaaS upgrades).

### Blocked
- None. No known critical blockers remain for the MVP.

### Future / Optional
- Twilio SMS Provider Integration
- Advanced AI/ML wait time modeling

## GIT / REMOTE STATUS
- **Current Branch:** `main`
- **Current Local Commit:** `7820f54 feat(e2e): complete Phase 8 E2E test suite` (Final MVP Checkpoint)
- **Upstream Branch:** `origin/main`
- **Working Tree Status:** Clean (with exceptions of final E2E cleanup).

## ORIGINAL ROADMAP STATUS

- **Phase 0 (Foundation):** ✅ COMPLETE
- **Phase 1 (Security):** ✅ COMPLETE
- **Phase 2 (Organization Domain):** ✅ COMPLETE
- **Phase 3 (Queue/Token Engine):** ✅ COMPLETE
- **Phase 4 (Staff Operations):** ✅ COMPLETE
- **Phase 5 (Realtime):** ✅ COMPLETE
- **Phase 6 (Admin & Analytics):** ✅ COMPLETE
- **Phase 7 (Testing):** 🟡 PARTIALLY COMPLETE (Unit/Integration testing robust, but performance profiling and formal JaCoCo constraints pending).
- **Phase 8 (Documentation):** 🟡 PARTIALLY COMPLETE (Architecture complete. OpenAPI, ERD, and DEPLOYMENT.md pending).

## WORK IMPLEMENTED BEYOND ORIGINAL ROADMAP

- **Feature:** Notification Foundation
  - **Why it is outside the original roadmap:** Not explicitly outlined in early queue definitions.
  - **Current status:** Implemented.
  - **Validation status:** Verified (E2E `phase-7-1-notifications.cjs` passes).
  - **Related phase/current placement:** Phase 7.1
- **Feature:** Operating Hours
  - **Why it is outside the original roadmap:** Not in original MVP scope.
  - **Current status:** Implemented.
  - **Validation status:** Verified (E2E `phase-7-2-operating-hours.cjs` passes).
  - **Related phase/current placement:** Phase 7.2
- **Feature:** Customer Consent (SMS)
  - **Why it is outside the original roadmap:** PII/Consent flow not outlined originally.
  - **Current status:** Implemented.
  - **Validation status:** Verified (E2E `phase-7-3-customer-consent.cjs` passes).
  - **Related phase/current placement:** Phase 7.3
- **Feature:** Journey Functionality
  - **Why it is outside the original roadmap:** Queues were initially single-stage.
  - **Current status:** Implemented.
  - **Validation status:** Verified (Backend suite & E2E pass).
  - **Related phase/current placement:** Phase 8
- **Feature:** Preparation Requirements
  - **Why it is outside the original roadmap:** Added to streamline customer onboarding.
  - **Current status:** Implemented.
  - **Validation status:** Verified (Frontend UI and Backend CRUD working).
  - **Related phase/current placement:** Phase 8
- **Feature:** Announcement Templates
  - **Why it is outside the original roadmap:** Added for staff operational efficiency.
  - **Current status:** Implemented.
  - **Validation status:** Verified (Frontend CRUD and Backend APIs functional).
  - **Related phase/current placement:** Phase 8
- **Feature:** ETA Hardening & Realtime Position Polling
  - **Why it is outside the original roadmap:** Hardened to handle WebSocket disconnects.
  - **Current status:** Implemented.
  - **Validation status:** Verified (Frontend polling mechanisms working).
  - **Related phase/current placement:** Phase 8

## CURRENT PHASE 8 STATUS

### Journey
- Journey model: Implemented and Verified
- Journey progression: Implemented and Verified
- automatic progression: Implemented and Verified
- realtime event handling: Implemented and Verified
- customer recovery flow: Implemented and Verified
- E2E validation: Implemented and Verified

### Preparation Requirements
- backend API: Implemented and Verified
- customer UI: Implemented and Verified
- admin CRUD: Implemented and Verified
- validation: Implemented and Verified
- E2E coverage: Implemented and Verified

### Announcement Templates
- backend API: Implemented and Verified
- admin UI: Implemented and Verified
- CRUD behavior: Implemented and Verified
- RBAC/security: Implemented and Verified
- validation/E2E coverage: Implemented and Verified

### ETA Hardening
- TokenPositionResponse: Implemented and Verified
- API integration: Implemented and Verified
- ETA range display: Implemented and Verified
- confidence display: Implemented and Verified
- polling/runtime behavior: Implemented and Verified
- E2E validation: Implemented and Verified

### Phase 8 Final Gate
- backend regression: Verified PASS (217/217)
- frontend lint: Verified PASS
- TypeScript: Verified PASS
- production build: Verified PASS
- Phase 8 E2E: Verified PASS (`phase-8.cjs`)
- regression E2E: Verified PASS

## CURRENTLY BLOCKED / PENDING VALIDATION
- None.

## ORIGINAL ROADMAP REMAINING

### Phase 7 — TESTING
- Test infrastructure: ✅ COMPLETE
- Unit tests: ✅ COMPLETE
- Integration tests: ✅ COMPLETE
- Security tests: ✅ COMPLETE (All baseline security boundaries verified)
- Business rules: ✅ COMPLETE
- Concurrency testing: ✅ COMPLETE (Concurrency behavior verified for token queue engine)
- Performance baseline: ❌ NOT COMPLETE (SaaS requirement, not MVP)
- JaCoCo: ❌ NOT COMPLETE
- Coverage target: ❌ NOT COMPLETE
- Regression testing: ✅ COMPLETE

### Phase 8 — DOCUMENTATION
- Springdoc/OpenAPI: ✅ COMPLETE
- Swagger UI: ✅ COMPLETE
- ERD: ❌ NOT COMPLETE
- Data retention policy: ❌ NOT COMPLETE
- Backup strategy: ❌ NOT COMPLETE
- DEPLOYMENT.md: ❌ NOT COMPLETE
- README: ❌ NOT COMPLETE
- CHANGELOG: ❌ NOT COMPLETE
- production configuration documentation: ❌ NOT COMPLETE

## FUTURE / OPTIONAL WORK
- Realtime Webhooks API
- Multi-language localization

---

# ORIGINAL ROADMAP — HISTORICAL BASELINE

# ALIGN BACKEND — IMPLEMENTATION TODO

**Version:** 1.4 (Phase 1 Validated)  
**Last Updated:** 2026-09-07  
**Status:** PHASE 1 COMPLETE ✅

---

## ⚠️ CURRENT STATUS

**Backend Implementation:** Phase 1 COMPLETE ✅

**Phase 0 (Foundation):** ✅ **COMPLETE** (All tests pass, Testcontainers operational)  
**Phase 1 (Security):** ✅ **COMPLETE** (30/30 tests pass, all security behavior validated)  
**Phase 2 (Organization Domain):** ❌ NOT STARTED  
**Phase 3 (Token Engine):** ❌ NOT STARTED  
**Phase 4 (Staff Operations):** ❌ NOT STARTED  
**Phase 5 (Realtime):** ❌ NOT STARTED  
**Phase 6 (Admin & Analytics):** ❌ NOT STARTED  
**Phase 7 (Testing):** ❌ NOT STARTED  
**Phase 8 (Documentation):** ✅ **ARCHITECTURE COMPLETE**

---

## PHASE 0: FOUNDATION (Week 1) — ✅ COMPLETE

### Project Structure
- [x] Create `backend/` directory
- [x] Create Maven `pom.xml`
- [x] Define package structure (`com.align.qms`)
- [x] Create base package directories (config, controller, service, repository, entity, dto, etc.)
- [x] Create `.gitignore` for backend (exclude `target/`, `.env`, etc.)
- [ ] Create `backend/README.md` (deferred to Phase 8)

### Spring Boot Initialization
- [x] Spring Boot 3.2.5 main application class (`AlignApplication.java`)
- [x] `application.yml` base configuration
- [x] `application-dev.yml` development profile
- [x] `application-prod.yml` production profile
- [x] `application-test.yml` test profile (Testcontainers)
- [x] `.env.example` template

### Database Connection
- [x] PostgreSQL connection configuration
- [x] Flyway configuration (`ddl-auto: validate` not applicable — no JPA in Phase 0)
- [x] Test database connection — **VERIFIED: Testcontainers PostgreSQL 15-alpine**

### Flyway Setup
- [x] Add Flyway dependency to `pom.xml` (9.22.3 via Spring Boot BOM)
- [x] Create `src/main/resources/db/migration/` directory
- [x] Configure Flyway in `application.yml`
- [x] Create V1__foundation.sql migration (PostgreSQL version check + schema_info table)
- [x] Test Flyway migration execution — **VERIFIED: Migration successful**

### Exception Handling Framework
- [x] Create `GlobalExceptionHandler.java` with `@ControllerAdvice`
- [x] Create base exception classes:
  - [x] `AlignException.java` (base)
  - [x] `ResourceNotFoundException.java`
  - [x] `BusinessException.java`
- [x] Create error response DTOs:
  - [x] `ErrorResponse.java` (with builder, includes field-level validation errors)
- [x] Test exception handling (verified via @SpringBootTest context load)

### Logging Configuration
- [x] Configure `logback-spring.xml`
- [x] Set up console logging (dev)
- [x] Set up file logging (prod)
- [x] Configure log levels per package
- [x] Remove stale Hibernate/JPA loggers (Phase 0 cleanup)
- [x] Fix logback warnings (nested springProfile elements)
- [x] Test logging output — **VERIFIED: Test execution logs clean**

### Health & Actuator
- [x] Add Spring Boot Actuator dependency
- [x] Configure `/actuator/health` endpoint
- [x] Configure `/actuator/info` endpoint
- [x] Actuator endpoints public (no Spring Security in Phase 0)
- [x] Test health endpoint — **VERIFIED: Test passes**

### Environment Variables
- [x] Define required environment variables
- [x] Create `.env.example` with:
  - [x] `DB_HOST`
  - [x] `DB_PORT`
  - [x] `DB_NAME`
  - [x] `DB_USERNAME`
  - [x] `DB_PASSWORD`
  - [x] `JWT_SECRET` (Phase 1)
  - [x] `JWT_ACCESS_TOKEN_EXPIRATION` (Phase 1)
  - [x] `JWT_REFRESH_TOKEN_EXPIRATION` (Phase 1)
  - [x] `ALLOWED_ORIGINS` (Phase 1)
- [x] Test environment variable loading — **VERIFIED: @DynamicPropertySource works**

### Initial Build & Run
- [x] Run `.\mvnw.cmd clean compile` — **BUILD SUCCESS**
- [x] Run `.\mvnw.cmd test` — **4 TESTS PASSED, 0 FAILURES**
- [x] Verify application starts successfully — **VERIFIED: @SpringBootTest context loads**
- [x] Test `/actuator/health` returns 200 OK — **VERIFIED: Test passes**
- [x] Commit Phase 0 completion — **READY**

**✅ Phase 0 Complete:**
- [x] Code written
- [x] Maven compilation successful
- [x] Dependencies correct (no JPA, no Security, no WebSocket in Phase 0)
- [x] Tests execute and pass (4/4)
- [x] Application starts without errors
- [x] PostgreSQL connection successful (via Testcontainers)
- [x] Flyway migrations execute (V1__foundation.sql)
- [x] Health endpoint accessible (HTTP 200)
- [x] Logging operational and clean

**Testcontainers Verification:**
- Docker Server: 29.7.2
- Testcontainers: 1.21.4
- PostgreSQL: 15-alpine
- Container startup: SUCCESS
- Migration execution: SUCCESS
- All 4 tests: PASS

---

## PHASE 1: SECURITY (Week 1-2) — ✅ COMPLETE

### Database Schema
- [x] V2__security.sql — organizations stub (FK anchor for users.org_id)
- [x] V2__security.sql — users table with role/status constraints and indexes
- [x] V2__security.sql — refresh_tokens table (SHA-256 hash, not plaintext)

### Entity Classes
- [x] `User.java` — id, orgId, email, passwordHash, name, role, status, locationId, assignedCounterNumber, timestamps
- [x] `RefreshToken.java` — id, user (FK), tokenHash, expiresAt, createdAt; `isExpired()` helper
- [x] `UserRole` enum — STAFF, ORG_ADMIN, PLATFORM_ADMIN
- [x] `UserStatus` enum — ACTIVE, INACTIVE

### Repository Layer
- [x] `UserRepository.java` — findByEmail, findActiveByEmail, existsByEmailIgnoreCase, findByOrgId, findByOrgIdAndRole, findByOrgIdAndStatus
- [x] `RefreshTokenRepository.java` — findByTokenHash, deleteAllByUserId, deleteAllExpiredBefore

### Password Hashing
- [x] BCrypt encoder bean (strength 12) in SecurityConfig
- [x] Hash verified: plaintext never stored, `$2a$` prefix confirmed in tests

### JWT Implementation
- [x] `JwtService.java` — HS512, jjwt 0.12.6, secret from env var, claims: sub (userId), orgId, role, locationId
- [x] `generateAccessToken(User)` — signed, 15-min TTL
- [x] `isTokenValid(String)` — validates signature + expiry
- [x] `extractUserId`, `extractOrgId`, `extractRole`, `extractLocationId`
- [x] `extractUserIdUnchecked` — returns sub from expired token for filter use

### Authentication Filter
- [x] `JwtAuthenticationFilter.java` — extracts Bearer token, loads UserDetails by UUID, validates token, checks account enabled, sets SecurityContext

### Security Configuration
- [x] `SecurityConfig.java` — stateless sessions, CSRF disabled, HTTP Basic disabled, deny-by-default, CORS, public endpoints: /api/v1/auth/login, /api/v1/auth/refresh, /actuator/health, /ws-align/**
- [x] `@EnableMethodSecurity(prePostEnabled = true)` for `@PreAuthorize`

### User Principal / UserDetails
- [x] `UserPrincipal.java` — UserDetails adapter with orgId, role, locationId, ROLE_ authority prefix
- [x] `UserDetailsServiceImpl.java` — loadUserByUsername (email), loadUserById (UUID)

### Tenant Context
- [x] `TenantContext.java` — reads orgId/role/locationId from SecurityContext; `requireSameTenant()` blocks cross-org access; PLATFORM_ADMIN passes unconditionally

### DTOs
- [x] `LoginRequest.java` — @NotBlank @Email email, @NotBlank @Size(min=8,max=128) password
- [x] `LoginResponse.java` — accessToken, refreshToken, expiresIn (seconds), UserResponse
- [x] `RefreshTokenRequest.java` — @NotBlank refreshToken
- [x] `RefreshResponse.java` — accessToken, expiresIn
- [x] `UserResponse.java` — id, name, email, role, orgId, locationId (never passwordHash); @JsonInclude(NON_NULL)

### Service Layer
- [x] `AuthService.java` — login (AuthenticationManager, no enumeration, DisabledException handling), refresh (validateAndRotate + new pair), logout (revokeAll), getCurrentUser (from SecurityContext → DB reload)
- [x] `RefreshTokenService.java` — createRefreshToken (random bytes → base64 → SHA-256 hash → persist), validateAndRotate (hash lookup → delete old → return user), revokeAllForUser, scheduled cleanup (03:00 UTC)

### Controller Layer
- [x] `AuthController.java` — POST /api/v1/auth/login, POST /api/v1/auth/refresh, POST /api/v1/auth/logout, GET /api/v1/auth/me

### Exception Classes
- [x] `InvalidCredentialsException.java` — 401 INVALID_CREDENTIALS
- [x] `DisabledUserException.java` — 401 ACCOUNT_DISABLED
- [x] `UnauthorizedTenantAccessException.java` — 403 TENANT_ACCESS_DENIED

### Error Handling Updates
- [x] `GlobalExceptionHandler.java` — handles AuthenticationException (401), AccessDeniedException (403), MethodArgumentNotValidException (422), NoResourceFoundException (404), catch-all (500)
- [x] `AuthEntryPoint.java` — 401 JSON response via ObjectMapper
- [x] `AccessDeniedHandlerImpl.java` — 403 JSON response via ObjectMapper

### Security Configuration
- [x] `application.yml` — align.jwt.* (secret, expiry), align.cors.allowed-origins
- [x] `application-test.yml` — fixed 64-char test JWT secret, hikari connection-timeout: 5000

### Testing
- [x] SecurityIntegrationTest: 26 integration tests covering all mandated Phase 1 behaviors
- [x] AlignApplicationTest: 4 tests (context load, /health, /info → 401, unknown endpoint → 401)

**✅ Phase 1 Complete:**
- [x] Code written
- [x] Maven compilation successful (31 source files)
- [x] V1 + V2 Flyway migrations execute on real PostgreSQL
- [x] All 30 tests pass (AlignApplicationTest: 4/4, SecurityIntegrationTest: 26/26)
- [x] Login, refresh, logout, /me endpoints working
- [x] BCrypt hashing verified
- [x] JWT generation + validation verified
- [x] JWT expiry, tamper, forge → 401 verified
- [x] Refresh token rotation verified
- [x] Tenant isolation (TenantContext) verified
- [x] 401/403 distinction verified
- [x] No account enumeration verified
- [x] Disabled account rejection verified

**Testcontainers Verification (2026-09-07):**
- Docker Server: 29.7.2
- Testcontainers: 1.21.4
- PostgreSQL: 15.19-alpine
- Container startup: SUCCESS
- Flyway V1 + V2 migration: SUCCESS
- All 30 tests: PASS
- Build: SUCCESS in 56.332s

---

## PHASE 2: ORGANIZATION DOMAIN (Week 2-3) — NOT STARTED

### Database Schema
- [ ] Create migration `V1__create_organizations.sql`
- [ ] Create migration `V3__create_locations.sql`
- [ ] Create migration `V4__create_services.sql`
- [ ] Create migration `V5__create_queues.sql` ⭐ includes `next_token_number`
- [ ] Create migration `V6__create_counters.sql`
- [ ] Create migration `V10__create_indexes.sql`
- [ ] Run all migrations

### Entity Classes
- [ ] Create `Organization.java`
- [ ] Create `Location.java`
- [ ] Create `Service.java`
- [ ] Create `Queue.java` ⭐ with `nextTokenNumber` field
- [ ] Create `Counter.java`
- [ ] Create enums: `QueueStatus`, `CounterAvailability`, `CounterStatus`

### Repository Layer
- [ ] Create `OrganizationRepository.java`
- [ ] Create `LocationRepository.java`
  - [ ] `findByOrgId(UUID orgId)`
  - [ ] `findByOrgIdAndStatus(UUID orgId, String status)`
- [ ] Create `ServiceRepository.java`
  - [ ] `findByLocationIdAndEnabled(UUID locationId, boolean enabled)`
- [ ] Create `QueueRepository.java`
  - [ ] `findByServiceId(UUID serviceId)`
  - [ ] `findByIdForUpdate(UUID id)` ⭐ for atomic counter increment
- [ ] Create `CounterRepository.java`
  - [ ] `findByLocationId(UUID locationId)`

### DTOs
- [ ] Request DTOs: `CreateOrganizationRequest`, `CreateLocationRequest`, `CreateServiceRequest`, `CreateQueueRequest`, `UpdateCounterAvailabilityRequest`
- [ ] Response DTOs: `OrganizationResponse`, `LocationResponse`, `ServiceResponse`, `QueueResponse`, `CounterResponse`

### Mapper Classes
- [ ] Create `LocationMapper.java`
- [ ] Create `ServiceMapper.java`
- [ ] Create `QueueMapper.java`
- [ ] Create `CounterMapper.java`

### Service Layer
- [ ] Create `OrganizationService.java`
  - [ ] CRUD operations
  - [ ] Tenant isolation enforcement
- [ ] Create `LocationService.java`
  - [ ] CRUD operations
  - [ ] Validate orgId ownership
- [ ] Create `ServiceService.java`
- [ ] Create `QueueService.java`
  - [ ] Pause/resume queue
  - [ ] Update configuration
- [ ] Create `CounterService.java`
  - [ ] Update availability

### Tenant Isolation
- [ ] Create `TenantContext.java` (ThreadLocal)
- [ ] Create `@RequireTenantAccess` annotation
- [ ] Create `TenantIsolationAspect.java` (AOP)
- [ ] Implement tenant validation in service methods

### Controller Layer
- [ ] Create `TenantController.java` (Platform Admin only)
- [ ] Create `LocationController.java`
- [ ] Create `ServiceController.java`
- [ ] Create `QueueController.java`
- [ ] Create `CounterController.java`
- [ ] Add authorization annotations (`@PreAuthorize`)

### Exception Classes
- [ ] Create `QueueNotFoundException.java`
- [ ] Create `LocationNotFoundException.java`
- [ ] Create `UnauthorizedTenantAccessException.java`

### Testing
- [ ] Unit test: Tenant isolation aspect
- [ ] Integration test: Org A cannot access Org B locations
- [ ] Integration test: Create location (Org Admin)
- [ ] Integration test: Create location (Platform Admin)
- [ ] Integration test: Update queue configuration
- [ ] Integration test: Pause/resume queue

**✅ Phase 2 Complete When:**
- [ ] Organization CRUD operations work
- [ ] Location CRUD operations work
- [ ] Service CRUD operations work
- [ ] Queue configuration works
- [ ] Counter management works
- [ ] Tenant isolation enforced (Org A ≠ Org B)
- [ ] All authorization tests pass

---

## PHASE 3: QUEUE/TOKEN ENGINE (Week 3-4) ⚠️ CRITICAL

### Database Schema
- [ ] Create migration `V7__create_tokens.sql`
  - [ ] Include `idempotency_key` with UNIQUE constraint
  - [ ] Include `step_away_expires_at`
  - [ ] Include all state fields
- [ ] Create migration `V8__create_token_events.sql` ⭐ NEW
  - [ ] Separate lifecycle event history table
  - [ ] JSONB metadata column
- [ ] Run migrations

### Entity Classes
- [ ] Create `Token.java`
  - [ ] All fields per DATABASE.md
  - [ ] `transitionTo(TokenState)` method ⭐ state machine enforcement
  - [ ] `isActive()` helper method
- [ ] Create `TokenEvent.java` ⭐ NEW
  - [ ] `tokenId`, `eventType`, `fromState`, `toState`, `counterId`, `actorId`, `metadata`, `createdAt`
- [ ] Create `TokenState` enum with `canTransitionTo()` logic ⭐
- [ ] Create `TokenEventType` enum ⭐

### Repository Layer
- [ ] Create `TokenRepository.java`
  - [ ] `findByIdempotencyKey(String key)`
  - [ ] `countActiveTokens(UUID queueId)` ⭐ uses ACTIVE_STATES
  - [ ] `findNextWaitingTokenWithLock(UUID queueId)` ⭐ `FOR UPDATE SKIP LOCKED`
  - [ ] `findExpiredStepAwayTokens(Instant now)`
  - [ ] `countByQueueIdAndStateIn(UUID queueId, Set<TokenState> states)`
- [ ] Create `TokenEventRepository.java` ⭐ NEW
  - [ ] `findByTokenIdOrderByCreatedAtDesc(UUID tokenId)`
  - [ ] `findByEventType(TokenEventType type)`

### Atomic Counter Implementation ⭐
- [ ] Create `TokenNumberGenerator.java` utility
  - [ ] Method: `generateNextTokenNumber(Queue queue)`
  - [ ] Executes: `UPDATE queues SET next_token_number = next_token_number + 1 WHERE id = ? RETURNING next_token_number`
  - [ ] Uses `JdbcTemplate`
  - [ ] Returns formatted token number (`A-043`)

### DTOs
- [ ] Create `TokenJoinRequest.java`
  - [ ] `serviceId`, `customerName` (optional), `customerPhone` (optional), `idempotencyKey` ⭐
  - [ ] Validation annotations
- [ ] Create `TokenResponse.java`
  - [ ] All customer-facing fields
  - [ ] NO password hashes, internal IDs where inappropriate
- [ ] Create `StepAwayRequest.java`
- [ ] Create `QueueStatusResponse.java`

### Service Layer
- [ ] Create `TokenService.java`
  - [ ] `joinQueue(TokenJoinRequest)` ⭐ atomic counter + idempotency
  - [ ] `getToken(UUID tokenId)`
  - [ ] `activateStepAway(UUID tokenId)`
  - [ ] `returnFromStepAway(UUID tokenId)`
  - [ ] `cancelToken(UUID tokenId)`
  - [ ] Handle idempotency conflicts ⭐
- [ ] Create `TokenEventService.java` ⭐ NEW
  - [ ] `recordEvent(Token token, TokenEventType eventType)`
  - [ ] Use `@Transactional(propagation = MANDATORY)`
- [ ] Create `WaitTimeCalculator.java`
  - [ ] Calculate `estimatedWaitMinutes` from queue depth + active counters
  - [ ] Deterministic MVP algorithm (no AI yet)
- [ ] Create `PositionCalculator.java`
  - [ ] Calculate `peopleAhead` from WAITING tokens

### Scheduled Jobs
- [ ] Create `StepAwayExpirationJob.java`
  - [ ] `@Scheduled(fixedRate = 60000)` // Every 60 seconds
  - [ ] Find expired AWAY tokens
  - [ ] Transition to EXPIRED
  - [ ] Record event

### Controller Layer
- [ ] Create `TokenController.java`
  - [ ] `POST /api/v1/tokens/join`
  - [ ] `GET /api/v1/tokens/{tokenId}`
  - [ ] `POST /api/v1/tokens/{tokenId}/step-away`
  - [ ] `POST /api/v1/tokens/{tokenId}/return`
  - [ ] `POST /api/v1/tokens/{tokenId}/cancel`
  - [ ] `GET /api/v1/tokens` (customer history)

### Exception Classes
- [ ] Create `TokenNotFoundException.java`
- [ ] Create `QueueFullException.java`
- [ ] Create `QueuePausedException.java`
- [ ] Create `InvalidTokenStateException.java`
- [ ] Create `DuplicateTokenException.java`
- [ ] Create `StepAwayAlreadyUsedException.java`

### Testing (CRITICAL) ⚠️
- [ ] Unit test: Token state machine (all valid/invalid transitions)
- [ ] Unit test: `isActive()` for all states
- [ ] Unit test: Wait time calculation
- [ ] Unit test: Position calculation
- [ ] **Integration test: Concurrent token issuance (100 threads)** ⚠️ MANDATORY
  - [ ] Must run against PostgreSQL (Testcontainers)
  - [ ] Zero duplicate token numbers
  - [ ] Sequential numbering verified
- [ ] Integration test: Idempotency key conflict (concurrent same key)
- [ ] Integration test: Queue capacity enforcement
- [ ] Integration test: Queue full rejection
- [ ] Integration test: Step Away activation
- [ ] Integration test: Step Away expiration job
- [ ] Integration test: Token cancellation
- [ ] Integration test: TokenEvent recording

**✅ Phase 3 Complete When:**
- [ ] Customer can join queue → token generated
- [ ] Token number atomically incremented (counter strategy)
- [ ] Idempotency key prevents duplicates
- [ ] Queue capacity enforced
- [ ] Step Away activates (15 min grace)
- [ ] Step Away expires correctly
- [ ] Token cancellation works
- [ ] Token events recorded for all transitions ⭐
- [ ] **100 concurrent token requests = 0 duplicates** ⚠️
- [ ] All token engine tests pass

---

## PHASE 4: STAFF OPERATIONS (Week 4-5) ⚠️ CRITICAL

### Service Layer
- [ ] Create `StaffOperationsService.java`
  - [ ] `callNext(UUID counterId)` ⭐ uses `FOR UPDATE SKIP LOCKED`
  - [ ] `recallToken(UUID tokenId, UUID counterId)` (updates timestamp only)
  - [ ] `completeService(UUID tokenId)`
  - [ ] `skipToken(UUID tokenId)` (NO_SHOW)
  - [ ] Validate counter availability before operations
  - [ ] Record token events for all operations ⭐

### Counter Validation
- [ ] Create `CounterValidator.java`
  - [ ] `validateCanCallNext(Counter counter)` per BR-003
  - [ ] Check availability = ONLINE
  - [ ] Check not already serving

### DTOs
- [ ] Create `CallNextRequest.java` (optional, counterId from JWT)
- [ ] Create `RecallRequest.java`
- [ ] Create `StaffQueueViewResponse.java`
  - [ ] Current serving token
  - [ ] Waiting tokens list
  - [ ] Counter status

### Controller Layer
- [ ] Create `StaffOperationsController.java`
  - [ ] `POST /api/v1/staff/call-next`
  - [ ] `POST /api/v1/staff/recall`
  - [ ] `POST /api/v1/staff/complete`
  - [ ] `POST /api/v1/staff/skip`
  - [ ] `GET /api/v1/staff/queue` (current serving + waitlist)
  - [ ] Authorization: `@PreAuthorize("hasAnyRole('STAFF', 'ORG_ADMIN')")`

### Exception Classes
- [ ] Create `CounterNotAvailableException.java`
- [ ] Create `CounterAlreadyServingException.java`
- [ ] Create `NoWaitingTokensException.java`
- [ ] Create `CounterNotFoundException.java`

### Testing (CRITICAL) ⚠️
- [ ] Unit test: Counter availability validation
- [ ] Unit test: CALL NEXT prerequisites check
- [ ] Unit test: Recall updates timestamp only
- [ ] **Integration test: Concurrent CALL NEXT (10 staff)** ⚠️ MANDATORY
  - [ ] Must run against PostgreSQL (Testcontainers)
  - [ ] Zero duplicate token assignments
  - [ ] Each counter gets unique token
  - [ ] `FOR UPDATE SKIP LOCKED` verified
- [ ] Integration test: Complete service (clears counter)
- [ ] Integration test: Skip/no-show (marks NO_SHOW)
- [ ] Integration test: Counter OFFLINE blocks CALL NEXT
- [ ] Integration test: Counter already serving blocks CALL NEXT
- [ ] Integration test: Recall operation

**✅ Phase 4 Complete When:**
- [ ] Staff can call next token
- [ ] Counter status validated
- [ ] Token assigned to counter
- [ ] Recall re-announces (no state change)
- [ ] Complete service works
- [ ] Skip/no-show works
- [ ] **10 concurrent CALL NEXT = 0 duplicate assignments** ⚠️
- [ ] All staff operation tests pass

---

## PHASE 5: REALTIME (Week 5-6) — NOT STARTED

### WebSocket Configuration
- [ ] Add Spring WebSocket dependency
- [ ] Create `WebSocketConfig.java`
  - [ ] `@EnableWebSocketMessageBroker`
  - [ ] Register `/ws-align` endpoint
  - [ ] Enable SockJS fallback
  - [ ] Configure STOMP broker

### Event POJOs
- [ ] Create `TokenCalledEvent.java`
- [ ] Create `TokenJoinedEvent.java`
- [ ] Create `TokenCompletedEvent.java`
- [ ] Create `TokenCancelledEvent.java`
- [ ] Create `CounterStatusChangedEvent.java`
- [ ] Create `QueuePausedEvent.java`

### Event Publisher
- [ ] Create `WebSocketEventPublisher.java`
  - [ ] Inject `SimpMessagingTemplate`
  - [ ] Method: `publishTokenCalledEvent()` with `@TransactionalEventListener(AFTER_COMMIT)` ⭐
  - [ ] Method: `publishTokenJoinedEvent()`
  - [ ] Method: `publishCounterStatusChangedEvent()`
  - [ ] Separate public/staff topic payloads (no PII on public)

### Topic Structure
- [ ] Public topic: `/topic/tenant/{orgId}/location/{locId}/public`
- [ ] Staff topic: `/topic/tenant/{orgId}/location/{locId}/staff`
- [ ] Token-specific: `/topic/token/{tokenId}`

### Service Integration
- [ ] Update `StaffOperationsService.callNext()` → publish event
- [ ] Update `TokenService.joinQueue()` → publish event
- [ ] Update `TokenService.cancelToken()` → publish event
- [ ] Update `StaffOperationsService.completeService()` → publish event
- [ ] Update `CounterService.updateAvailability()` → publish event

### Frontend WebSocket Client (Optional Frontend Update)
- [ ] Create WebSocket connection in frontend
- [ ] Subscribe to topics
- [ ] Handle incoming events
- [ ] Update UI in realtime

### Testing
- [ ] Integration test: WebSocket connection established
- [ ] Integration test: STOMP subscription works
- [ ] Integration test: TOKEN_CALLED event published to public topic
- [ ] Integration test: TOKEN_CALLED event published to staff topic
- [ ] Integration test: Public topic does NOT contain customer PII
- [ ] Integration test: Event published AFTER transaction commit ⭐
- [ ] Integration test: Transaction rollback → event NOT published

**✅ Phase 5 Complete When:**
- [ ] WebSocket connection works
- [ ] STOMP subscriptions work
- [ ] Events broadcast to correct topics
- [ ] Public topic has no PII
- [ ] Events published after commit only
- [ ] Frontend receives realtime updates (if updated)

---

## PHASE 6: ADMIN & ANALYTICS (Week 6-7) — NOT STARTED

### Staff Management
- [ ] Create `StaffManagementService.java`
  - [ ] `createStaff(CreateStaffRequest)`
  - [ ] `assignCounter(UUID staffId, UUID counterId)`
  - [ ] `deactivateStaff(UUID staffId)`
  - [ ] `listOrganizationStaff(UUID orgId)`
- [ ] Create `StaffManagementController.java`
  - [ ] `POST /api/v1/organizations/{orgId}/staff`
  - [ ] `PUT /api/v1/staff/{staffId}/assign-counter`
  - [ ] `PUT /api/v1/staff/{staffId}/status`
  - [ ] `GET /api/v1/organizations/{orgId}/staff`

### Analytics Service
- [ ] Create `AnalyticsService.java`
  - [ ] `getOrganizationDashboard(UUID orgId)`
    - [ ] Tokens served today
    - [ ] Average wait time
    - [ ] Active queues
    - [ ] Staff utilization
  - [ ] `getPlatformDashboard()`
    - [ ] Total tokens issued (7 days)
    - [ ] Active organizations
    - [ ] System health metrics
  - [ ] Use `TokenEvent` table for accurate analytics ⭐

### Analytics DTOs
- [ ] Create `OrganizationDashboardResponse.java`
- [ ] Create `PlatformDashboardResponse.java`
- [ ] Create `QueueStatsResponse.java`
- [ ] Create `ServiceStatsResponse.java`

### Controller Layer
- [ ] Create `AnalyticsController.java`
  - [ ] `GET /api/v1/organizations/{orgId}/analytics/dashboard`
  - [ ] `GET /api/v1/platform/analytics/dashboard`

### Audit Logging
- [ ] Create migration `V9__create_audit_logs.sql`
- [ ] Create `AuditLog.java` entity
- [ ] Create `AuditLogRepository.java`
- [ ] Create `AuditLogService.java`
  - [ ] `log(String action, UUID aggregateId, String details)`
  - [ ] Record administrative actions (NOT token lifecycle)
- [ ] Integrate audit logging in services

### Testing
- [ ] Integration test: Create staff (Org Admin)
- [ ] Integration test: Assign staff to counter
- [ ] Integration test: Deactivate staff
- [ ] Integration test: Organization dashboard analytics
- [ ] Integration test: Platform dashboard analytics
- [ ] Integration test: Platform Admin can view all orgs
- [ ] Integration test: Platform Admin CANNOT call next

**✅ Phase 6 Complete When:**
- [ ] Staff management CRUD works
- [ ] Counter assignment works
- [ ] Organization analytics calculated correctly
- [ ] Platform analytics calculated correctly
- [ ] Audit logs recorded
- [ ] All admin tests pass

---

## PHASE 7: TESTING (Week 7-8) — NOT STARTED

### Test Infrastructure
- [ ] Configure Testcontainers base class
- [ ] Set up test database
- [ ] Configure test profiles
- [ ] Create test data factories

### Unit Test Suite
- [ ] Service layer: 90% coverage
- [ ] Repository layer: 80% coverage
- [ ] Controller layer: 85% coverage
- [ ] Entity logic: 95% coverage

### Integration Test Suite
- [ ] All CRUD operations
- [ ] All business rules (BR-001 through BR-013)
- [ ] All state transitions
- [ ] All authorization checks
- [ ] **Concurrent token issuance** ⚠️
- [ ] **Concurrent CALL NEXT** ⚠️
- [ ] Idempotency handling
- [ ] Tenant isolation
- [ ] Step Away expiration
- [ ] Queue capacity enforcement

### Security Tests
- [ ] Authentication tests
- [ ] Authorization tests (all roles)
- [ ] JWT expiration
- [ ] Refresh token flow
- [ ] RBAC enforcement
- [ ] Tenant isolation enforcement

### Performance Baseline
- [ ] Token join latency (< 100ms target)
- [ ] CALL NEXT latency (< 50ms target)
- [ ] Concurrent load test (100 req/sec)
- [ ] Database query performance

### JaCoCo Coverage Report
- [ ] Configure JaCoCo Maven plugin
- [ ] Generate coverage report
- [ ] Verify 80% minimum coverage
- [ ] Review uncovered critical paths

**✅ Phase 7 Complete When:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All security tests pass
- [ ] **Concurrent tests pass 100+ times** ⚠️
- [ ] Code coverage >= 80%
- [ ] Performance benchmarks met

---

## PHASE 8: DOCUMENTATION (Week 8) — ARCHITECTURE COMPLETE ✅

### API Documentation
- [ ] Add Springdoc OpenAPI dependency
- [ ] Configure Swagger UI
- [ ] Add API annotations to controllers
- [ ] Generate OpenAPI spec
- [ ] Test Swagger UI (`/swagger-ui.html`)

### Database Documentation
- [x] DATABASE.md (complete)
- [ ] Generate ERD diagram (export from tool)
- [ ] Document data retention policies
- [ ] Document backup strategy

### Deployment Documentation
- [ ] Create `DEPLOYMENT.md`
- [ ] Document environment variables
- [ ] Document database setup steps
- [ ] Document build process (`./mvnw clean install`)
- [ ] Document run process (`./mvnw spring-boot:run`)
- [ ] Document Docker Compose setup (dev)
- [ ] Document production configuration

### Architecture Documentation
- [x] ARCHITECTURE.md (complete)
- [x] DECISIONS.md (complete)
- [x] BUSINESS_RULES.md (complete)
- [x] TESTING.md (complete)

### Changelog
- [ ] Create `CHANGELOG.md`
- [ ] Document Phase 0-7 implementations
- [ ] Document breaking changes
- [ ] Document bug fixes

### Backend README
- [ ] Update `backend/README.md` with:
  - [ ] Quick start guide
  - [ ] Technology stack
  - [ ] Project structure
  - [ ] Running locally
  - [ ] Running tests
  - [ ] API endpoints overview
  - [ ] Environment configuration

**✅ Phase 8 Complete When:**
- [x] Architecture documents complete
- [ ] API documentation generated (Swagger)
- [ ] Database ERD created
- [ ] Deployment guide written
- [ ] README updated
- [ ] CHANGELOG created

---

## REMAINING WORK

### Not Yet Started
- Everything in Phases 0-7

### Critical Blockers
- None (architecture corrections complete)

### Known Issues
- None (no implementation started yet)

### Next Immediate Action
**START PHASE 0: FOUNDATION**

1. Create `backend/` directory
2. Initialize Maven project
3. Configure Spring Boot
4. Connect to PostgreSQL
5. Setup Flyway
6. Verify application starts

---

**Document Status:** READY FOR IMPLEMENTATION  
**Last Updated:** 2026-09-01  
**Architecture Version:** 1.1 (Corrected)
