# ALIGN BACKEND — DEPLOYMENT

**Version:** 1.2
**Last Updated:** 2026-09-06
**Status:** Phase 0 COMPLETE ✅ — runtime validated with Testcontainers

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Java | 17+ | Temurin 17 recommended |
| Maven | 3.9+ | Maven Wrapper included (`mvnw.cmd`) |
| PostgreSQL | 15+ | Required for runtime |
| Docker Engine | 20+ | **Required for tests** (Testcontainers) |
| WSL 2 (Windows only) | — | **Required** when using Docker Desktop on Windows. Install with `wsl --install`, then restart Docker Desktop. Without WSL 2, the Docker Linux engine pipe does not start and Testcontainers cannot connect. |

---

## Environment Variables

Create a `.env` file in the `backend/` directory (never commit this file):

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=align_qms
DB_USERNAME=align_user
DB_PASSWORD=<secure_password>

# JWT
JWT_SECRET=<base64-encoded-256-bit-secret>
JWT_ACCESS_TOKEN_EXPIRATION=900000
JWT_REFRESH_TOKEN_EXPIRATION=604800000

# Server
SERVER_PORT=8080
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

See `backend/.env.example` for template (created in Phase 0).

---

## Local PostgreSQL Setup

```sql
CREATE DATABASE align_qms;
CREATE USER align_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE align_qms TO align_user;
```

---

## Build

```bash
cd backend
./mvnw clean install
```

Or skip tests (development only):
```bash
./mvnw clean install -DskipTests
```

---

## Run (Development)

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Application starts on `http://localhost:8080`.
Health endpoint: `http://localhost:8080/actuator/health`

---

## Run (Production JAR)

```bash
cd backend
java -jar target/align-qms-backend-1.0.0.jar --spring.profiles.active=prod
```

---

## Docker Compose (Development)

```yaml
# docker-compose.yml (to be created in Phase 0)
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
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
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: align_qms
      DB_USERNAME: align_user
      DB_PASSWORD: dev_password
      JWT_SECRET: dev-only-secret-change-for-production
      ALLOWED_ORIGINS: http://localhost:5173
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres-data:
```

---

## Running Tests

```bash
# All tests (requires Docker for Testcontainers)
./mvnw test

# Integration tests only
./mvnw test -Dtest="*IntegrationTest,*ConcurrencyTest"

# With coverage report
./mvnw clean verify jacoco:report
```

Coverage report: `backend/target/site/jacoco/index.html`

**Phase 0 Test Results (Validated 2026-09-06):**
- Docker Server: 29.7.2
- Testcontainers: 1.21.4
- PostgreSQL: 15-alpine (containerized)
- Tests: 4 passed, 0 failed
- Build: SUCCESS
- Migration V1__foundation.sql: Executed successfully
- Health endpoint: HTTP 200 verified

---

## Flyway Migrations

Flyway runs automatically on application startup.
Migration files: `backend/src/main/resources/db/migration/V*.sql`

To repair Flyway checksum (if needed in development):
```bash
./mvnw flyway:repair -Dflyway.url=jdbc:postgresql://localhost:5432/align_qms \
  -Dflyway.user=align_user -Dflyway.password=your_password
```

---

## Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /actuator/health` | Overall health (DB + app) |
| `GET /actuator/info` | Application info |

---

## Production Notes

- Use HTTPS (TLS termination at reverse proxy)
- Use WebSocket Secure (`wss://`) in production
- Set `LOG_LEVEL=WARN` or `INFO` in production
- Tune HikariCP `maximum-pool-size` based on PostgreSQL `max_connections`
- Use environment secrets manager (not `.env` file) in production

---

**Last Updated:** 2026-09-06
**Next Review:** After runtime validation (Docker + WSL 2 installed on dev machine)
