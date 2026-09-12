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
