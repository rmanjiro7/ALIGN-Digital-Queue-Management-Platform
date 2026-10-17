# ALIGN BACKEND — DEPLOYMENT

**Status:** Phase 8 MVP COMPLETE ✅

---

## 1. System Architecture Overview

**Academic / Single-Node MVP**

The ALIGN system is currently structured as a single-node application:

React/Vite frontend (Static build)
        ↓
Spring Boot backend (REST API + WebSocket)
        ↓
PostgreSQL 15+ (Database)
        ↓
Flyway migrations (Automatic schema management)

---

## 2. Directory Structure

The repository is organized into distinct isolated projects:

* `/frontend` — React/Vite application. Execution happens inside this directory (`cd frontend`).
* `/backend` — Spring Boot application. Execution happens inside this directory (`cd backend`).
* `/e2e` — End-to-end testing suite (Puppeteer). Execution happens inside this directory (`cd e2e`).

---

## 3. Prerequisites

* **Java:** 17+ (Temurin 17 recommended)
* **Maven:** 3.9+ (Maven Wrapper included via `mvnw.cmd` / `./mvnw`)
* **Node & Bun:** Required for frontend execution (Bun is the primary package manager in `/frontend`).
* **Node & npm:** Required for E2E tests (in `/e2e`).
* **PostgreSQL:** 15+ required for runtime.
* **Docker Engine:** Required for running test suites (via Testcontainers) and local PostgreSQL.

---

## 4. Required Ports

* **Frontend:** 3000 (Vite Dev Server)
* **Backend:** 8080 (Spring Boot)
* **PostgreSQL:** 5432

---

## 5. Environment Variables

* **`backend/.env.example`**: The template file demonstrating required environment variables.
* **`backend/.env`**: Your local environment file (never commit this).

Key variables include `DB_PASSWORD`, `JWT_SECRET` (must be a minimum 64-character base64 encoded secret for HS512), and `ALLOWED_ORIGINS`.

**Profiles:**
* `dev`: Development profile (Swagger/OpenAPI enabled).
* `prod`: Production profile (Swagger disabled, compression enabled, larger connection pools).

---

## 6. Database / Flyway

Flyway automatically manages the database schema and migrations upon backend startup.
The schema is currently at migration **V16** (`V16__phase8_mvp_gaps.sql`).

Initialization and migration are completely automated by the Spring Boot backend startup process.

---

## 7. Development Startup Guide

1. **Start PostgreSQL:** Ensure a local instance or Docker container is running on port 5432.
2. **Start Spring Boot Backend:**
   ```bash
   cd backend
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```
3. **Start React/Vite Frontend:**
   ```bash
   cd frontend
   bun install
   bun run dev
   ```
4. **Optionally Run E2E Tests:**
   ```bash
   cd e2e
   npm install
   npm test
   ```

---

## 8. Frontend Workflow

The frontend uses Vite and Bun.

```bash
cd frontend
bun install
bun run dev
```

**Production Build:**
```bash
bun run build
```
This generates the static compiled assets in `frontend/dist/`.
*Note: The Vite dev server (`bun run dev`) is not a production deployment strategy. The `dist/` folder must be served by a static web server or reverse proxy.*

---

## 9. Backend Workflow

The backend uses the Maven Wrapper.

**Build:**
```bash
cd backend
./mvnw clean install -DskipTests
```

**Run (Production JAR):**
```bash
java -jar target/align-qms-backend-0.1.0-SNAPSHOT.jar --spring.profiles.active=prod
```
*(Verify the exact filename in `backend/target/` if the version changes in `pom.xml`)*

---

## 10. E2E Testing

End-to-End tests are completely isolated in the `/e2e` directory with their own `package.json` and `package-lock.json`.

**Execution:**
```bash
cd e2e
npm install
npm test
```
(Or run specific scripts like `node phase-8.cjs`).

---

## 11. OpenAPI / Swagger

**Development (`dev` profile):**
* OpenAPI JSON: `http://localhost:8080/v3/api-docs`
* Swagger UI: `http://localhost:8080/swagger-ui/index.html`

*Note: OpenAPI does not bypass Spring Security. Protected API endpoints remain protected. Valid JWT tokens are required for authenticated operations.*

**Production (`prod` profile):**
* OpenAPI and Swagger UI are **disabled** for security.

---

## 12. Rate Limiting (MVP Hardening)

ALIGN implements a single-node, in-memory rate limiting strategy using Bucket4j via `RateLimitFilter`.

**Limits:**
* Authentication: 10 requests / minute / IP
* Token Creation: 30 requests / minute / IP
* Authenticated Users: 120 requests / minute / User
* Generic Public: 100 requests / minute / IP

**Architecture:**
* Storage: In-memory bounded LRU cache.
* Maximum Bucket Count: 1000 buckets per category.
* Behavior: Returns HTTP 429 Too Many Requests when exceeded.

*Note: This is single-node MVP/demo hardening. It is not distributed production rate limiting. Multi-node production deployments would require centralized coordination (e.g., Redis).*

---

## 13. WebSocket & Reverse Proxy

ALIGN uses WebSocket connections at `/ws-align` for real-time queue updates.

**Reverse Proxy Requirements:**
Production reverse proxies (like Nginx, Traefik) must be explicitly configured to preserve `Upgrade` and `Connection` headers to allow WebSocket traffic to pass through to the backend. HTTPS/TLS termination should also occur at the proxy, with `wss://` used for secure WebSockets.

---

## 14. Production Deployment Flow

1. **Build Frontend:** Run `bun run build` in `/frontend`.
2. **Serve Frontend:** Host `frontend/dist/` through a static web server / reverse proxy (e.g., Nginx).
3. **Build Backend:** Run `./mvnw clean package -DskipTests` in `/backend`.
4. **Run Backend:** Execute the generated JAR with `--spring.profiles.active=prod`.
5. **Database:** Ensure PostgreSQL is securely accessible to the backend.
6. **Reverse Proxy:** Configure TLS termination, route `/api/*` and `/ws-align/*` to the backend (port 8080), and support WebSocket upgrades.

---

## 15. Orchestration & Single-Command Launcher (`start.ps1` / `start.bat`)

The entire platform can be managed with a unified launch script:

```powershell
# 1. Start Platform (PostgreSQL, Spring Boot backend, and Vite frontend)
.\start.ps1

# 2. Check Real-Time Health & Listening Ports
.\start.ps1 -Status

# 3. Gracefully Stop All Services
.\start.ps1 -Stop
```

On Windows CMD or File Explorer, double-click [`start.bat`](file:///d:/align/ALIGN-Digital-Queue-Management-Platform/start.bat) to launch the stack automatically.

### Docker Compose Direct Commands:
```bash
docker compose up -d
```
This manages:
1. `align_postgres`: PostgreSQL 15 container (Port 5432, healthcheck via `pg_isready`)
2. `align_backend`: Spring Boot container (Port 8080, healthcheck via `/actuator/health`)
---

## 16. Security

Current MVP Security features:
* Stateless JWT Authentication
* Role-Based Access Control (RBAC)
* Strict Tenant Isolation
* In-memory Rate Limiting
* Production Swagger/OpenAPI disabled

*Note: HTTPS/TLS is not handled by the Spring Boot application and must terminate at the production reverse proxy.*

---

## 17. Known Limitations

* **Single-node rate limiting:** Rate limits are stored in-memory (no Redis), so they are not shared across multiple nodes.
* **No formal backups:** Database backup and retention automation is not included.
* **No APM:** No formal monitoring or application performance management is configured.
* **No load-testing baseline:** System capacity under extreme concurrency is unverified.
