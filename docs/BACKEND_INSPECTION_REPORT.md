# ALIGN BACKEND — REPOSITORY INSPECTION REPORT
## Generated: 2026-09-01

---

## EXECUTIVE SUMMARY

**Current Status:** ALIGN is a **frontend-only** React/TypeScript PWA with NO backend implementation.

**Backend Requirement:** Build a Java/Spring Boot backend from scratch to replace mock/local state management.

**Workspace Root:** `d:\align\ALIGN-Digital-Queue-Management-Platform`

**Frontend Status:** ✅ **COMPLETE** — Production-ready React Router + TypeScript PWA with 16 implemented screens

**Backend Status:** ❌ **DOES NOT EXIST** — No Java, Spring Boot, or PostgreSQL infrastructure present

---

## 1. REPOSITORY STRUCTURE FINDINGS

### 1.1 Directory Layout

```
ALIGN-Digital-Queue-Management-Platform/
├── .git/                           ✅ Git repository active
├── .gitignore                      ✅ Excludes node_modules, dist, .env*
├── node_modules/                   React/TypeScript dependencies
├── dist/                           Vite build output
├── public/                         Static assets (icons, manifest.json, sw.js)
├── src/                            ⭐ Frontend source (TypeScript/React)
│   ├── App.tsx                     Router configuration + role-based navigation
│   ├── main.tsx                    Entry point
│   ├── index.css                   Tailwind styles
│   ├── registerServiceWorker.ts   PWA offline support
│   ├── components/                 React components by role
│   │   ├── customer/               Screens 01, 02, 03, 04, 05, 07
│   │   ├── staff/                  Screens 08, 09, 11
│   │   ├── admin/                  Screens 12, 13, 14
│   │   ├── platform/               Screens 15, 16
│   │   ├── public/                 Screen 22 (Public Display) + Landing
│   │   ├── common/                 NotFound, OfflineBanner
│   │   └── navigation/             TopBar, SideNav, ProtectedRoute
│   ├── services/                   
│   │   └── store.ts                ⚠️ LOCAL STATE SIMULATION (must be replaced by backend)
│   └── types/
│       └── index.ts                ⭐ TypeScript type definitions (critical for DTOs)
├── package.json                    React + Vite + Tailwind dependencies
├── tsconfig.json                   TypeScript configuration
├── vite.config.ts                  Vite build config
├── index.html                      SPA entry HTML
├── .env.example                    Environment template (GEMINI_API_KEY, APP_URL)
├── README.md                       UI Reference & Screen documentation
├── ALIGN-Codebase-Audit.docx       ⚠️ Possible PRD/requirements
├── ALIGN-UI-REFERENCE-PACKAGE/     Screenshot reference catalog
└── metadata.json                   AI Studio deployment metadata
```

### 1.2 Backend Infrastructure Status

| Component | Status | Finding |
|-----------|--------|---------|
| `backend/` directory | ❌ **DOES NOT EXIST** | Must be created |
| `pom.xml` | ❌ **NOT FOUND** | No Maven project |
| Spring Boot | ❌ **NOT PRESENT** | No Java infrastructure |
| PostgreSQL | ❌ **NOT CONFIGURED** | No database connection |
| REST APIs | ❌ **NOT IMPLEMENTED** | Frontend uses mock store |
| WebSocket/STOMP | ❌ **NOT IMPLEMENTED** | No realtime infrastructure |
| JWT Auth | ❌ **NOT IMPLEMENTED** | Frontend role-switching is simulated |
| Flyway migrations | ❌ **NOT PRESENT** | No migration system |
| Java source files | ❌ **NONE FOUND** | Zero `.java` files in repository |

**Conclusion:** Backend must be built from **ground zero**.

---

## 2. FRONTEND ANALYSIS

### 2.1 Implemented Screens (16 Total)

| Screen | Route | Role | Implementation | Backend Dependency |
|--------|-------|------|----------------|-------------------|
| **Landing Page** | `/` | Public | ✅ Complete | Low |
| **01 - Splash** | `/splash` | Customer | ✅ Complete | None |
| **02 - Discovery** | `/discover` | Customer | ✅ Complete | **HIGH** (org/location listing) |
| **03 - Services** | `/discover/services` | Customer | ✅ Complete | **HIGH** (service availability, wait times) |
| **04 - Join Confirm** | `/discover/join` | Customer | ✅ Complete | **CRITICAL** (token generation) |
| **05 - Active Status** | `/status`, `/status/:tokenId` | Customer | ✅ Complete | **CRITICAL** (token lookup, realtime updates) |
| **07 - History** | `/history` | Customer | ✅ Complete | **MEDIUM** (token history retrieval) |
| **08 - Staff Login** | `/login` | Staff | ✅ Complete | **CRITICAL** (JWT authentication) |
| **09 - Operations** | `/staff/queue` | Staff | ✅ Complete | **CRITICAL** (CALL NEXT, counter operations) |
| **11 - Announcements** | `/staff/announcements` | Staff | ✅ Complete | **MEDIUM** (announcement history) |
| **12 - Org Dashboard** | `/admin/dashboard` | Org Admin | ✅ Complete | **MEDIUM** (analytics aggregation) |
| **13 - Location Mgmt** | `/admin/locations` | Org Admin | ✅ Complete | **HIGH** (location CRUD) |
| **14 - Service Config** | `/admin/services` | Org Admin | ✅ Complete | **HIGH** (service/queue config) |
| **15 - Platform Dashboard** | `/platform/dashboard` | Platform Admin | ✅ Complete | **MEDIUM** (platform-level analytics) |
| **16 - Tenant Mgmt** | `/platform/tenants` | Platform Admin | ✅ Complete | **HIGH** (tenant CRUD, onboarding) |
| **22 - Public Display** | `/display/:locationId` | Public | ✅ Complete | **CRITICAL** (realtime queue display) |

### 2.2 Frontend Technology Stack

- **Framework:** React 19.0.1
- **Router:** React Router DOM 7.18.3
- **Language:** TypeScript 5.8.2
- **Build Tool:** Vite 6.2.3
- **Styling:** Tailwind CSS 4.1.14
- **Icons:** Lucide React 0.546.0
- **PWA:** Service Worker (sw.js), manifest.json
- **State Management:** Custom store (localStorage + observer pattern)
- **Offline Support:** ✅ Implemented (OfflineBanner component)

### 2.3 Frontend Route Protection

```typescript
// src/components/navigation/ProtectedRoute.tsx
<ProtectedRoute appState={appState} allowedRoles={['STAFF', 'ORG_ADMIN']}>
  <Screen09Operations />
</ProtectedRoute>
```

**⚠️ CRITICAL SECURITY ISSUE:**
- Frontend `ProtectedRoute` is **NOT a security boundary**
- Role switching via `queueStore.setRole()` is client-side only
- **Backend MUST enforce all authorization**

---

## 3. DATA MODEL ANALYSIS

### 3.1 Current Frontend Types (`src/types/index.ts`)

#### Core Entities

```typescript
// User Roles
type UserRole = 'CUSTOMER' | 'STAFF' | 'ORG_ADMIN' | 'PLATFORM_ADMIN' | 'PUBLIC_DISPLAY';

// Token Lifecycle States
type TokenState = 'WAITING' | 'AWAY' | 'CALLED' | 'IN_SERVICE' | 
                  'COMPLETED' | 'NO_SHOW' | 'SKIPPED' | 'CANCELLED' | 'EXPIRED';

// Counter Availability
type CounterAvailability = 'ONLINE' | 'ON_BREAK' | 'AWAY' | 'OFFLINE';
type CounterQueueState = 'READY' | 'SERVING';
```

#### Domain Models (Frontend)

| Entity | Key Fields | Backend Entity Mapping |
|--------|-----------|----------------------|
| **Tenant** | `id, code, name, sector, status, locationCount, activeQueueCount, contactEmail, joinedDate` | ✅ Organization/Tenant |
| **LocationBranch** | `id, orgId, name, address, city, status, activeServicesCount, staffAssignedCount, operatingHours, isHQ` | ✅ Location |
| **ServiceItem** | `id, orgId, locationId, name, description, enabled, isFastTrack, waitingCount, estWaitMins, preparationGuidance` | ✅ Service |
| **QueueItem** | `id, orgId, locationId, serviceId, tokenPrefix, startRange, endRange, status, currentCount, maxCapacity, avgWaitMins` | ✅ Queue |
| **QueueToken** | `id, orgId, locationId, serviceId, queueId, tokenNumber, state, counterId, customerName, customerPhone, joinedAt, calledAt, completedAt, peopleAhead, estWaitMins, leaveGraceExpiresAt` | ✅ Token (PRIMARY DOMAIN MODEL) |
| **CounterItem** | `id, orgId, locationId, number, name, status, availability, currentServingTokenId, assignedStaffId, serviceStartTime` | ✅ Counter |
| **StaffUser** | `id, orgId, locationId, name, email, role, assignedCounterNumber, status` | ✅ User (with Staff role) |
| **AnnouncementItem** | `id, orgId, locationId, tokenNumber, counterNumber, text, status, timestamp, serviceName` | ✅ Announcement (audit/history) |
| **GlobalOrgRules** | `autoPauseAtCapacity, capacityThresholdPercent, maxWaitThresholdMins` | ✅ QueueConfiguration |
| **SystemAlert** | `id, title, description, severity, timestamp` | ✅ SystemAlert (platform monitoring) |
| **AuditLogEntry** | `id, orgId, actor, action, aggregateId, beforeState, afterState, timestamp, details` | ✅ AuditLog |

### 3.2 Critical Business Logic (Currently in store.ts)

#### Token Generation (Lines 862-930)
```typescript
// ⚠️ UNSAFE IMPLEMENTATION — uses max(tokenNumber) + 1
const maxSeq = /* computed from existing tokens in memory */
const nextSeq = maxSeq + 1;
const tokenNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`;
```
**Problem:** NOT ATOMIC. Concurrent requests will generate duplicate token numbers.

**Solution Required:** PostgreSQL sequence/serial, `SELECT FOR UPDATE`, or optimistic locking.

#### CALL NEXT Operation (Lines 923-1033)
```typescript
// Currently uses FIFO in-memory array filter
const eligibleToken = this.state.tokens.find(
  t => t.orgId === orgId && t.locationId === locationId && t.state === 'WAITING'
);
```
**Problem:** NOT CONCURRENCY-SAFE. Two staff operators calling simultaneously can get the same token.

**Solution Required:** Database transaction with `SELECT FOR UPDATE` or conditional update.

#### Step Away Grace Window (Lines 1261-1282)
```typescript
if (isLeaving) {
  token.state = 'AWAY';
  token.leaveGraceExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
}
```
**Current:** Client-controlled timestamp (unsafe).

**Required:** Server-authoritative timestamp. Client countdown is display-only.

#### Wait Time Calculation (Lines 880-882)
```typescript
const estWaitMins = Math.max(2, peopleAhead * 3 + (service.isFastTrack ? 1 : 4));
```
**Current:** Simple formula `peopleAhead × 3 + constant`.

**Required:** Backend deterministic calculation based on:
- Active counters
- Recent service duration
- Queue throughput
- Time of day patterns (optional)

---

## 4. AUTHENTICATION & AUTHORIZATION ANALYSIS

### 4.1 Current Frontend Auth (Screen08Login.tsx)

```typescript
// ⚠️ DEMO-ONLY AUTHENTICATION
const handleLogin = () => {
  queueStore.setRole('STAFF');  // No credential validation!
  queueStore.setScreen('SCREEN_09_STAFF_OPERATIONS');
};

const handleQuickDemoLogin = (role: UserRole) => {
  queueStore.setRole(role);  // Direct role switch — no auth
};
```

**Findings:**
- ❌ No password validation
- ❌ No API call to backend
- ❌ No JWT token generation
- ❌ No session management
- ❌ No logout functionality
- ✅ Demo credentials pre-filled: `admin@organization.com`

**Hardcoded Staff Users:**
```typescript
{
  id: 'staff-admin',
  orgId: 'org-abc',
  locationId: 'loc-main',
  name: 'Alex Mercer',
  email: 'admin@organization.com',
  role: 'STAFF',
  assignedCounterNumber: 3,
}
```

### 4.2 Required Backend Authentication

**Phase 1 - MVP Auth:**
1. `POST /api/v1/auth/login` → JWT access token + refresh token
2. `POST /api/v1/auth/refresh` → New access token
3. `GET /api/v1/auth/me` → Current user profile
4. Spring Security + BCrypt password hashing
5. JWT with 15min access token, 7-day refresh token
6. HTTP-only cookies (optional) or Bearer token

**Phase 2 - Enhanced (Future):**
- Password reset flow
- Multi-factor authentication
- Session revocation
- Login audit trail

### 4.3 Authorization Requirements

| Role | Permitted Actions |
|------|-------------------|
| **CUSTOMER** | - Join queue<br>- View own token<br>- Cancel own token<br>- Step away/return<br>- View history (own) |
| **STAFF** | - Access assigned location/counter only<br>- View queue for assigned location<br>- CALL NEXT<br>- Recall<br>- Complete service<br>- Skip/No-show<br>- Change counter availability |
| **ORG_ADMIN** | - Manage own organization resources<br>- CRUD locations<br>- CRUD services<br>- Configure queues<br>- Manage staff<br>- Assign counters<br>- View organization analytics<br>**❌ CANNOT access other organizations** |
| **PLATFORM_ADMIN** | - View all tenants<br>- Create tenants<br>- View platform-level metrics<br>- Access system alerts<br>**❌ CANNOT modify organization operations** |
| **PUBLIC_DISPLAY** | - View current called token (location-specific)<br>- View upcoming queue<br>**❌ NO write access**<br>**❌ NO customer PII** |

---

## 5. CONCURRENCY & RACE CONDITION ANALYSIS

### 5.1 Critical Race Conditions Identified

#### ⚠️ RACE #1: Token Number Generation
**Scenario:**
```
Time T0: Customer A requests token → reads max=A-042
Time T1: Customer B requests token → reads max=A-042 (same)
Time T2: Customer A assigned → A-043
Time T3: Customer B assigned → A-043 ❌ DUPLICATE
```

**Impact:** **CRITICAL** — Violates uniqueness constraint, causes operational chaos.

**Solution:** PostgreSQL sequence or `nextval()` + UNIQUE constraint on `(queueId, tokenNumber)`.

#### ⚠️ RACE #2: CALL NEXT
**Scenario:**
```
Time T0: Staff Operator 1 (Counter 3) calls CALL NEXT
Time T1: Staff Operator 2 (Counter 5) calls CALL NEXT simultaneously
Time T2: Both retrieve Token A-042 (first WAITING token)
Time T3: Both assign A-042 to their counter ❌ DUPLICATE ASSIGNMENT
```

**Impact:** **CRITICAL** — Same customer called to two counters, queue integrity lost.

**Solution:** 
```sql
UPDATE tokens 
SET state = 'CALLED', counter_id = ?, called_at = NOW()
WHERE id = (
  SELECT id FROM tokens 
  WHERE queue_id = ? AND state = 'WAITING'
  ORDER BY joined_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED  -- PostgreSQL concurrent-safe
)
RETURNING *;
```

#### ⚠️ RACE #3: Queue Capacity Check
**Scenario:**
```
Capacity = 50, Current = 49
Time T0: Customer A checks → 49/50 ✓ allowed
Time T1: Customer B checks → 49/50 ✓ allowed
Time T2: Customer A joins → 50/50
Time T3: Customer B joins → 51/50 ❌ OVERFLOW
```

**Impact:** **MEDIUM** — Queue exceeds configured capacity.

**Solution:** Database-level CHECK constraint + atomic increment with validation.

### 5.2 Required Concurrency Tests

**Mandatory Integration Tests:**

1. **Test_ConcurrentTokenIssuance**
   - Simulate 100 concurrent `POST /api/v1/tokens/join` requests
   - Verify: Zero duplicate token numbers
   - Verify: Correct sequence (A-043, A-044, ..., A-142)

2. **Test_ConcurrentCallNext**
   - Simulate 10 staff operators calling CALL NEXT simultaneously
   - Verify: Each token assigned to exactly one counter
   - Verify: No token assigned twice

3. **Test_QueueCapacityEnforcement**
   - Set queue capacity = 10
   - Simulate 20 concurrent join requests
   - Verify: Exactly 10 succeed, 10 fail with `QUEUE_FULL`

---

## 6. REALTIME / WEBSOCKET REQUIREMENTS

### 6.1 Current Frontend Expectations

Frontend **DOES NOT** currently implement WebSocket client — **must be added**.

### 6.2 Required WebSocket Architecture

**Protocol:** STOMP over WebSocket

**Endpoint:** `ws://localhost:8080/ws-align` (dev), `wss://align.example.com/ws-align` (prod)

**Topics:**

| Topic | Subscribers | Events Published |
|-------|------------|------------------|
| `/topic/tenant/{orgId}/location/{locId}/public` | Public Display, Customers | `TOKEN_CALLED`, `TOKEN_RECALLED`, `COUNTER_STATUS_CHANGED`, `QUEUE_PAUSED`, `QUEUE_RESUMED` |
| `/topic/tenant/{orgId}/location/{locId}/staff` | Staff, Org Admin | All above + `TOKEN_JOINED`, `TOKEN_CANCELLED`, `TOKEN_COMPLETED`, `TOKEN_SKIPPED` |
| `/topic/token/{tokenId}` | Token owner (Customer) | `TOKEN_STATE_CHANGED`, `POSITION_UPDATED`, `WAIT_TIME_UPDATED`, `STEP_AWAY_EXPIRING` |

**Event Format:**
```json
{
  "eventType": "TOKEN_CALLED",
  "timestamp": "2023-10-24T10:42:35.123Z",
  "orgId": "org-abc",
  "locationId": "loc-main",
  "data": {
    "tokenId": "550e8400-e29b-41d4-a716-446655440000",
    "tokenNumber": "A-042",
    "counterId": "counter-3",
    "counterNumber": 3
  }
}
```

**Critical Rules:**
1. Events MUST be published **AFTER** database transaction commits
2. Public topics MUST NOT contain customer PII (name, phone)
3. Token-specific topics require authorization (customer owns token OR staff/admin)

---

## 7. DATABASE SCHEMA REQUIREMENTS

### 7.1 Core Entities

#### Organization / Tenant
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED
    contact_email VARCHAR(255),
    joined_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Location
```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active', -- Active, Inactive
    operating_hours VARCHAR(100),
    is_hq BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_location_org FOREIGN KEY (org_id) REFERENCES organizations(id)
);
CREATE INDEX idx_locations_org ON locations(org_id);
```

#### User
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- STAFF, ORG_ADMIN, PLATFORM_ADMIN
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    assigned_counter_number INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
```

#### Service
```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    enabled BOOLEAN DEFAULT TRUE,
    is_fast_track BOOLEAN DEFAULT FALSE,
    preparation_guidance TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_services_location ON services(location_id);
```

#### Queue
```sql
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token_prefix VARCHAR(5) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, CLOSED
    max_capacity INT DEFAULT 100,
    auto_pause_at_capacity BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_queue_service UNIQUE(service_id)
);
CREATE INDEX idx_queues_location ON queues(location_id);
```

#### Token (MOST CRITICAL)
```sql
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    token_number VARCHAR(20) NOT NULL,
    state VARCHAR(20) NOT NULL, -- WAITING, AWAY, CALLED, IN_SERVICE, COMPLETED, NO_SHOW, CANCELLED, EXPIRED
    counter_id UUID REFERENCES counters(id) ON DELETE SET NULL,
    called_by_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    joined_at TIMESTAMP DEFAULT NOW(),
    called_at TIMESTAMP,
    served_at TIMESTAMP,
    completed_at TIMESTAMP,
    step_away_expires_at TIMESTAMP,
    idempotency_key VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_token_number_queue UNIQUE(queue_id, token_number),
    CONSTRAINT chk_token_state CHECK (state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'))
);
CREATE INDEX idx_tokens_queue_state ON tokens(queue_id, state);
CREATE INDEX idx_tokens_location_state ON tokens(location_id, state);
CREATE INDEX idx_tokens_customer_phone ON tokens(customer_phone);
CREATE INDEX idx_tokens_idempotency ON tokens(idempotency_key);
```

#### Counter
```sql
CREATE TABLE counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    number INT NOT NULL,
    name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, CLOSED
    availability VARCHAR(20) DEFAULT 'ONLINE', -- ONLINE, ON_BREAK, AWAY, OFFLINE
    assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    current_serving_token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
    service_start_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_counter_location_number UNIQUE(location_id, number)
);
CREATE INDEX idx_counters_location ON counters(location_id);
```

#### Audit Log
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(50),
    aggregate_id UUID,
    before_state VARCHAR(50),
    after_state VARCHAR(50),
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(created_at DESC);
```

### 7.2 Token Sequence Generation Strategy

**Decision:** Use PostgreSQL sequence per queue.

**Implementation:**
```sql
CREATE SEQUENCE queue_seq_q_triage START 43;

INSERT INTO tokens (token_number, ...)
VALUES (
    CONCAT((SELECT token_prefix FROM queues WHERE id = ?), '-', LPAD(nextval('queue_seq_q_triage')::TEXT, 3, '0')),
    ...
);
```

**Alternative:** Database function with `FOR UPDATE` lock on queue metadata table.

**To be documented in:** `/docs/DECISIONS.md`

---

## 8. API CONTRACT REQUIREMENTS

### 8.1 REST API Endpoints (Initial)

#### Authentication
```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

#### Tenants (Platform Admin)
```
GET    /api/v1/tenants
POST   /api/v1/tenants
GET    /api/v1/tenants/{orgId}
PUT    /api/v1/tenants/{orgId}
```

#### Locations
```
GET    /api/v1/tenants/{orgId}/locations
GET    /api/v1/locations/{locId}
POST   /api/v1/locations
PUT    /api/v1/locations/{locId}
DELETE /api/v1/locations/{locId}
```

#### Services
```
GET    /api/v1/locations/{locId}/services
GET    /api/v1/services/{serviceId}
POST   /api/v1/services
PUT    /api/v1/services/{serviceId}
PUT    /api/v1/services/{serviceId}/status
```

#### Queues
```
GET    /api/v1/locations/{locId}/queues
GET    /api/v1/queues/{queueId}
PUT    /api/v1/queues/{queueId}/status
PUT    /api/v1/queues/{queueId}/config
```

#### Tokens (CRITICAL)
```
POST   /api/v1/tokens/join
GET    /api/v1/tokens/{tokenId}
POST   /api/v1/tokens/{tokenId}/step-away
POST   /api/v1/tokens/{tokenId}/return
POST   /api/v1/tokens/{tokenId}/cancel
GET    /api/v1/tokens (history for current user)
```

#### Staff Operations
```
POST   /api/v1/staff/call-next
POST   /api/v1/staff/recall
POST   /api/v1/staff/complete
POST   /api/v1/staff/skip
GET    /api/v1/staff/queue  (current serving + waitlist)
```

#### Counters
```
GET    /api/v1/locations/{locId}/counters
PUT    /api/v1/counters/{counterId}/availability
```

#### Staff Management (Org Admin)
```
GET    /api/v1/organizations/{orgId}/staff
POST   /api/v1/staff
PUT    /api/v1/staff/{staffId}
POST   /api/v1/staff/{staffId}/assign-counter
PUT    /api/v1/staff/{staffId}/status
```

#### Analytics
```
GET    /api/v1/organizations/{orgId}/analytics/dashboard
GET    /api/v1/platform/analytics/dashboard
```

### 8.2 DTO Examples

#### TokenJoinRequest
```java
{
  "serviceId": "550e8400-e29b-41d4-a716-446655440000",
  "customerName": "John Doe", // optional
  "customerPhone": "+15551234567", // optional
  "idempotencyKey": "idem-1234567890" // required
}
```

#### TokenResponse
```java
{
  "tokenId": "550e8400-e29b-41d4-a716-446655440000",
  "tokenNumber": "A-043",
  "state": "WAITING",
  "queueId": "...",
  "serviceId": "...",
  "locationId": "...",
  "positionAhead": 2,
  "estimatedWaitMinutes": 12,
  "estimatedWaitRange": "10-15 min",
  "confidence": "HIGH",
  "joinedAt": "2023-10-24T10:42:00.000Z",
  "stepAwayExpiresAt": null
}
```

---

## 9. SECURITY REQUIREMENTS

### 9.1 Password Security
- ✅ BCrypt with strength 12
- ❌ NEVER store plaintext
- ❌ NEVER return password_hash in API responses

### 9.2 JWT Configuration
- Access Token: 15 minutes
- Refresh Token: 7 days
- Algorithm: RS256 (asymmetric) or HS512 (symmetric)
- Claims: `sub` (userId), `orgId`, `role`, `iat`, `exp`

### 9.3 CORS
```yaml
cors:
  allowed-origins:
    - http://localhost:3000
    - https://align.example.com
  allowed-methods: [GET, POST, PUT, DELETE, OPTIONS]
  allowed-headers: [Authorization, Content-Type]
  allow-credentials: true
```

### 9.4 Input Validation
- Customer name: Max 255 chars, alphanumeric + spaces
- Phone number: E.164 format validation (optional)
- Email: RFC 5322 validation
- UUIDs: Strict UUID v4 validation
- Enums: Reject invalid values

### 9.5 Rate Limiting (Future)
- Public endpoints: 100 req/min per IP
- Authenticated endpoints: 1000 req/min per user
- Token join: 10 req/min per customer

---

## 10. TESTING REQUIREMENTS

### 10.1 Mandatory Unit Tests
- Token generation (atomic sequence)
- Token state machine (valid/invalid transitions)
- Counter availability state machine
- Wait time calculation
- Step Away expiration logic
- Password hashing/validation

### 10.2 Mandatory Integration Tests
- **Test_ConcurrentTokenIssuance** (100 threads)
- **Test_ConcurrentCallNext** (10 staff operators)
- **Test_QueueCapacityEnforcement**
- **Test_StepAwayExpiration**
- **Test_TenantIsolation** (Org A cannot access Org B resources)
- **Test_RoleBasedAccess** (STAFF cannot create tenants)

### 10.3 Repository Tests
- CRUD operations for all entities
- Cascade deletes
- Unique constraint violations
- Foreign key integrity

### 10.4 Controller Tests
- Authentication (valid/invalid credentials)
- Authorization (role-based access)
- Input validation
- Error responses (400, 401, 403, 404, 409)

---

## 11. DOCUMENTATION REQUIREMENTS

Must create:
- `/docs/CONTEXT.md` — High-level system context
- `/docs/ARCHITECTURE.md` — Backend architecture decisions
- `/docs/API_CONTRACT.md` — REST API specification
- `/docs/DATABASE.md` — Schema + ERD
- `/docs/DECISIONS.md` — Architecture decision records (ADRs)
- `/docs/BUSINESS_RULES.md` — Explicit business rules (BR-001, BR-002, ...)
- `/docs/SECURITY.md` — Authentication, authorization, secrets management
- `/docs/TESTING.md` — Test strategy + coverage
- `/docs/DEPLOYMENT.md` — Environment setup, build, run
- `/docs/CHANGELOG.md` — Version history
- `/docs/TODO.md` — Remaining implementation tasks

---

## 12. AMBIGUITIES & DECISIONS REQUIRED

| # | Question | Impact | Recommended Decision |
|---|----------|--------|---------------------|
| **D-001** | Token numbering scope: per-queue or per-location? | Sequence generation | **Per-queue** (matches frontend `tokenPrefix`) |
| **D-002** | Can Platform Admin modify organization operations? | Authorization model | **NO** — read-only for org data |
| **D-003** | Can one staff operate multiple counters? | Counter assignment model | **NO** — 1:1 mapping |
| **D-004** | Can customer join multiple queues simultaneously? | Token business rules | **NO** — one active token per customer |
| **D-005** | What happens when Step Away expires? | Token state machine | **Auto-transition to EXPIRED** (batch job) |
| **D-006** | Can cancelled tokens be restored? | Token immutability | **NO** — terminal state |
| **D-007** | What if all counters are OFFLINE when CALL NEXT? | Edge case handling | **Fail with error "NO_AVAILABLE_COUNTERS"** |
| **D-008** | Can Org Admin delete locations with active tokens? | Data integrity | **NO** — block with error "LOCATION_HAS_ACTIVE_TOKENS"** |

**Action:** Document all decisions in `/docs/DECISIONS.md`.

---

## 13. RISK ASSESSMENT

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| **Duplicate token numbers** | 🔴 CRITICAL | HIGH (without DB sequences) | PostgreSQL sequences + UNIQUE constraint |
| **Duplicate CALL NEXT assignment** | 🔴 CRITICAL | HIGH (without locking) | `SELECT FOR UPDATE SKIP LOCKED` |
| **Tenant data leakage** | 🔴 CRITICAL | MEDIUM | Row-level security, authorization tests |
| **JWT secret exposure** | 🔴 CRITICAL | LOW | Environment variables, never commit |
| **Concurrent queue overflow** | 🟡 MEDIUM | MEDIUM | Atomic capacity check + increment |
| **Step Away never expires** | 🟡 MEDIUM | MEDIUM | Scheduled cleanup job (Quartz) |
| **WebSocket event before commit** | 🟡 MEDIUM | LOW | Use `@TransactionalEventListener` |
| **No database migration history** | 🟢 LOW | MEDIUM | Flyway from day 1 |

---

## 14. IMPLEMENTATION PHASES

### Phase 0: Foundation (Week 1)
- ✅ Backend directory structure
- ✅ Maven pom.xml
- ✅ Spring Boot 3.x initialization
- ✅ PostgreSQL configuration
- ✅ Flyway setup
- ✅ Environment variable management
- ✅ Exception handling framework
- ✅ Logging configuration
- ✅ Health endpoint

### Phase 1: Security (Week 1-2)
- ✅ User entity
- ✅ Password hashing (BCrypt)
- ✅ JWT generation/validation
- ✅ Refresh token
- ✅ Login endpoint
- ✅ /auth/me endpoint
- ✅ Spring Security configuration
- ✅ RBAC (Role-Based Access Control)
- ✅ Tenant isolation filters

### Phase 2: Organization Domain (Week 2-3)
- ✅ Organization/Tenant entity + CRUD
- ✅ Location entity + CRUD
- ✅ Service entity + CRUD
- ✅ Queue entity + configuration
- ✅ Counter entity + CRUD
- ✅ Tenant isolation validation
- ✅ Authorization tests

### Phase 3: Queue/Token Engine (Week 3-4) ⚠️ CRITICAL
- ✅ Token entity
- ✅ Atomic token generation (sequences)
- ✅ Token join endpoint
- ✅ Token lookup endpoint
- ✅ Position calculation
- ✅ Estimated wait time calculation
- ✅ Step Away (start/return)
- ✅ Token cancellation
- ✅ Token state machine validation
- ✅ Idempotency handling
- ✅ **Concurrency test: Token issuance**

### Phase 4: Staff Operations (Week 4-5) ⚠️ CRITICAL
- ✅ Counter authorization
- ✅ Counter availability management
- ✅ CALL NEXT endpoint (with locking)
- ✅ Recall endpoint
- ✅ Complete service endpoint
- ✅ Skip/No-show endpoint
- ✅ Staff queue view endpoint
- ✅ **Concurrency test: CALL NEXT**

### Phase 5: Realtime (Week 5-6)
- ✅ WebSocket configuration
- ✅ STOMP protocol setup
- ✅ Topic structure
- ✅ Event publishers (post-commit)
- ✅ Public display topic
- ✅ Staff topic
- ✅ Token-specific topic
- ✅ Frontend WebSocket client integration

### Phase 6: Admin & Analytics (Week 6-7)
- ✅ Organization Admin operations
- ✅ Staff management endpoints
- ✅ Staff assignment to counters
- ✅ Platform tenant management
- ✅ Dashboard analytics (org-level)
- ✅ Platform analytics
- ✅ Audit log retrieval

### Phase 7: Testing & Validation (Week 7-8)
- ✅ Complete unit test suite
- ✅ Integration test suite
- ✅ Concurrency stress tests
- ✅ Security penetration tests
- ✅ Performance baseline
- ✅ Load testing (JMeter/Gatling)

### Phase 8: Documentation & Deployment (Week 8)
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Database ERD
- ✅ Deployment guide
- ✅ Docker compose for local dev
- ✅ Production environment config
- ✅ Monitoring setup

---

## 15. FILES TO CREATE

### Backend Structure
```
backend/
├── pom.xml
├── src/main/
│   ├── java/com/align/qms/
│   │   ├── AlignApplication.java
│   │   ├── config/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── WebSocketConfig.java
│   │   │   ├── CorsConfig.java
│   │   │   └── FlywayConfig.java
│   │   ├── security/
│   │   │   ├── JwtTokenProvider.java
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   └── UserPrincipal.java
│   │   ├── controller/
│   │   │   ├── AuthController.java
│   │   │   ├── TenantController.java
│   │   │   ├── LocationController.java
│   │   │   ├── ServiceController.java
│   │   │   ├── QueueController.java
│   │   │   ├── TokenController.java
│   │   │   ├── StaffOperationsController.java
│   │   │   ├── CounterController.java
│   │   │   ├── StaffManagementController.java
│   │   │   └── AnalyticsController.java
│   │   ├── service/
│   │   │   ├── AuthService.java
│   │   │   ├── TenantService.java
│   │   │   ├── LocationService.java
│   │   │   ├── ServiceService.java
│   │   │   ├── QueueService.java
│   │   │   ├── TokenService.java
│   │   │   ├── StaffOperationsService.java
│   │   │   ├── CounterService.java
│   │   │   ├── WaitTimeCalculator.java
│   │   │   └── WebSocketEventPublisher.java
│   │   ├── repository/
│   │   │   ├── UserRepository.java
│   │   │   ├── OrganizationRepository.java
│   │   │   ├── LocationRepository.java
│   │   │   ├── ServiceRepository.java
│   │   │   ├── QueueRepository.java
│   │   │   ├── TokenRepository.java
│   │   │   ├── CounterRepository.java
│   │   │   ├── RefreshTokenRepository.java
│   │   │   └── AuditLogRepository.java
│   │   ├── entity/
│   │   │   ├── User.java
│   │   │   ├── Organization.java
│   │   │   ├── Location.java
│   │   │   ├── Service.java
│   │   │   ├── Queue.java
│   │   │   ├── Token.java
│   │   │   ├── Counter.java
│   │   │   ├── RefreshToken.java
│   │   │   └── AuditLog.java
│   │   ├── dto/
│   │   │   ├── request/
│   │   │   │   ├── LoginRequest.java
│   │   │   │   ├── TokenJoinRequest.java
│   │   │   │   ├── CallNextRequest.java
│   │   │   │   └── ...
│   │   │   └── response/
│   │   │       ├── LoginResponse.java
│   │   │       ├── TokenResponse.java
│   │   │       ├── QueueStatusResponse.java
│   │   │       └── ...
│   │   ├── mapper/
│   │   │   ├── TokenMapper.java
│   │   │   └── ...
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   ├── BusinessException.java
│   │   │   ├── ResourceNotFoundException.java
│   │   │   ├── DuplicateTokenException.java
│   │   │   ├── QueueFullException.java
│   │   │   └── UnauthorizedTenantAccessException.java
│   │   ├── validation/
│   │   │   ├── PhoneNumberValidator.java
│   │   │   └── UUIDValidator.java
│   │   ├── websocket/
│   │   │   ├── WebSocketEventListener.java
│   │   │   └── StompController.java
│   │   └── util/
│   │       ├── Constants.java
│   │       └── DateTimeUtil.java
│   └── resources/
│       ├── application.yml
│       ├── application-dev.yml
│       ├── application-prod.yml
│       └── db/migration/
│           ├── V1__create_organizations.sql
│           ├── V2__create_users.sql
│           ├── V3__create_locations.sql
│           ├── V4__create_services.sql
│           ├── V5__create_queues.sql
│           ├── V6__create_counters.sql
│           ├── V7__create_tokens.sql
│           ├── V8__create_audit_logs.sql
│           ├── V9__create_refresh_tokens.sql
│           └── V10__seed_demo_data.sql
└── src/test/java/
    └── (test files mirror main structure)
```

---

## 16. NEXT STEPS

1. ✅ **Create `/docs/` directory**
2. ✅ **Document architecture decisions** (`DECISIONS.md`)
3. ✅ **Create backend directory structure**
4. ✅ **Initialize Maven project** (`pom.xml`)
5. ✅ **Configure Spring Boot** (`application.yml`)
6. ✅ **Setup PostgreSQL connection**
7. ✅ **Initialize Flyway migrations**
8. ⏳ **Implement Phase 0 (Foundation)**

---

## 17. CONCLUSION

**ALIGN Backend Status:** ❌ **DOES NOT EXIST**

**Action Required:** Build complete Java/Spring Boot backend from scratch.

**Critical Path:**
1. Foundation (Spring Boot + PostgreSQL + Flyway)
2. Security (JWT + RBAC)
3. Token Engine (with concurrency safety)
4. Staff Operations (with CALL NEXT locking)
5. Realtime (WebSocket/STOMP)
6. Admin (Org management + analytics)
7. Testing (unit + integration + concurrency)
8. Deployment

**Estimated Effort:** 8 weeks (1 developer, full-time)

**High-Risk Areas:**
- Token generation atomicity
- CALL NEXT concurrency
- Tenant isolation enforcement
- WebSocket event ordering
- Step Away expiration handling

**Next Document:** `/docs/BACKEND_ARCHITECTURE_PLAN.md`

---

**Report Generated:** 2026-09-01
**Inspected By:** KIRO Backend Engineer Agent
**Repository:** `d:\align\ALIGN-Digital-Queue-Management-Platform`
