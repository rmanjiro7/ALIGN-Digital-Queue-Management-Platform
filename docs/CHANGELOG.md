# ALIGN BACKEND — CHANGELOG

**Format:** [Phase] — [Date] — [Summary]

---

## [Architecture] — 2026-09-01 — Architecture Documentation Complete

- Created `/docs/BACKEND_INSPECTION_REPORT.md` — full repository inspection
- Created `/docs/BACKEND_ARCHITECTURE_PLAN.md` — approved architecture plan
- Created `/docs/ARCHITECTURE_CORRECTIONS_SUMMARY.md` — correction summary
- Created `/docs/DATABASE.md` — complete PostgreSQL schema
- Created `/docs/DECISIONS.md` — ADR-001 through ADR-010
- Created `/docs/BUSINESS_RULES.md` — BR-001 through BR-013
- Created `/docs/TESTING.md` — test strategy with Testcontainers
- Created `/docs/TODO.md` — phase-by-phase implementation checklist

## [Inspection] — 2026-09-05 — MODE A Startup Inspection Complete

- Confirmed: Backend does not exist (0 Java files, no pom.xml, no backend/ directory)
- Confirmed: Frontend is complete React 19/TypeScript PWA with mock store
- Confirmed: All existing architecture docs align with master prompt ADRs
- Created `/docs/CONTEXT.md` — project context summary
- Created `/docs/REQUIREMENTS.md` — REQ-001 through REQ-037
- Created `/docs/ARCHITECTURE.md` — architecture reference
- Created `/docs/API_CONTRACT.md` — planned API specification
- Created `/docs/SECURITY.md` — security architecture
- Created `/docs/ERROR_HANDLING.md` — error codes and handling strategy
- Created `/docs/VALIDATION.md` — input validation rules
- Created `/docs/DEPLOYMENT.md` — deployment guide (planned)
- Identified minor terminology note: frontend uses `SKIPPED` state, backend spec uses `NO_SHOW` for skip operations

---

## [Phase 1] — 2026-09-07 — Security Complete ✅

**All 30 tests passed. BUILD SUCCESS.**

### Phase 1 Implementation
- `backend/src/main/java/com/align/qms/security/SecurityConfig.java` — Spring Security filter chain: CSRF disabled, HTTP Basic disabled, session stateless, deny-by-default authorization, CORS, BCrypt strength 12, `@EnableMethodSecurity`
- `backend/src/main/java/com/align/qms/security/JwtService.java` — HS512 JWT generation and validation (jjwt 0.12.6): access token generation, signature validation, expiry check, claim extraction (userId, orgId, role, locationId)
- `backend/src/main/java/com/align/qms/security/JwtAuthenticationFilter.java` — per-request JWT filter: extracts Bearer token, loads UserDetails by UUID, validates token + account status, sets SecurityContext
- `backend/src/main/java/com/align/qms/security/UserPrincipal.java` — Spring Security UserDetails adapter with orgId, role, locationId
- `backend/src/main/java/com/align/qms/security/UserDetailsServiceImpl.java` — loads UserDetails by email (login) and by UUID (filter)
- `backend/src/main/java/com/align/qms/security/TenantContext.java` — reads orgId/role from SecurityContext; `requireSameTenant()` enforces tenant isolation
- `backend/src/main/java/com/align/qms/security/AuthEntryPoint.java` — 401 handler: returns standard ErrorResponse JSON
- `backend/src/main/java/com/align/qms/security/AccessDeniedHandlerImpl.java` — 403 handler: returns standard ErrorResponse JSON
- `backend/src/main/java/com/align/qms/user/User.java` — User JPA entity (id, orgId, email, passwordHash, name, role, status, locationId, assignedCounterNumber)
- `backend/src/main/java/com/align/qms/user/UserRepository.java` — Spring Data JPA: findByEmail, findActiveByEmail, findByOrgId, findByOrgIdAndRole, findByOrgIdAndStatus
- `backend/src/main/java/com/align/qms/user/UserRole.java` — enum: STAFF, ORG_ADMIN, PLATFORM_ADMIN
- `backend/src/main/java/com/align/qms/user/UserStatus.java` — enum: ACTIVE, INACTIVE
- `backend/src/main/java/com/align/qms/auth/AuthController.java` — POST /login, POST /refresh, POST /logout, GET /me
- `backend/src/main/java/com/align/qms/auth/AuthService.java` — login (BCrypt verify, JWT issue, no account enumeration), refresh (rotation), logout (revoke all), getCurrentUser (from SecurityContext)
- `backend/src/main/java/com/align/qms/auth/RefreshToken.java` — refresh token JPA entity (SHA-256 hash stored, never plaintext)
- `backend/src/main/java/com/align/qms/auth/RefreshTokenRepository.java` — findByTokenHash, deleteAllByUserId, deleteAllExpiredBefore
- `backend/src/main/java/com/align/qms/auth/RefreshTokenService.java` — create (generate + hash + persist), validateAndRotate (lookup hash, delete old, return user), revokeAllForUser, scheduled cleanup
- `backend/src/main/java/com/align/qms/auth/LoginRequest.java` — @NotBlank email + password with size constraints
- `backend/src/main/java/com/align/qms/auth/LoginResponse.java` — accessToken, refreshToken, expiresIn, UserResponse
- `backend/src/main/java/com/align/qms/auth/RefreshTokenRequest.java` — @NotBlank refreshToken
- `backend/src/main/java/com/align/qms/auth/RefreshResponse.java` — accessToken, expiresIn
- `backend/src/main/java/com/align/qms/auth/UserResponse.java` — id, name, email, role, orgId, locationId (never passwordHash)
- `backend/src/main/java/com/align/qms/exception/InvalidCredentialsException.java` — 401 INVALID_CREDENTIALS
- `backend/src/main/java/com/align/qms/exception/DisabledUserException.java` — 401 ACCOUNT_DISABLED
- `backend/src/main/java/com/align/qms/exception/UnauthorizedTenantAccessException.java` — 403 TENANT_ACCESS_DENIED
- `backend/src/main/resources/db/migration/V2__security.sql` — organizations stub + users table + refresh_tokens table + constraints + indexes
- `backend/src/main/resources/application.yml` — align.jwt.*, align.cors.* config added; JPA ddl-auto: validate; actuator health show-details: when-authorized

### Phase 1 Fixes (2026-09-07 validation session)
- `backend/src/test/java/com/align/qms/PostgresIntegrationTest.java` — **FIXED**: replaced `@Testcontainers` + `@Container` + `withReuse(true)` with deterministic static initializer. Root cause: the `@Testcontainers` extension stops static containers after each class; `withReuse(true)` requires `testcontainers.reuse.enable=true` in `~/.testcontainers.properties` to suppress this. The static initializer starts the container once for the JVM process and Testcontainers' shutdown hook cleans it up. No external configuration file required.
- `backend/src/main/java/com/align/qms/auth/UserResponse.java` — **FIXED**: added `protected UserResponse()` no-arg constructor required by Jackson for `TestRestTemplate` deserialization of `LoginResponse["user"]`
- `backend/src/main/java/com/align/qms/auth/LoginResponse.java` — **FIXED**: added `protected LoginResponse()` no-arg constructor for Jackson deserialization
- `backend/src/main/java/com/align/qms/auth/RefreshResponse.java` — **FIXED**: added `protected RefreshResponse()` no-arg constructor for Jackson deserialization
- `backend/src/main/java/com/align/qms/security/SecurityConfig.java` — **FIXED**: added `.httpBasic(AbstractHttpConfigurer::disable)`. Without this, Spring Security's default `BasicAuthenticationEntryPoint` emits `WWW-Authenticate: Basic` on 401, which causes JDK `HttpURLConnection` to throw `HttpRetryException` on POST requests in streaming mode.
- `backend/pom.xml` — **ADDED**: `org.apache.httpcomponents.client5:httpclient5` (test scope). When present, Spring Boot's `TestRestTemplate` auto-configuration uses `HttpComponentsClientHttpRequestFactory` (Apache HttpClient 5) instead of JDK `HttpURLConnection`, which handles 401 responses on POST requests correctly.
- `backend/src/test/java/com/align/qms/security/SecurityIntegrationTest.java` — **FIXED**: `test2` assertion `doesNotContain("email")` was too broad — the legitimate error message `"Invalid email or password"` contains the word "email". Replaced with `doesNotContain(STAFF_EMAIL)` (the actual submitted address) to correctly enforce no-account-enumeration without false-failing on the generic error message text.

### Phase 1 Validation Result
- `.\mvnw.cmd clean test` → **BUILD SUCCESS**
- Tests run: 30, Failures: 0, Errors: 0, Skipped: 0
- AlignApplicationTest: 4/4 PASS
- SecurityIntegrationTest: 26/26 PASS
- PostgreSQL: 15.19-alpine (Testcontainers 1.21.4, Docker 29.7.2)
- Flyway: V1 + V2 executed successfully on fresh container



**Backend directory created. Compilation verified: BUILD SUCCESS. All tests passed.**

### Files Created (previous agent session)
- `backend/pom.xml` — Spring Boot 3.2.5, Java 17, Phase 0 dependency boundary enforced
- `backend/.mvn/wrapper/` — Maven Wrapper (mvnw.cmd + maven-wrapper.jar + properties)
- `backend/.env.example` — environment variable template
- `backend/.gitignore` — backend-specific gitignore
- `backend/src/main/java/com/align/qms/AlignApplication.java` — main entry point
- `backend/src/main/java/com/align/qms/exception/AlignException.java` — base domain exception
- `backend/src/main/java/com/align/qms/exception/BusinessException.java` — business rule violation
- `backend/src/main/java/com/align/qms/exception/ResourceNotFoundException.java` — 404 exception
- `backend/src/main/java/com/align/qms/exception/GlobalExceptionHandler.java` — centralized handler
- `backend/src/main/java/com/align/qms/dto/response/ErrorResponse.java` — standard error payload
- `backend/src/main/resources/application.yml` — base configuration (datasource, flyway, actuator)
- `backend/src/main/resources/application-dev.yml` — development profile
- `backend/src/main/resources/application-prod.yml` — production profile
- `backend/src/main/resources/logback-spring.xml` — structured logging (console + file)
- `backend/src/main/resources/db/migration/V1__foundation.sql` — Phase 0 baseline migration
- `backend/src/test/java/com/align/qms/PostgresIntegrationTest.java` — Testcontainers base class
- `backend/src/test/java/com/align/qms/AlignApplicationTest.java` — Phase 0 integration tests (4 tests)
- `backend/src/test/resources/application-test.yml` — test profile

### Phase 0 Dependency/Config Cleanup (this session — 2026-09-06)
- Removed `spring.jpa.*` block from `application-dev.yml` (JPA absent in Phase 0)
- Removed `org.hibernate.SQL` and `org.hibernate.orm.jdbc.bind` log entries from `application-dev.yml`
- Removed `spring.jpa.*` block from `application-prod.yml`
- Removed `org.hibernate.SQL` log entry from `application-prod.yml`
- Removed `spring.jpa.*` block (ddl-auto, show-sql, hibernate.format_sql) from `application-test.yml`
- All three profile YAML files now contain no JPA/Hibernate configuration
- Explanatory comments added to each profile documenting intentional absence
- `application.yml` was already clean (no JPA config) — no change needed
- `pom.xml` was already clean (no JPA, Security, JWT, WebSocket, Lombok) — no change needed

### Phase 0 Final Validation Cleanup (2026-09-06)
- Removed stale Hibernate/JPA logger entries from `logback-spring.xml`:
  - `org.hibernate.SQL` (WARN level)
  - `org.hibernate.orm.jdbc.bind` (WARN level)
- Fixed logback warnings about nested `<springProfile>` elements:
  - Restructured root logger and package-level loggers to avoid nesting inside appenders
  - Moved `<springProfile>` to top level with separate root/logger definitions per profile
  - Eliminated invalid nesting that caused Logback warnings during test execution
- Logging configuration now produces clean output with no warnings

### Compilation Result
- `mvnw.cmd clean compile` → **BUILD SUCCESS** (4.2s, 6 source files, Java 17)

### Test Results
- Tests run against Testcontainers PostgreSQL 15-alpine container
- Docker Server: 29.7.2
- Testcontainers: 1.21.4
- **4 tests PASSED, 0 failures, 0 errors**
- Tests executed:
  1. `AlignApplicationTest.contextLoads()` — Application context loads successfully
  2. `AlignApplicationTest.actuatorHealth_returnsUp()` — GET /actuator/health returns HTTP 200 with status UP
  3. `AlignApplicationTest.actuatorInfo_returns200()` — GET /actuator/info returns HTTP 200
  4. `AlignApplicationTest.unknownEndpoint_returns404()` — Unknown endpoints return HTTP 404
- PostgreSQL container started successfully
- Flyway migration V1__foundation.sql executed successfully
- Database connectivity verified
- Health checks operational

### Phase 0 Status: ✅ COMPLETE

**All validation criteria met:**
- [x] Build passes
- [x] Tests pass (4/4)
- [x] Testcontainers works (PostgreSQL 15-alpine)
- [x] PostgreSQL works (container startup + connection verified)
- [x] Flyway runtime verified (V1__foundation.sql executed)
- [x] Application startup verified (@SpringBootTest context loads)
- [x] /actuator/health returns 200 with status UP
- [x] No critical configuration inconsistency remains
- [x] Stale Hibernate/JPA logging removed
- [x] Logback warnings fixed (nested springProfile elements)

**Phase 0 deliverables complete. Ready for Phase 1 (Security).**

---

## [Phase 2] — 2026-09-10 — Organization Domain Complete ✅

- Implemented JPA Entities & Repositories: `Organization`, `Location`, `Service`, `Queue`, `Counter`
- Enforced Flyway migration `V3__organization_domain.sql`
- Built full CRUD endpoints under `/api/v1/locations`, `/api/v1/services`, `/api/v1/queues`, `/api/v1/counters`
- Implemented tenant isolation in service layer via `TenantContext.requireSameTenant()`
- Passed all 70 tests in `OrganizationDomainIntegrationTest`

---

## [Phase 3] — 2026-09-15 — Token Engine Complete ✅

- Flyway migration `V4__token_engine.sql`: `tokens` and `token_events` tables
- Atomic per-queue token sequencing via `allocateNextTokenNumber`
- Token state machine: `WAITING`, `AWAY`, `CALLED`, `IN_SERVICE`, `COMPLETED`, `NO_SHOW`, `CANCELLED`, `EXPIRED`, `TRANSFERRED`
- Idempotency key handling via partial unique index
- Step-away 15-minute grace period with `@Scheduled` expiration job

---

## [Phase 4] — 2026-09-20 — Staff Operations Complete ✅

- Flyway migration `V5__staff_operations.sql` and `V10__counter_service_assignments.sql`
- Concurrency-safe queue calling with `SELECT ... FOR UPDATE SKIP LOCKED`
- Counter availability tracking (`ONLINE`, `ON_BREAK`, `AWAY`, `OFFLINE`)
- Implemented `serve`, `complete`, `no-show`, `recall`, and `transfer` operations
- Counter service assignment filtering

---

## [Phase 5] — 2026-09-25 — Realtime WebSocket Engine Complete ✅

- WebSocket STOMP endpoint `/ws-align` with SockJS fallback
- Transaction-bound publishing using `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`
- Anonymized Public TV topics: `/topic/location/{locationId}/public`
- Dedicated customer tracking topics: `/topic/token/{tokenId}`
- Staff console updates: `/topic/location/{locationId}/staff`

---

## [Phase 6] — 2026-09-28 — Administration & Analytics Complete ✅

- Flyway migrations `V7__phase6_administration_analytics.sql` and `V8__phase6_analytics_indexes.sql`
- High-efficiency SQL aggregation for historical metrics (summary, queues, traffic, services, counters)
- Tenant audit events and counter availability history
- Global operational threshold rules (`V9__global_operational_rules.sql`)

---

## [Phase 7] — 2026-10-01 — Hardening & Multi-Tier Validation Complete ✅

- Flyway migrations `V13__phase7_notifications.sql`, `V14__structured_operating_hours.sql`, `V15__phase7_customer_sms_consent.sql`
- Structured location operating hours and timezone validation
- SMS consent capture on queue entry
- Bucket4j in-memory rate limiting filter for auth and public endpoints
- Extensive Testcontainers concurrency test suites (SkipLocked, Capacity, CallNext)

---

## [Phase 8] — 2026-10-04 — MVP Gaps & E2E Validation Complete ✅

- Flyway migration `V16__phase8_mvp_gaps.sql`: Journeys, preparation requirements, announcement templates
- Public TV speech synthesis chime and custom broadcast messaging
- Puppeteer automated end-to-end regression suites (`phase-8.cjs`, `phase-6-7-transfer.cjs`)
- All 217 backend tests passing with Testcontainers

---

## [MVP Stabilization & Launcher] — 2026-10-13 — Full Platform Operational ✅

- Created single-command orchestration scripts: [`start.ps1`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/start.ps1), [`start.ps`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/start.ps), [`start.bat`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/start.bat)
- Resolved frontend `Screen04JoinConfirm.tsx` crash with optional chaining and defensive normalization in `store.ts`
- Wrapped UI hierarchy in global `ErrorBoundary.tsx`
- Aligned `callNextToken` route to `/api/v1/staff/counters/{counterId}/call-next`
- Added SVG favicon and eliminated 404 console errors
- Implemented automatic demo role authentication in `TopBar.tsx` and `Screen08Login.tsx`
- Automated multi-role whitebox verification passed with 0 errors across all 9 screens and full token lifecycle

