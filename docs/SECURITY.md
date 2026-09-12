# ALIGN BACKEND — SECURITY

**Version:** 1.1
**Last Updated:** 2026-09-07
**Status:** IMPLEMENTED AND VALIDATED — Phase 1 COMPLETE ✅

---

## Authentication Architecture

### JWT Strategy

**Algorithm:** HS512 (symmetric) — upgrade to RS256 if multi-service deployment occurs
**Access token TTL:** 15 minutes
**Refresh token TTL:** 7 days
**Library:** `io.jsonwebtoken:jjwt` (0.12.x)

**JWT Claims (access token):**
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

**CRITICAL:** `orgId` and `role` in JWT are TRUSTED only after signature validation.
The backend NEVER trusts client-supplied `orgId`, `role`, `locationId`, or `userId` in request bodies for authorization decisions.

---

## Password Security

- **Algorithm:** BCrypt
- **Strength:** 12 rounds
- **Storage:** `users.password_hash` column — hash only, never plaintext
- **API responses:** `password_hash` MUST NEVER appear in any response DTO
- **Logging:** Passwords MUST NEVER be logged

---

## Spring Security Configuration

- CSRF: Disabled (stateless JWT API)
- Session: Stateless (`SessionCreationPolicy.STATELESS`)
- Public endpoints: `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/actuator/health`, `/ws-align/**`, discovery/service listing
- All other endpoints: require valid JWT
- CORS: Configured for known frontend origins only

---

## RBAC Enforcement

Every protected endpoint annotated with `@PreAuthorize`.

| Role | Capabilities |
|------|-------------|
| `STAFF` | Counter operations, queue view, counter availability |
| `ORG_ADMIN` | All STAFF ops + location/service/queue/staff management within own org |
| `PLATFORM_ADMIN` | Read-only cross-tenant + tenant creation; NO operational actions |
| No role | Token join, token status lookup (anonymous customer flows) |

**Rule:** `authenticated == NOT authorized`. Role and tenant ownership are checked independently.

---

## Tenant Isolation

- Every org-scoped API call verifies `resource.orgId == UserPrincipal.orgId`
- `PLATFORM_ADMIN` may read across orgs but cannot mutate org operational data
- Never trust `orgId` from request body or path param without verification
- Service layer validates ownership BEFORE any mutation

---

## Secrets Management

| Secret | Storage | Never... |
|--------|---------|---------|
| `JWT_SECRET` | Environment variable | Commit to git, log, expose in response |
| `DB_PASSWORD` | Environment variable | Commit to git, log |
| `DB_USERNAME` | Environment variable | Commit to git |

`.env` files are in `.gitignore`.
`.env.example` contains placeholder values only, no real secrets.

---

## Transport Security

- **Development:** HTTP acceptable
- **Production:** HTTPS required; enforce TLS at reverse proxy (Nginx/load balancer)
- WebSocket: `ws://` in development, `wss://` in production

---

## Input Security

- All request DTOs validated via Jakarta Bean Validation before service layer
- Enum fields: reject unrecognized values at deserialization (Jackson `DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES` appropriate setting)
- UUID path parameters: validated as valid UUID format
- SQL injection: prevented by JPA parameterized queries and JDBC `PreparedStatement`
- Error responses: NEVER expose stack traces, SQL errors, internal class names, or secret values

---

## Sensitive Data Handling

**Never expose in API responses:**
- `password_hash`
- JWT tokens (access or refresh) beyond the login/refresh endpoints
- Database credentials
- Internal stack traces
- SQL error messages

**Never log:**
- Passwords (plaintext or hash)
- JWT token values
- Refresh token values
- Customer phone numbers in debug logs

---

## Security Event Logging

Log these events at INFO or WARN level with structured context:
- Failed login attempt (email, IP, timestamp — not password)
- JWT validation failure (reason, IP)
- Unauthorized tenant access attempt (user orgId, requested resource orgId)
- Role authorization failure (user role, required role, endpoint)
- Suspicious patterns (rate limiting violations when implemented)

---

## Rate Limiting (Future Phase 7)

Planned, not yet implemented:
- `/api/v1/auth/login`: 10 requests/minute per IP
- `/api/v1/tokens/join`: 10 requests/minute per IP (anonymous)
- Authenticated endpoints: 1000 requests/minute per user

---

## Known Security Gaps (Pre-Implementation)

| Gap | Risk | Mitigation Plan |
|-----|------|-----------------|
| ~~No backend exists~~ | ~~ALL risks active~~ | ✅ Phase 0+1 complete |
| ~~Frontend auth is client-side simulation~~ | ~~Authentication bypass trivial~~ | ✅ Phase 1 JWT implemented |
| ~~No input validation server-side~~ | ~~Injection, invalid data~~ | ✅ Jakarta Bean Validation active |
| No rate limiting | Brute force, DDoS | Phase 7 hardening |

---

## Phase 1 Implementation Summary (Validated 2026-09-07)

| Component | Class | Status |
|-----------|-------|--------|
| Security filter chain | `SecurityConfig` | ✅ IMPLEMENTED |
| HTTP Basic disabled | `SecurityConfig.httpBasic(disable)` | ✅ IMPLEMENTED |
| CSRF disabled | `SecurityConfig.csrf(disable)` | ✅ IMPLEMENTED |
| BCrypt encoder (strength 12) | `SecurityConfig.passwordEncoder()` | ✅ IMPLEMENTED |
| JWT generation/validation | `JwtService` (HS512, jjwt 0.12.6) | ✅ IMPLEMENTED |
| JWT filter | `JwtAuthenticationFilter` | ✅ IMPLEMENTED |
| UserDetails adapter | `UserPrincipal` | ✅ IMPLEMENTED |
| UserDetailsService | `UserDetailsServiceImpl` | ✅ IMPLEMENTED |
| Tenant context | `TenantContext` | ✅ IMPLEMENTED |
| 401 entry point | `AuthEntryPoint` | ✅ IMPLEMENTED |
| 403 handler | `AccessDeniedHandlerImpl` | ✅ IMPLEMENTED |
| Login endpoint | `AuthController.login()` / `AuthService.login()` | ✅ IMPLEMENTED |
| Refresh endpoint | `AuthController.refresh()` / `AuthService.refresh()` | ✅ IMPLEMENTED |
| Logout endpoint | `AuthController.logout()` / `AuthService.logout()` | ✅ IMPLEMENTED |
| /me endpoint | `AuthController.me()` / `AuthService.getCurrentUser()` | ✅ IMPLEMENTED |
| Refresh token storage | `RefreshTokenService`, `RefreshTokenRepository` | ✅ IMPLEMENTED |
| DB schema | `V2__security.sql` (organizations stub, users, refresh_tokens) | ✅ MIGRATED |
| Integration tests | `SecurityIntegrationTest` (26 tests) | ✅ 26/26 PASS |

**Full test suite result:** Tests run: 30, Failures: 0, Errors: 0, Skipped: 0 — **BUILD SUCCESS**

---

**Last Updated:** 2026-09-07
**Next Review:** After Phase 2 (Organization Domain) implementation
