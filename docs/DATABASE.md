# ALIGN BACKEND — DATABASE SCHEMA

**Version:** 1.2
**Last Updated:** 2026-09-07
**Database:** PostgreSQL 15+
**Migration Tool:** Flyway
**Validated migrations:** V1__foundation.sql ✅, V2__security.sql ✅

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│   organizations     │
│─────────────────────│
│ id (PK) UUID        │◄────────────────────┐
│ code VARCHAR(20) UK │                     │
│ name VARCHAR(255)   │                     │
│ sector VARCHAR(100) │                     │
│ status VARCHAR(20)  │                     │
│ contact_email       │                     │
│ joined_date         │                     │
│ created_at          │                     │
│ updated_at          │                     │
└─────────────────────┘                     │
        │                                   │
        │ 1:N                               │
        ▼                                   │
┌─────────────────────┐                     │
│     locations       │                     │
│─────────────────────│                     │
│ id (PK) UUID        │◄────────┐           │
│ org_id (FK) UUID    │─────────┼───────────┘
│ name VARCHAR(255)   │         │
│ address TEXT        │         │
│ city VARCHAR(100)   │         │
│ status VARCHAR(20)  │         │
│ operating_hours     │         │
│ is_hq BOOLEAN       │         │
│ created_at          │         │
│ updated_at          │         │
└─────────────────────┘         │
        │                       │
        │ 1:N                   │
        ▼                       │
┌─────────────────────┐         │
│      services       │         │
│─────────────────────│         │
│ id (PK) UUID        │◄───┐    │
│ org_id (FK) UUID    │────┼────┘
│ location_id (FK)    │────┘
│ name VARCHAR(255)   │
│ description TEXT    │
│ enabled BOOLEAN     │
│ is_fast_track BOOL  │
│ preparation_guide   │
│ created_at          │
│ updated_at          │
└─────────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────────┐         ┌─────────────────────┐
│       queues        │         │      counters       │
│─────────────────────│         │─────────────────────│
│ id (PK) UUID        │◄────┐   │ id (PK) UUID        │
│ org_id (FK) UUID    │     │   │ org_id (FK) UUID    │
│ location_id (FK)    │     │   │ location_id (FK)    │
│ service_id (FK) UK  │     │   │ number INT          │
│ name VARCHAR(255)   │     │   │ name VARCHAR(100)   │
│ token_prefix CHAR(5)│     │   │ status VARCHAR(20)  │
│ status VARCHAR(20)  │     │   │ availability        │
│ max_capacity INT    │     │   │ assigned_staff_id   │
│ auto_pause BOOLEAN  │     │   │ current_serving_tid │◄──┐
│ next_token_number   │ ⭐  │   │ service_start_time  │   │
│ created_at          │     │   │ created_at          │   │
│ updated_at          │     │   │ updated_at          │   │
└─────────────────────┘     │   └─────────────────────┘   │
        │                   │           │                  │
        │ 1:N               │           │                  │
        ▼                   │           │                  │
┌─────────────────────┐     │           │                  │
│       tokens        │     │           │                  │
│─────────────────────│     │           │                  │
│ id (PK) UUID        │─────┘           │                  │
│ org_id (FK) UUID    │                 │                  │
│ location_id (FK)    │                 │                  │
│ service_id (FK)     │                 │                  │
│ queue_id (FK)       │                 │                  │
│ token_number UK     │                 │                  │
│ state VARCHAR(20)   │                 │                  │
│ counter_id (FK)     │◄────────────────┘                  │
│ called_by_staff_id  │                                    │
│ customer_name       │                                    │
│ customer_phone      │                                    │
│ joined_at           │                                    │
│ called_at           │                                    │
│ served_at           │                                    │
│ completed_at        │                                    │
│ step_away_expires_at│                                    │
│ idempotency_key UK  │                                    │
│ created_at          │                                    │
│ updated_at          │                                    │
└─────────────────────┘                                    │
        │                                                  │
        │ 1:N                                              │
        ▼                                                  │
┌─────────────────────┐                                    │
│   token_events      │ ⭐ NEW                              │
│─────────────────────│                                    │
│ id (PK) UUID        │                                    │
│ token_id (FK)       │────────────────────────────────────┘
│ event_type VARCHAR  │
│ from_state VARCHAR  │
│ to_state VARCHAR    │
│ counter_id (FK)     │
│ actor_id (FK)       │
│ actor_name          │
│ metadata JSONB      │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│       users         │         │    audit_logs       │
│─────────────────────│         │─────────────────────│
│ id (PK) UUID        │         │ id (PK) UUID        │
│ org_id (FK) UUID    │         │ org_id (FK) UUID    │
│ email VARCHAR UK    │         │ actor_id (FK)       │
│ password_hash       │         │ actor_name          │
│ name VARCHAR(255)   │         │ action VARCHAR(100) │
│ role VARCHAR(50)    │         │ aggregate_type      │
│ status VARCHAR(20)  │         │ aggregate_id UUID   │
│ location_id (FK)    │         │ before_state        │
│ assigned_counter_#  │         │ after_state         │
│ created_at          │         │ details TEXT        │
│ updated_at          │         │ ip_address INET     │
└─────────────────────┘         │ user_agent TEXT     │
                                │ created_at          │
                                └─────────────────────┘

┌─────────────────────┐
│  refresh_tokens     │
│─────────────────────│
│ id (PK) UUID        │
│ user_id (FK) UUID   │
│ token VARCHAR UK    │
│ expires_at          │
│ created_at          │
└─────────────────────┘
```

---

## Table Definitions

### organizations

**Purpose:** Multi-tenant organization registry

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    contact_email VARCHAR(255),
    joined_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_org_status CHECK (status IN ('ACTIVE', 'SUSPENDED'))
);

CREATE INDEX idx_organizations_status ON organizations(status);
```

**Columns:**
- `code`: Human-readable tenant code (e.g., `T-8492`)
- `status`: `ACTIVE` or `SUSPENDED`
- `sector`: Industry classification (Healthcare, Government, Education, etc.)

---

### locations

**Purpose:** Physical branch/office locations

```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    operating_hours VARCHAR(100),
    is_hq BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_location_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_locations_org ON locations(org_id);
CREATE INDEX idx_locations_org_status ON locations(org_id, status);
```

**Columns:**
- `is_hq`: Headquarters/main branch flag
- `operating_hours`: Human-readable hours (e.g., "08:00 AM - 06:00 PM")

---

### services

**Purpose:** Service offerings at each location

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
CREATE INDEX idx_services_org_location_enabled ON services(org_id, location_id, enabled);
```

**Columns:**
- `is_fast_track`: Priority/express service flag
- `preparation_guidance`: Customer instructions (e.g., "Bring government ID")

---

### queues

**Purpose:** Queue configuration per service

```sql
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token_prefix CHAR(5) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    max_capacity INT DEFAULT 100,
    auto_pause_at_capacity BOOLEAN DEFAULT FALSE,
    next_token_number BIGINT DEFAULT 1, -- ⭐ ATOMIC COUNTER
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT uq_queue_service UNIQUE(service_id),
    CONSTRAINT chk_queue_status CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
    CONSTRAINT chk_next_token_positive CHECK (next_token_number >= 1),
    CONSTRAINT chk_max_capacity_positive CHECK (max_capacity > 0)
);

CREATE INDEX idx_queues_location ON queues(location_id);
CREATE INDEX idx_queues_service ON queues(service_id);
CREATE INDEX idx_queues_status ON queues(status);
```

**⭐ KEY COLUMN:**
- `next_token_number`: Atomic counter for token generation (ADR-001)

**Token Prefix Examples:**
- `A` → generates A-001, A-002, A-003
- `B` → generates B-001, B-002, B-003
- `C` → generates C-001, C-002, C-003

---

### tokens

**Purpose:** Customer queue tokens (PRIMARY DOMAIN MODEL)

```sql
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    token_number VARCHAR(20) NOT NULL,
    state VARCHAR(20) NOT NULL,
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
    CONSTRAINT uq_idempotency_key UNIQUE(idempotency_key),
    CONSTRAINT chk_token_state CHECK (state IN (
        'WAITING', 'AWAY', 'CALLED', 'IN_SERVICE', 
        'COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'
    ))
);

-- Performance indexes
CREATE INDEX idx_tokens_queue_state ON tokens(queue_id, state) 
    WHERE state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE');

CREATE INDEX idx_tokens_location_state ON tokens(location_id, state);

CREATE INDEX idx_tokens_customer_phone ON tokens(customer_phone) 
    WHERE customer_phone IS NOT NULL;

CREATE INDEX idx_tokens_step_away_expiry ON tokens(step_away_expires_at) 
    WHERE state = 'AWAY' AND step_away_expires_at IS NOT NULL;

CREATE INDEX idx_tokens_idempotency ON tokens(idempotency_key) 
    WHERE idempotency_key IS NOT NULL;
```

**Token States:** See BR-002 for state machine.

**Critical Constraints:**
- `uq_token_number_queue`: Prevents duplicate token numbers in queue
- `uq_idempotency_key`: Enables safe network retry handling

**Timestamps:**
- `joined_at`: Customer joins queue
- `called_at`: Staff calls token
- `served_at`: Service begins (optional, for future analytics)
- `completed_at`: Service/cancellation finalized

---

### token_events ⭐ NEW

**Purpose:** Token lifecycle event history (separate from audit logs)

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
CREATE INDEX idx_token_events_created ON token_events(created_at DESC);
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

**Metadata JSONB Examples:**
```json
{
  "wait_minutes": 12,
  "position_at_join": 5,
  "estimated_wait": "10-15 min"
}
```

**Purpose:** Enables ML training data, analytics, customer journey reconstruction.

---

### counters

**Purpose:** Service counters/stations

```sql
CREATE TABLE counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    number INT NOT NULL,
    name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    availability VARCHAR(20) DEFAULT 'ONLINE',
    assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    current_serving_token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
    service_start_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT uq_counter_location_number UNIQUE(location_id, number),
    CONSTRAINT chk_counter_status CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
    CONSTRAINT chk_counter_availability CHECK (availability IN ('ONLINE', 'ON_BREAK', 'AWAY', 'OFFLINE'))
);

CREATE INDEX idx_counters_location ON counters(location_id);
CREATE INDEX idx_counters_location_availability ON counters(location_id, availability);
CREATE INDEX idx_counters_assigned_staff ON counters(assigned_staff_id) 
    WHERE assigned_staff_id IS NOT NULL;
```

**Availability States:** See BR-003.

---

### users

**Purpose:** System users (staff, admins)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    assigned_counter_number INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_user_role CHECK (role IN ('STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN')),
    CONSTRAINT chk_user_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_org_role ON users(org_id, role);
```

**Roles:**
- `STAFF`: Counter operators
- `ORG_ADMIN`: Organization administrators
- `PLATFORM_ADMIN`: Super administrators

**Password Storage:** BCrypt hash (strength 12)

---

### audit_logs

**Purpose:** Administrative action audit trail

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
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id) 
    WHERE actor_id IS NOT NULL;
```

**Distinction from token_events:**
- `audit_logs`: Administrative actions (queue config changed, staff assigned)
- `token_events`: Token lifecycle (called, completed, cancelled)

**Action Examples:**
- `QUEUE_PAUSED`
- `QUEUE_RESUMED`
- `SERVICE_DISABLED`
- `STAFF_ASSIGNED`
- `COUNTER_AVAILABILITY_CHANGED`
- `LOCATION_CREATED`

---

### refresh_tokens

**Purpose:** JWT refresh token persistence

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE UNIQUE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

**Lifecycle:**
- Created: User login
- Used: Refresh access token
- Expired: `expires_at` passed (7 days default)
- Revoked: User logout (delete row)

---

## Flyway Migrations

### Migration Sequence

```
V1__create_organizations.sql
V2__create_users.sql
V3__create_locations.sql
V4__create_services.sql
V5__create_queues.sql
V6__create_counters.sql
V7__create_tokens.sql
V8__create_token_events.sql       ⭐ NEW
V9__create_audit_logs.sql
V10__create_refresh_tokens.sql
V11__create_indexes.sql
V12__seed_demo_data.sql
```

### Example: V5__create_queues.sql

```sql
-- V5__create_queues.sql
CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token_prefix CHAR(5) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    max_capacity INT DEFAULT 100,
    auto_pause_at_capacity BOOLEAN DEFAULT FALSE,
    next_token_number BIGINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT uq_queue_service UNIQUE(service_id),
    CONSTRAINT chk_queue_status CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
    CONSTRAINT chk_next_token_positive CHECK (next_token_number >= 1),
    CONSTRAINT chk_max_capacity_positive CHECK (max_capacity > 0)
);

CREATE INDEX idx_queues_location ON queues(location_id);
CREATE INDEX idx_queues_service ON queues(service_id);
CREATE INDEX idx_queues_status ON queues(status);
```

### Example: V8__create_token_events.sql ⭐

```sql
-- V8__create_token_events.sql
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
CREATE INDEX idx_token_events_created ON token_events(created_at DESC);

COMMENT ON TABLE token_events IS 'Token lifecycle event history for analytics and ML training';
COMMENT ON COLUMN token_events.metadata IS 'Extensible JSONB field for event-specific data';
```

---

## Critical Queries

### 1. Atomic Token Number Generation

```sql
-- Service: TokenService.joinQueue()
UPDATE queues 
SET next_token_number = next_token_number + 1 
WHERE id = :queueId 
RETURNING next_token_number;
```

**Concurrency:** ✅ Atomic  
**Isolation:** Transaction-safe

---

### 2. CALL NEXT (Concurrent-Safe)

```sql
-- Repository: TokenRepository.findNextWaitingTokenWithLock()
SELECT * FROM tokens 
WHERE queue_id = :queueId 
  AND state = 'WAITING'
ORDER BY joined_at ASC, id ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**Concurrency:** ✅ `SKIP LOCKED` prevents duplicate assignment  
**Ordering:** FIFO (first joined, first served)

---

### 3. Active Token Count (Capacity Check)

```sql
-- Repository: TokenRepository.countActiveTokens()
SELECT COUNT(*) 
FROM tokens 
WHERE queue_id = :queueId 
  AND state IN ('WAITING', 'AWAY', 'CALLED', 'IN_SERVICE');
```

**Uses:** Queue capacity enforcement (BR-005)

---

### 4. Expired Step Away Tokens

```sql
-- Repository: TokenRepository.findExpiredStepAwayTokens()
SELECT * FROM tokens 
WHERE state = 'AWAY' 
  AND step_away_expires_at <= :now;
```

**Uses:** Background job (BR-008)

---

### 5. Token Event Timeline

```sql
-- Service: AnalyticsService.getTokenTimeline()
SELECT 
    event_type,
    from_state,
    to_state,
    actor_name,
    created_at
FROM token_events 
WHERE token_id = :tokenId
ORDER BY created_at ASC;
```

**Uses:** Customer journey reconstruction, analytics

---

### 6. Service Duration Analysis

```sql
-- Analytics: Average service time per queue
SELECT 
    q.name AS queue_name,
    AVG(EXTRACT(EPOCH FROM (t.completed_at - t.called_at)) / 60) AS avg_service_minutes
FROM tokens t
JOIN queues q ON t.queue_id = q.id
WHERE t.state = 'COMPLETED'
  AND t.called_at IS NOT NULL
  AND t.completed_at IS NOT NULL
  AND t.completed_at > NOW() - INTERVAL '7 days'
GROUP BY q.id, q.name;
```

**Uses:** Wait time prediction, staffing optimization

---

## Database Configuration

### application.yml (Development)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/align_qms
    username: align_user
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
  
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
        types:
          print:
            banner: false
  
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
    validate-on-migrate: true
```

### PostgreSQL Configuration Recommendations

```sql
-- Connection settings
max_connections = 100

-- Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

-- Concurrency settings
max_locks_per_transaction = 64
```

---

## Backup & Retention Policies

### Token Events

**Retention:** 2 years (for ML training)  
**Archival:** Move to separate archive table after 1 year  
**Backup:** Daily incremental, weekly full

### Audit Logs

**Retention:** 7 years (compliance)  
**Archival:** Move to cold storage after 1 year  
**Backup:** Daily incremental, weekly full

### Active Tokens

**Retention:** 30 days after completion  
**Cleanup:** Daily job deletes tokens older than 30 days  
**Backup:** Real-time replication

---

**Document Status:** APPROVED  
**Last Updated:** 2026-09-01  
**PostgreSQL Version:** 15+  
**Next Review:** After Phase 3 (Token Engine) implementation
