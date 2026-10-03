# ALIGN — Digital Queue Management System
## UI Reference & Verification Package

This reference package provides complete documentation, screen directory mapping, workflow definitions, and functional verification records for the **ALIGN Digital Queue Management System** web application.

---

## 1. Approved Screen Directory & Route Map

| Screen | Name | Role | Route / Screen ID | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Splash / Loading** | Customer | `SCREEN_01_SPLASH` | Initial brand entrance and loading screen with animated vector mark, status telemetry, and entry trigger. *(Created from the ALIGN branding/design system because no original exported reference was supplied)* | **IMPLEMENTED** |
| **02** | **Discovery Portal** | Customer | `SCREEN_02_DISCOVERY` | Multi-branch discovery portal to search, filter, and select organization locations with live wait estimates and active queue indicators. | **IMPLEMENTED** |
| **03** | **Service Selection** | Customer | `SCREEN_03_SERVICES` | Browse available services at the selected branch, displaying wait ranges, people waiting, fast-track flags, and preparation checklists. | **IMPLEMENTED** |
| **04** | **Join Queue Confirmation** | Customer | `SCREEN_04_JOIN_CONFIRM` | Service verification form to input optional customer details (name/phone), review prerequisites, and issue a digital ticket. | **IMPLEMENTED** |
| **05** | **Active Queue Status** | Customer | `SCREEN_05_ACTIVE_STATUS` | Live personal ticket monitor with real-time wait estimation, position tracking, 15-minute Step-Away hold mode, and counter destination alerts. | **IMPLEMENTED** |
| **06** | *Not supplied / no approved screen* | — | — | Not supplied / no approved screen | **NOT IMPLEMENTED** |
| **07** | **Queue History** | Customer | `SCREEN_07_HISTORY` | Chronological log of past completed, cancelled, and skipped tokens with timestamps and service counters. | **IMPLEMENTED** |
| **08** | **Staff Login** | Staff | `SCREEN_08_STAFF_LOGIN` | Secure terminal sign-in for station operators and counter staff with role-based credentials. | **IMPLEMENTED** |
| **09** | **Staff Operations Dashboard** | Staff | `SCREEN_09_STAFF_OPERATIONS` | High-throughput workstation console with 1-click **CALL NEXT**, active service timer, **Recall**, **Complete**, **No-Show/Skip**, and live waitlist queue. | **IMPLEMENTED** |
| **10** | *Not supplied / no approved screen* | — | — | Not supplied / no approved screen | **NOT IMPLEMENTED** |
| **11** | **Announcement Control** | Staff | `SCREEN_11_ANNOUNCEMENT_CONTROL` | Public address & speech broadcast console with live teleprompter, Web Speech synthesizer, dual-tone chime generator, and broadcast history. | **IMPLEMENTED** |
| **12** | **Organization Dashboard** | Organization Admin | `SCREEN_12_ORG_DASHBOARD` | High-level operations analytics: wait time distributions, daily throughput, queue volume breakdown, and critical system alerts. | **IMPLEMENTED** |
| **13** | **Location Management** | Organization Admin | `SCREEN_13_LOCATION_MANAGEMENT` | Enterprise branch directory with operating hours, active services, assigned staff counts, and branch provisioning modal. | **IMPLEMENTED** |
| **14** | **Service & Queue Configuration** | Organization Admin | `SCREEN_14_SERVICE_QUEUE_CONFIG` | Service catalog toggles, token numbering prefix mappings, capacity caps, auto-pause automation rules, and SLA threshold settings. | **IMPLEMENTED** |
| **15** | **Platform Dashboard** | Platform Admin | `SCREEN_15_PLATFORM_DASHBOARD` | Global multi-tenant telemetry dashboard with weekly token issuance charts, cross-organization health indicators, and active alert monitors. | **IMPLEMENTED** |
| **16** | **Tenant Management** | Platform Admin | `SCREEN_16_TENANT_MANAGEMENT` | Super-admin tenant registry to provision new enterprise organizations, filter by sector, inspect branch nodes, and configure isolation. | **IMPLEMENTED** |
| **17–21** | *Not supplied / no approved screens* | — | — | Not supplied / no approved screens | **NOT IMPLEMENTED** |
| **22** | **Public Queue Display** | Public Monitor | `SCREEN_22_PUBLIC_DISPLAY` | Large-screen lobby monitor client *(separate public-display route/client)* displaying current called token, counter destination, upcoming queue, and live clock. | **IMPLEMENTED** |

---

## 2. Navigation Architecture

### CUSTOMER FLOW
```
01 (Splash) → 02 (Discovery) → 03 (Services) → 04 (Join Confirmation) → 05 (Active Status)

07 = Queue History (Accessible via top navigation and ticket view)
```

### STAFF FLOW
```
08 (Staff Login) → 09 (Operations Console) → 11 (Announcement Control)
```

### ORGANIZATION ADMIN FLOW
```
12 (Org Analytics Dashboard) → 13 (Location Management) → 14 (Service & Queue Config)
```

### PLATFORM ADMIN FLOW
```
15 (Global Platform Dashboard) → 16 (Multi-Tenant Management)
```

### PUBLIC DISPLAY
```
22 (Public Queue Display / Lobby TV Monitor)
```
> **Architecture Note**: Screen 22 is a dedicated public display client intended for lobby TV screens and monitors. It is **NOT** part of the customer navigation sequence.

---

## 3. Functional Verification Matrix

| Domain & Workflow | Functional Step | Implementation Status | Verification Notes |
| :--- | :--- | :--- | :--- |
| **Customer Journey** | Branch Discovery & Search | **IMPLEMENTED** | Live searching and filtering of branches with active status and queue indicators. |
| | Service Selection | **IMPLEMENTED** | Displays real-time estimated wait ranges, fast-track flags, confidence metrics, and required checklist. |
| | Join Confirmation | **IMPLEMENTED** | Validates form fields, captures optional customer metadata, and displays service guidelines. |
| | Token Generation | **IMPLEMENTED** | Idempotent token creation with atomic sequence numbering (e.g. `A-042`), estimated wait calculations, and audit log generation. |
| | Active Queue Tracking | **IMPLEMENTED** | Dynamic position calculation, countdown timers, Step-Away 15-minute hold window, and real-time counter assignment. |
| | Queue History | **IMPLEMENTED** | Persistent history tracking completed, cancelled, and skipped tokens. |
| **Staff Workstation** | Authentication | **IMPLEMENTED** | Role-based workstation sign-in with preset demo profiles. |
| | Live Queue View | **IMPLEMENTED** | Priority-ordered waiting list with token numbers, service labels, and wait durations. |
| | Call Next | **IMPLEMENTED** | Concurrency-safe FIFO queue popping, counter assignment, audio chime trigger, and public display broadcast. |
| | Active Serving | **IMPLEMENTED** | Live elapsed service timer, customer details, and counter status. |
| | Complete Service | **IMPLEMENTED** | Closes active ticket, archives to history, clears counter, and updates today's throughput counter. |
| | Recall Customer | **IMPLEMENTED** | Re-triggers chime and broadcast announcement to the lobby without state reset. |
| | Skip / No-Show / Cancel | **IMPLEMENTED** | Marks ticket as skipped/cancelled with audit log record. |
| **Audio & Announcements** | Token Announcement | **IMPLEMENTED** | Dynamic message formatting (`Token A-042, please proceed to Counter 3`). |
| | Speech Synthesizer | **IMPLEMENTED** | Browser `speechSynthesis` integration with teleprompter preview. |
| | Dual-Frequency Chime | **IMPLEMENTED** | Web Audio API harmonic chime (587Hz / 880Hz sine + triangle) before speech playback. |
| | Broadcast Lifecycle | **IMPLEMENTED** | Tracks state machine: Ready / Idle → Speaking → Completed / Failed. |
| **Public Monitor (Screen 22)** | Synchronized State | **IMPLEMENTED** | Real-time reactive updates whenever staff calls a token or advances the queue. |
| | Display Layout | **IMPLEMENTED** | High-contrast TV mode with giant token typography, counter destination card, upcoming list, and fullscreen mode. |
| **Organization Admin** | Location Management | **IMPLEMENTED** | View all physical branches, status toggling, operating hours, and new branch creation. |
| | Service & Queue Config | **IMPLEMENTED** | Enable/disable services, configure token prefixes, set max capacity limits, and configure auto-pause thresholds. |
| | Analytics Dashboard | **IMPLEMENTED** | Aggregated tokens served, average wait times, volume distributions, and active system alerts. |
| **Platform Super-Admin** | Multi-Tenant Registry | **IMPLEMENTED** | List all tenant organizations with sector categorization, location counts, and active queue counts. |
| | Tenant Onboarding | **IMPLEMENTED** | Provision new isolated enterprise tenant nodes with custom sector and contact configurations. |
| | Global Telemetry | **IMPLEMENTED** | 7-day token issuance volume graphs, system incident monitors, and health metrics (99.9% uptime). |

---

## 4. Screenshot Reference Catalog

The `Screenshots/` directory is organized into role-specific packages:

```
ALIGN-UI-REFERENCE-PACKAGE/
├── Screenshots/
│   ├── Customer/
│   │   ├── 01-Splash-Loading.png
│   │   ├── 02-Discovery-Portal.png
│   │   ├── 03-Service-Selection.png
│   │   ├── 04-Join-Queue-Confirmation.png
│   │   ├── 05-Active-Queue-Status.png
│   │   ├── 05-Active-Queue-Status-Waiting.png
│   │   └── 07-Queue-History.png
│   │
│   ├── Staff/
│   │   ├── 08-Staff-Login.png
│   │   ├── 09-Staff-Operations-Dashboard.png
│   │   ├── 09-Staff-Operations-Serving.png
│   │   ├── 09-Staff-Operations-Completed.png
│   │   ├── 11-Announcement-Control.png
│   │   ├── 11-Announcement-Control-Speaking.png
│   │   └── 11-Announcement-Control-Completed.png
│   │
│   ├── Organization-Admin/
│   │   ├── 12-Organization-Dashboard.png
│   │   ├── 13-Location-Management.png
│   │   └── 14-Service-Queue-Configuration.png
│   │
│   ├── Platform-Admin/
│   │   ├── 15-Platform-Dashboard.png
│   │   └── 16-Tenant-Management.png
│   │
│   └── Public-Display/
│       ├── 22-Public-Queue-Display.png
│       └── 22-Public-Queue-Display-Called.png
│
└── README.md
```

---

## 5. Execution Instructions

### Frontend
```bash
cd frontend
bun install
bun run dev
```

### E2E Tests
```bash
cd e2e
npm install
node phase-8.cjs
```

### Backend
```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```
*(Development profile enables OpenAPI at `/swagger-ui/index.html` and `/v3/api-docs`)*
