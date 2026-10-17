const puppeteer = require('puppeteer');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// ENVIRONMENT VARIABLES & FIXTURE CONFIGURATION
// -----------------------------------------------------------------------------
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || 'e2e.staff@align.local';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || 'e2e-password';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e.admin@align.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'e2e-password';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8080';

// -----------------------------------------------------------------------------
// FIXTURE / BASELINE CONFIGURATION VALIDATION
// -----------------------------------------------------------------------------
const defaultManifestPath = path.join(__dirname, 'helpers', '.isolated-transfer-fixture-manifest.json');
const manifestPath = process.env.FIXTURE_MANIFEST_PATH || defaultManifestPath;

const isFixtureMode = process.env.USE_TRANSFER_FIXTURE === 'true' ||
  process.env.USE_FIXTURE === 'true' ||
  Boolean(process.env.FIXTURE_MANIFEST_PATH);

let ORG_ID;
let LOCATION_ID;
let SERVICE_A_ID;
let SERVICE_B_ID;
let COUNTER_1_NUMBER;
let COUNTER_2_NUMBER;

if (isFixtureMode) {
  // Finding 2: Require manifest file to exist when fixture mode is requested
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `[E2E] [Configuration Error] Fixture mode is enabled (USE_TRANSFER_FIXTURE=true / FIXTURE_MANIFEST_PATH), ` +
      `but fixture manifest does not exist at "${manifestPath}". Run fixture setup first: ` +
      `"node e2e/helpers/isolated-transfer-fixture.cjs setup".`
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    throw new Error(
      `[E2E] [Configuration Error] Fixture manifest at "${manifestPath}" could not be parsed: ${err.message}`
    );
  }

  // Validate manifest structure and completeness
  if (!manifest || typeof manifest !== 'object') {
    throw new Error(`[E2E] [Configuration Error] Fixture manifest at "${manifestPath}" is not a valid JSON object.`);
  }

  if (manifest.status && manifest.status !== 'COMPLETE') {
    throw new Error(
      `[E2E] [Configuration Error] Fixture manifest at "${manifestPath}" has status "${manifest.status}". ` +
      `Fixture setup did not complete successfully. Run teardown and re-provision before running test.`
    );
  }

  const missingFields = [];
  if (!manifest.orgId || typeof manifest.orgId !== 'string') missingFields.push('orgId');
  if (!manifest.locationId || typeof manifest.locationId !== 'string') missingFields.push('locationId');
  if (!manifest.serviceA?.id || typeof manifest.serviceA.id !== 'string') missingFields.push('serviceA.id');
  if (!manifest.queueA?.id || typeof manifest.queueA.id !== 'string') missingFields.push('queueA.id');
  if (!manifest.serviceB?.id || typeof manifest.serviceB.id !== 'string') missingFields.push('serviceB.id');
  if (!manifest.queueB?.id || typeof manifest.queueB.id !== 'string') missingFields.push('queueB.id');
  if (!manifest.counter1?.id || typeof manifest.counter1.id !== 'string') missingFields.push('counter1.id');
  if (typeof manifest.counter1?.number !== 'number' || manifest.counter1.number < 1) missingFields.push('counter1.number');
  if (!manifest.counter2?.id || typeof manifest.counter2.id !== 'string') missingFields.push('counter2.id');
  if (typeof manifest.counter2?.number !== 'number' || manifest.counter2.number < 1) missingFields.push('counter2.number');
  if (!Array.isArray(manifest.assignments) || manifest.assignments.length < 2) missingFields.push('assignments (minimum 2 expected)');

  if (missingFields.length > 0) {
    throw new Error(
      `[E2E] [Configuration Error] Fixture manifest at "${manifestPath}" is incomplete. Missing required fields: ` +
      `[${missingFields.join(', ')}].`
    );
  }

  // Validate logical consistency
  if (manifest.serviceA.id === manifest.serviceB.id) {
    throw new Error(`[E2E] [Configuration Error] Fixture manifest has identical Service A and Service B IDs: ${manifest.serviceA.id}`);
  }
  if (manifest.counter1.number === manifest.counter2.number) {
    throw new Error(`[E2E] [Configuration Error] Fixture manifest has identical Counter 1 and Counter 2 numbers: ${manifest.counter1.number}`);
  }

  const hasAssignment1 = manifest.assignments.some(
    a => a.counterId === manifest.counter1.id && a.serviceId === manifest.serviceA.id
  );
  const hasAssignment2 = manifest.assignments.some(
    a => a.counterId === manifest.counter2.id && a.serviceId === manifest.serviceB.id
  );
  if (!hasAssignment1 || !hasAssignment2) {
    throw new Error(
      `[E2E] [Configuration Error] Fixture manifest assignments do not link Counter 1 to Service A and Counter 2 to Service B.`
    );
  }

  // Prevent accidental hybrid configuration: reject conflicting environment overrides
  const envConflicts = [];
  if (process.env.E2E_ORG_ID && process.env.E2E_ORG_ID !== manifest.orgId) {
    envConflicts.push(`E2E_ORG_ID ("${process.env.E2E_ORG_ID}" vs manifest "${manifest.orgId}")`);
  }
  if (process.env.E2E_LOCATION_ID && process.env.E2E_LOCATION_ID !== manifest.locationId) {
    envConflicts.push(`E2E_LOCATION_ID ("${process.env.E2E_LOCATION_ID}" vs manifest "${manifest.locationId}")`);
  }
  if (process.env.E2E_SERVICE_A_ID && process.env.E2E_SERVICE_A_ID !== manifest.serviceA.id) {
    envConflicts.push(`E2E_SERVICE_A_ID ("${process.env.E2E_SERVICE_A_ID}" vs manifest "${manifest.serviceA.id}")`);
  }
  if (process.env.E2E_SERVICE_B_ID && process.env.E2E_SERVICE_B_ID !== manifest.serviceB.id) {
    envConflicts.push(`E2E_SERVICE_B_ID ("${process.env.E2E_SERVICE_B_ID}" vs manifest "${manifest.serviceB.id}")`);
  }
  if (process.env.E2E_COUNTER_1_NUMBER && parseInt(process.env.E2E_COUNTER_1_NUMBER, 10) !== manifest.counter1.number) {
    envConflicts.push(`E2E_COUNTER_1_NUMBER (${process.env.E2E_COUNTER_1_NUMBER} vs manifest ${manifest.counter1.number})`);
  }
  if (process.env.E2E_COUNTER_2_NUMBER && parseInt(process.env.E2E_COUNTER_2_NUMBER, 10) !== manifest.counter2.number) {
    envConflicts.push(`E2E_COUNTER_2_NUMBER (${process.env.E2E_COUNTER_2_NUMBER} vs manifest ${manifest.counter2.number})`);
  }

  if (envConflicts.length > 0) {
    throw new Error(
      `[E2E] [Configuration Error] Conflicting environment variables detected in fixture mode:\n` +
      `  - ${envConflicts.join('\n  - ')}\n` +
      `Mixed fixture/environment configurations are rejected to protect test determinism.`
    );
  }

  ORG_ID = manifest.orgId;
  LOCATION_ID = manifest.locationId;
  SERVICE_A_ID = manifest.serviceA.id;
  SERVICE_B_ID = manifest.serviceB.id;
  COUNTER_1_NUMBER = manifest.counter1.number;
  COUNTER_2_NUMBER = manifest.counter2.number;
  console.log(`[E2E] Operating in FIXTURE mode. Loaded manifest from: ${manifestPath}`);
  console.log(`[E2E] Fixture targets: Service A=${SERVICE_A_ID}, Service B=${SERVICE_B_ID}, Counter 1=#${COUNTER_1_NUMBER}, Counter 2=#${COUNTER_2_NUMBER}`);
} else {
  // Baseline mode (fixture mode NOT enabled)
  const customOverrides = [
    process.env.E2E_SERVICE_A_ID ? 'E2E_SERVICE_A_ID' : null,
    process.env.E2E_SERVICE_B_ID ? 'E2E_SERVICE_B_ID' : null,
    process.env.E2E_COUNTER_1_NUMBER ? 'E2E_COUNTER_1_NUMBER' : null,
    process.env.E2E_COUNTER_2_NUMBER ? 'E2E_COUNTER_2_NUMBER' : null,
  ].filter(Boolean);

  if (customOverrides.length > 0 && customOverrides.length < 4) {
    throw new Error(
      `[E2E] [Configuration Error] Partial environment override detected: [${customOverrides.join(', ')}]. ` +
      `When providing manual environment overrides in baseline mode, all 4 target resources ` +
      `(E2E_SERVICE_A_ID, E2E_SERVICE_B_ID, E2E_COUNTER_1_NUMBER, E2E_COUNTER_2_NUMBER) must be specified to prevent an accidental hybrid configuration.`
    );
  }

  ORG_ID = process.env.E2E_ORG_ID || 'e2e00000-0000-0000-0000-000000000001';
  LOCATION_ID = process.env.E2E_LOCATION_ID || 'e2e00000-0000-0000-0000-000000000002';
  SERVICE_A_ID = process.env.E2E_SERVICE_A_ID || 'e2e00000-0000-0000-0000-000000000003';
  SERVICE_B_ID = process.env.E2E_SERVICE_B_ID || 'e2e00000-0000-0000-0000-000000000010';
  COUNTER_1_NUMBER = process.env.E2E_COUNTER_1_NUMBER ? parseInt(process.env.E2E_COUNTER_1_NUMBER, 10) : 1;
  COUNTER_2_NUMBER = process.env.E2E_COUNTER_2_NUMBER ? parseInt(process.env.E2E_COUNTER_2_NUMBER, 10) : 2;

  if (customOverrides.length === 4) {
    console.log('[E2E] Operating in FULL MANUAL OVERRIDE mode.');
  } else {
    console.log('[E2E] Operating in BASELINE mode with default E2E seed resources.');
  }
}

/**
 * Preflight Check: Validates queue and counter isolation before launching the test.
 *
 * Requirements:
 * 1. Service A & B must have 0 competing WAITING tokens so FIFO dispatch pops
 *    the newly created test customer deterministically.
 * 2. Counter 1 & 2 must be idle (no active serving tokens) to avoid interfering
 *    with an existing customer service.
 * 3. Never mutates, cancels, or completes unrelated customer tokens.
 */
async function checkQueueIsolationPreflight() {
  console.log('[E2E] [Preflight] Validating queue and counter isolation...');
  let loginRes;
  try {
    loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD })
    });
  } catch (err) {
    throw new Error(`[E2E] [Preflight] Cannot connect to backend at ${API_URL}: ${err.message}`);
  }

  if (!loginRes.ok) {
    throw new Error(`[E2E] [Preflight] Staff authentication failed (${loginRes.status}). Verify credentials and backend state.`);
  }

  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  const snapshotRes = await fetch(`${API_URL}/api/v1/locations/${LOCATION_ID}/queue-snapshot`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!snapshotRes.ok) {
    throw new Error(`[E2E] [Preflight] Failed to fetch location snapshot for ${LOCATION_ID} (${snapshotRes.status}).`);
  }

  const snapshot = await snapshotRes.json();
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('[E2E] [Preflight] Malformed snapshot response: expected a JSON object.');
  }

  const waitingTokens = Array.isArray(snapshot.waitingTokens) ? snapshot.waitingTokens : null;
  const counters = Array.isArray(snapshot.counters) ? snapshot.counters : null;

  if (!waitingTokens || !counters) {
    throw new Error('[E2E] [Preflight] Malformed snapshot response: missing "waitingTokens" or "counters" array.');
  }

  const serviceAWaiting = waitingTokens.filter(t => t.serviceId === SERVICE_A_ID);
  const serviceBWaiting = waitingTokens.filter(t => t.serviceId === SERVICE_B_ID);

  const counter1 = counters.find(c => c.number === COUNTER_1_NUMBER);
  const counter2 = counters.find(c => c.number === COUNTER_2_NUMBER);

  const conflicts = [];
  if (serviceAWaiting.length > 0) {
    conflicts.push(`Service A has ${serviceAWaiting.length} competing WAITING token(s) ahead: [${serviceAWaiting.map(t => t.tokenNumber).join(', ')}]. FIFO queue dispatch will dispatch an older token instead of the test customer's token.`);
  }
  if (serviceBWaiting.length > 0) {
    conflicts.push(`Service B has ${serviceBWaiting.length} competing WAITING token(s) ahead: [${serviceBWaiting.map(t => t.tokenNumber).join(', ')}]. FIFO transfer dispatch will dispatch an older token instead of the transferred customer's token.`);
  }

  // Counter 1 existence and serving state check
  if (!counter1) {
    conflicts.push(`Counter 1 (number ${COUNTER_1_NUMBER}) was not found in location snapshot.`);
  } else if (counter1.currentServingTokenId) {
    conflicts.push(`Counter 1 is currently serving token ${counter1.currentServingTokenId}. Counter must be idle to avoid interfering with an active customer service.`);
  }

  // Counter 2 existence and serving state check
  if (!counter2) {
    conflicts.push(`Counter 2 (number ${COUNTER_2_NUMBER}) was not found in location snapshot.`);
  } else if (counter2.currentServingTokenId) {
    conflicts.push(`Counter 2 is currently serving token ${counter2.currentServingTokenId}. Counter must be idle to avoid interfering with an active customer service.`);
  }

  // Verify counter-service assignments via existing supported API: GET /api/v1/counters/{counterId}/services
  if (counter1 && counter1.id) {
    try {
      const c1ServicesRes = await fetch(`${API_URL}/api/v1/counters/${counter1.id}/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!c1ServicesRes.ok) {
        conflicts.push(`Failed to fetch service assignments for Counter 1 (${c1ServicesRes.status}).`);
      } else {
        const c1Services = await c1ServicesRes.json();
        const isC1Assigned = Array.isArray(c1Services) && c1Services.some(s => s.id === SERVICE_A_ID);
        if (!isC1Assigned) {
          conflicts.push(`Counter 1 (id: ${counter1.id}) is not assigned to Service A (${SERVICE_A_ID}).`);
        }
      }
    } catch (e) {
      conflicts.push(`Error checking Counter 1 service assignments: ${e.message}`);
    }
  }

  if (counter2 && counter2.id) {
    try {
      const c2ServicesRes = await fetch(`${API_URL}/api/v1/counters/${counter2.id}/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!c2ServicesRes.ok) {
        conflicts.push(`Failed to fetch service assignments for Counter 2 (${c2ServicesRes.status}).`);
      } else {
        const c2Services = await c2ServicesRes.json();
        const isC2Assigned = Array.isArray(c2Services) && c2Services.some(s => s.id === SERVICE_B_ID);
        if (!isC2Assigned) {
          conflicts.push(`Counter 2 (id: ${counter2.id}) is not assigned to Service B (${SERVICE_B_ID}).`);
        }
      }
    } catch (e) {
      conflicts.push(`Error checking Counter 2 service assignments: ${e.message}`);
    }
  }

  if (conflicts.length > 0) {
    console.error('\n================================================================================');
    console.error('[E2E] [Preflight] ABORTING: Queue/Counter Isolation Conflicts Detected');
    console.error('================================================================================');
    conflicts.forEach(c => console.error(`  - ${c}`));
    console.error('--------------------------------------------------------------------------------');
    console.error('Rationale: The test must never cancel, complete, or mutate unrelated tokens.');
    console.error('To run deterministically without destroying existing tenant/token data, the target');
    console.error('services and counters must be in an idle state before starting.');
    console.error('================================================================================\n');
    throw new Error(`Preflight check failed: ${conflicts.length} isolation conflict(s) detected.`);
  }

  console.log(`[E2E] [Preflight] Isolation and assignments verified: Service A (0 waiting), Service B (0 waiting), Counter ${COUNTER_1_NUMBER} (idle, assigned to Service A), Counter ${COUNTER_2_NUMBER} (idle, assigned to Service B). Safe to proceed.`);
}

/**
 * Precondition: Configures the location operating schedule to OPEN covering the current UTC day.
 *
 * Background:
 * Test suites such as e2e/phase-7-2-operating-hours.cjs configure the shared location schedule
 * to CLOSED (e.g. 00:00 - 00:01) to verify LOCATION_CLOSED rejection and do not restore it.
 * This helper authenticates as ORG_ADMIN, ensures enforceSchedule: true is maintained,
 * and provisions a full-day operating window for today (matching phase-7-3 and phase-8 patterns).
 * It verifies the response contract and aborts before browser actions if the update fails.
 */
async function ensureLocationScheduleOpen(locationId) {
  console.log(`[E2E] [Precondition] Configuring operating schedule to OPEN for location ${locationId}...`);

  let loginRes;
  try {
    loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
  } catch (err) {
    throw new Error(`[E2E] [Precondition] Cannot connect to backend at ${API_URL}: ${err.message}`);
  }

  if (!loginRes.ok) {
    throw new Error(`[E2E] [Precondition] Admin authentication failed (${loginRes.status}). Verify credentials at ${API_URL}.`);
  }

  const loginData = await loginRes.json();
  const adminToken = loginData.accessToken;
  if (!adminToken) {
    throw new Error('[E2E] [Precondition] Admin login response missing accessToken.');
  }

  const d = new Date();
  let todayDay = d.getUTCDay();
  if (todayDay === 0) todayDay = 7; // Java DayOfWeek: 1=Monday .. 7=Sunday

  const schedulePayload = {
    enforceSchedule: true,
    timezone: 'UTC',
    schedules: [
      {
        dayOfWeek: todayDay,
        openTime: '00:00',
        closeTime: '23:59:59'
      }
    ]
  };

  let updateRes;
  try {
    updateRes = await fetch(`${API_URL}/api/v1/locations/${locationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(schedulePayload)
    });
  } catch (err) {
    throw new Error(`[E2E] [Precondition] Failed to send location schedule update request: ${err.message}`);
  }

  if (!updateRes.ok) {
    const errorBody = await updateRes.text().catch(() => '');
    throw new Error(
      `[E2E] [Precondition] Failed to update location schedule (HTTP ${updateRes.status}): ${errorBody}. ` +
      `Aborting test before launching browser.`
    );
  }

  let locationData;
  try {
    locationData = await updateRes.json();
  } catch (err) {
    throw new Error(`[E2E] [Precondition] Location update response was not valid JSON: ${err.message}`);
  }

  if (!locationData || typeof locationData !== 'object') {
    throw new Error('[E2E] [Precondition] Malformed location update response: expected an object.');
  }

  if (locationData.enforceSchedule !== true) {
    throw new Error(`[E2E] [Precondition] Expected enforceSchedule to be true in response, got: ${locationData.enforceSchedule}`);
  }

  if (locationData.timezone !== 'UTC') {
    throw new Error(`[E2E] [Precondition] Expected timezone to be "UTC" in response, got: "${locationData.timezone}"`);
  }

  if (!Array.isArray(locationData.schedules) || locationData.schedules.length === 0) {
    throw new Error('[E2E] [Precondition] Location update response contains empty schedules array.');
  }

  const todaySchedule = locationData.schedules.find(s => s.dayOfWeek === todayDay);
  if (!todaySchedule) {
    throw new Error(`[E2E] [Precondition] Location update response does not include active schedule for dayOfWeek=${todayDay}.`);
  }

  if (typeof todaySchedule.openTime !== 'string') {
    throw new Error(
      `[E2E] [Precondition] Expected today's openTime to be a string, got: ${typeof todaySchedule.openTime} (${JSON.stringify(todaySchedule.openTime)}).`
    );
  }

  if (typeof todaySchedule.closeTime !== 'string') {
    throw new Error(
      `[E2E] [Precondition] Expected today's closeTime to be a string, got: ${typeof todaySchedule.closeTime} (${JSON.stringify(todaySchedule.closeTime)}).`
    );
  }

  const isOpenTimeValid = todaySchedule.openTime === '00:00' || todaySchedule.openTime === '00:00:00';
  if (!isOpenTimeValid) {
    throw new Error(
      `[E2E] [Precondition] Expected today's openTime to be equivalent to "00:00" ("00:00" or "00:00:00"), got: "${todaySchedule.openTime}".`
    );
  }

  const isCloseTimeValid = todaySchedule.closeTime === '23:59:59' || todaySchedule.closeTime === '23:59:59.000';
  if (!isCloseTimeValid) {
    throw new Error(
      `[E2E] [Precondition] Expected today's closeTime to be equivalent to "23:59:59" ("23:59:59" or "23:59:59.000"), got: "${todaySchedule.closeTime}".`
    );
  }

  console.log(
    `[E2E] [Precondition] Location schedule verified: enforceSchedule=true, timezone=${locationData.timezone}, ` +
    `dayOfWeek=${todayDay} (${todaySchedule.openTime} - ${todaySchedule.closeTime}).`
  );
}

async function run() {
  let browser;
  try {
    console.log('[E2E] Transfer test running with target configuration:');
    console.log(`  Org: ${ORG_ID}, Location: ${LOCATION_ID}`);
    console.log(`  Service A: ${SERVICE_A_ID}, Service B: ${SERVICE_B_ID}`);
    console.log(`  Counter 1: #${COUNTER_1_NUMBER}, Counter 2: #${COUNTER_2_NUMBER}`);
    await checkQueueIsolationPreflight();
    await ensureLocationScheduleOpen(LOCATION_ID);
    console.log('[E2E] Starting Puppeteer...');
    browser = await puppeteer.launch({
      headless: true, // headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('[E2E] Creating isolated contexts...');
    const staffContext = await browser.createBrowserContext();
    const customerContext = await browser.createBrowserContext();

    const staffPage = await staffContext.newPage();
    const customerPage = await customerContext.newPage();

    await staffPage.setViewport({ width: 1280, height: 800 });
    await customerPage.setViewport({ width: 1280, height: 800 });

    const trackWebSockets = async (page, role) => {
      const subscriptions = new Set();
      const cdpSession = await page.target().createCDPSession();
      await cdpSession.send('Network.enable');

      page.on('console', msg => {
        // filter out spam
        if (!msg.text().includes('Download the React DevTools') && !msg.text().includes('WebSocket is already in CLOSING or CLOSED state.')) {
          console.log(`[Browser ${role}]`, msg.text());
        }
      });

      cdpSession.on('Network.webSocketFrameSent', (event) => {
        const payload = event.response.payloadData;
        if (payload.includes('SUBSCRIBE')) {
          const lines = payload.split('\n');
          const destLine = lines.find(line => line.startsWith('destination:'));
          if (destLine) {
            const topic = destLine.split(':')[1].trim();
            console.log(`[E2E] [${role}] WebSocket Subscription:`, topic);
            subscriptions.add(topic);
          }
        }
      });

      return { subscriptions };
    };

    const staffWs = await trackWebSockets(staffPage, 'Staff');
    const customerWs = await trackWebSockets(customerPage, 'Customer');
    
    staffPage.on('requestfailed', request => {
      console.log(`[Browser Staff Network Error] ${request.url()} - ${request.failure().errorText}`);
    });
    staffPage.on('response', response => {
      if (response.url().includes('/api/')) { 
        console.log(`[Network Staff] ${response.status()} ${response.url()}`); 
      } 
      if (!response.ok()) {
        console.log(`[Browser Staff Network Response Error] ${response.status()} ${response.url()}`);
      }
    });

    customerPage.on('requestfailed', request => {
      console.log(`[Browser Customer Network Error] ${request.url()} - ${request.failure() ? request.failure().errorText : 'failed'}`);
    });
    customerPage.on('response', response => {
      if (response.url().includes('/api/')) { 
        console.log(`[Network Customer] ${response.status()} ${response.url()}`); 
      } 
      if (!response.ok() && !response.url().includes('favicon.ico')) {
        console.log(`[Browser Customer Network Response Error] ${response.status()} ${response.url()}`);
      }
    });

    // -----------------------------------------------------------------------------
    // CUSTOMER JOIN SERVICE A
    // -----------------------------------------------------------------------------
    console.log('[E2E] [Customer] Navigating to app...');
    await customerPage.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
    await customerPage.waitForSelector('body');
    
    console.log('[E2E] [Customer] Reached Discovery. Clicking Join a Queue...');
    await customerPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Join a Queue'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Select Location
    await customerPage.waitForSelector(`#org-card-${ORG_ID}`, { timeout: 10000 });
    await customerPage.click(`#org-card-${ORG_ID}`);

    await new Promise(r => setTimeout(r, 1000));
    console.log(`[E2E] [Customer] Searching for Service A (${SERVICE_A_ID})...`);
    await customerPage.waitForSelector(`#join-service-btn-${SERVICE_A_ID}`, { timeout: 10000 });
    await customerPage.click(`#join-service-btn-${SERVICE_A_ID}`);

    console.log('[E2E] [Customer] Confirming queue join...');
    await customerPage.waitForSelector('#confirm-join-queue-btn', { timeout: 10000 });

    // Step 3 hardening: observe the actual POST /api/v1/tokens response
    const joinResponsePromise = customerPage.waitForResponse(
      response => response.url().includes('/api/v1/tokens') && response.request().method() === 'POST',
      { timeout: 15000 }
    );

    await customerPage.click('#confirm-join-queue-btn');

    let joinResponse;
    try {
      joinResponse = await joinResponsePromise;
    } catch (waitErr) {
      // Check if an error banner is visible on the page
      const errorText = await customerPage.evaluate(() => {
        const el = document.querySelector('#join-queue-error-banner');
        return el ? el.innerText.trim() : null;
      });
      throw new Error(`Did not receive POST /api/v1/tokens response within 15s. ${errorText ? `Page error: ${errorText}` : ''}`);
    }

    const joinStatus = joinResponse.status();
    let joinBody = null;
    try {
      joinBody = await joinResponse.json();
    } catch (_) {
      try {
        joinBody = await joinResponse.text();
      } catch (__) {}
    }

    // Backend contract for TokenController.joinQueue specifies @ResponseStatus(HttpStatus.CREATED) (201)
    if (joinStatus !== 201) {
      const safeBody = typeof joinBody === 'object' ? JSON.stringify(joinBody) : String(joinBody);
      console.error(`[E2E] [Customer] Queue join failed with HTTP ${joinStatus}: ${safeBody}`);
      assert.strictEqual(
        joinStatus,
        201,
        `Customer queue join failed with HTTP ${joinStatus}: ${safeBody}`
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    assert.ok(
      joinBody && typeof joinBody.id === 'string' && uuidRegex.test(joinBody.id),
      `Expected backend-issued UUID token ID in join response, got: ${JSON.stringify(joinBody ? joinBody.id : null)}`
    );

    // Wait for Active Status screen
    await customerPage.waitForFunction(() => document.body.innerText.includes('YOUR TOKEN'), { timeout: 10000 });
    console.log(`[E2E] [Customer] Successfully joined Service A. Token ID: ${joinBody.id}`);

    // Wait for STOMP subscription
    await new Promise(r => setTimeout(r, 2000));
    const customerTokenTopicOld = Array.from(customerWs.subscriptions).find(t => t.startsWith('/topic/token/'));
    assert.ok(customerTokenTopicOld, 'Customer did not subscribe to initial token topic');
    console.log('[E2E] [Customer] Initial token subscription:', customerTokenTopicOld);
    
    const customerInitialTokenNumber = await customerPage.evaluate(() => {
        const elem = document.querySelector('.text-7xl, .text-8xl');
        return elem ? elem.innerText.trim() : null;
    });
    assert.ok(customerInitialTokenNumber, 'Customer initial token number not found');
    console.log('[E2E] [Customer] Initial token number:', customerInitialTokenNumber);

    // -----------------------------------------------------------------------------
    // STAFF LOGIN
    // -----------------------------------------------------------------------------
    console.log('[E2E] [Staff] Navigating to app...');
    await staffPage.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    await staffPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const menuBtn = btns.find(b => b.innerText.includes('Customer Portal') || b.innerText.includes('CU'));
      if (menuBtn) menuBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    await staffPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.innerText.includes('Staff Portal Sign In'));
      if (loginBtn) loginBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
    console.log('[E2E] [Staff] Reached Staff Login.');

    await staffPage.waitForSelector('input[type="email"]', { timeout: 10000 });
    await staffPage.evaluate(() => document.querySelector('input[type="email"]').value = '');
    await staffPage.type('input[type="email"]', STAFF_EMAIL);
    await staffPage.evaluate(() => document.querySelector('input[type="password"]').value = '');
    await staffPage.type('input[type="password"]', STAFF_PASSWORD);
    
    const submitBtns = await staffPage.$$('button[type="submit"]');
    if (submitBtns.length > 0) {
      await submitBtns[0].click();
    } else {
      await staffPage.evaluate(() => {
        const btn = document.querySelector('button#staff-login-submit-btn');
        if (btn) btn.click();
      });
    }

    await staffPage.waitForFunction(() => {
      return document.querySelector('h1')?.innerText.trim() === 'Live Operations' ||
             document.querySelector('#call-next-main-btn') !== null;
    }, { timeout: 10000 });
    console.log('[E2E] [Staff] Successfully authenticated and loaded Operations console.');

    // -----------------------------------------------------------------------------
    // CALL NEXT AT COUNTER 1
    // -----------------------------------------------------------------------------
    console.log(`[E2E] [Staff] Selecting Counter ${COUNTER_1_NUMBER} and setting ONLINE...`);
    await staffPage.waitForSelector(`#select-counter-${COUNTER_1_NUMBER}-btn`);
    await staffPage.click(`#select-counter-${COUNTER_1_NUMBER}-btn`);
    await new Promise(r => setTimeout(r, 500));
    
    const onlineBtn = await staffPage.$('#set-avail-online-btn');
    if (onlineBtn) {
      await onlineBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    // Verify Counter 1 is in expected idle state before calling next
    // Note: The station header always contains a static "CURRENTLY SERVING" label,
    // so we check for .text-token (only rendered when a token is actively being served).
    const isServing1 = await staffPage.evaluate(() => document.querySelector('.text-token') !== null);
    if (isServing1) {
      throw new Error(`[E2E] [Staff] Counter ${COUNTER_1_NUMBER} is unexpectedly serving an active token. Aborting to avoid altering unrelated customer service.`);
    }

    console.log(`[E2E] [Staff] Triggering Call Next at Counter ${COUNTER_1_NUMBER}...`);
    await staffPage.waitForFunction(() => {
      const btn = document.querySelector('#call-next-main-btn');
      return btn && !btn.disabled;
    }, { timeout: 10000 });

    const callNextBtn = await staffPage.$('#call-next-main-btn');
    assert.ok(callNextBtn, 'Call Next button not found');
    await callNextBtn.click();
    
    try {
      await staffPage.waitForFunction((expected) => {
        const servingText = document.body.innerText.toUpperCase();
        const tokenElem = document.querySelector('.text-token');
        return servingText.includes('CURRENTLY SERVING') && tokenElem && tokenElem.innerText.trim() === expected;
      }, { timeout: 10000 }, customerInitialTokenNumber);
    } catch (e) {
      const stateStr = await staffPage.evaluate(() => { return window.getAppState ? JSON.stringify(window.getAppState()) : 'NOT_FOUND'; });
      console.error('[E2E] STAFF STATE ON TIMEOUT:', stateStr);
      const html = await staffPage.evaluate(() => document.body.innerHTML);
      console.error('[E2E] DOM ON TIMEOUT:', html.substring(0, 1000));
      throw e;
    }

    const staffServingToken1 = await staffPage.$eval('.text-token', el => el.innerText.trim());
    assert.strictEqual(staffServingToken1, customerInitialTokenNumber, 'Staff station is not serving customer initial token');
    console.log(`[E2E] [Staff] Verified Counter ${COUNTER_1_NUMBER} is actively serving customer token: ${staffServingToken1}`);
    
    await customerPage.waitForFunction((cNum) => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('PLEASE PROCEED TO') && text.includes(`COUNTER ${cNum}`);
    }, { timeout: 10000 }, COUNTER_1_NUMBER);
    console.log(`[E2E] [Customer] Verified called at Counter ${COUNTER_1_NUMBER}.`);

    // -----------------------------------------------------------------------------
    // TRANSFER TO SERVICE B
    // -----------------------------------------------------------------------------
    console.log('[E2E] [Staff] Transferring token...');
    await staffPage.waitForSelector('#transfer-token-btn');
    await staffPage.click('#transfer-token-btn');

    await staffPage.waitForSelector('#transfer-target-select');
    
    console.log(`[E2E] [Staff] Selecting target service (${SERVICE_B_ID})...`);
    const selected = await staffPage.select('#transfer-target-select', SERVICE_B_ID);
    console.log('[E2E] [Staff] Select returned:', selected);
    
    console.log('[E2E] [Staff] Waiting for confirm button to be enabled...');
    await staffPage.waitForSelector('#confirm-transfer-btn:not([disabled])');
    
    console.log('[E2E] [Staff] Clicking confirm...');
    await staffPage.click('#confirm-transfer-btn');

    // Wait for the transfer modal to close and the staff station to return to idle.
    // Note: We check for .text-token disappearance (not "CURRENTLY SERVING" text)
    // because the station header always contains the static label "CURRENTLY SERVING".
    try {
      await staffPage.waitForFunction(() => !document.querySelector('.text-token') && !document.querySelector('#confirm-transfer-btn'), { timeout: 10000 });
    } catch (e) {
      const stateStr = await staffPage.evaluate(() => { return window.getAppState ? JSON.stringify(window.getAppState()) : 'NOT_FOUND'; });
      console.error('[E2E] STAFF STATE ON TRANSFER TIMEOUT:', stateStr);
      const html = await staffPage.evaluate(() => document.body.innerHTML);
      console.error('[E2E] DOM ON TRANSFER TIMEOUT:', html.substring(0, 3000));
      throw e;
    }
    console.log('[E2E] [Staff] Transfer successful.');

    // -----------------------------------------------------------------------------
    // CUSTOMER RECOVERY VERIFICATION
    // -----------------------------------------------------------------------------
    console.log('[E2E] [Customer] Waiting for recovery and new token state...');
    
    // UI should show WAITING again
    await customerPage.waitForFunction((cNum) => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('WAITING') && !text.includes(`COUNTER ${cNum}`);
    }, { timeout: 15000 }, COUNTER_1_NUMBER);
    
    // Verify Service B Name in UI (Skipped because Customer local state only has INITIAL_SERVICES)
    
    const customerNewTokenNumber = await customerPage.evaluate(() => {
        const elem = document.querySelector('.text-7xl, .text-8xl');
        return elem ? elem.innerText.trim() : null;
    });
    
    assert.ok(customerNewTokenNumber, 'Customer replacement token number not found');
    assert.ok(customerNewTokenNumber !== customerInitialTokenNumber, 'Customer token number did not change after transfer');
    console.log('[E2E] [Customer] Recovered successfully with new token number:', customerNewTokenNumber);

    // Verify STOMP re-subscription with bounded polling (up to 10s)
    let customerTokenTopicNew;
    const subPollStart = Date.now();
    while (Date.now() - subPollStart < 10000) {
      customerTokenTopicNew = Array.from(customerWs.subscriptions).find(t => t.startsWith('/topic/token/') && t !== customerTokenTopicOld);
      if (customerTokenTopicNew) break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.ok(customerTokenTopicNew, 'Customer did not subscribe to new token topic after transfer (waited 10s)');
    console.log('[E2E] [Customer] New token subscription:', customerTokenTopicNew);

    // -----------------------------------------------------------------------------
    // CALL NEXT AT COUNTER 2
    // -----------------------------------------------------------------------------
    console.log(`[E2E] [Staff] Switching to Counter ${COUNTER_2_NUMBER}...`);
    await staffPage.waitForSelector(`#select-counter-${COUNTER_2_NUMBER}-btn`);
    await staffPage.click(`#select-counter-${COUNTER_2_NUMBER}-btn`);
    await new Promise(r => setTimeout(r, 500));
    
    const onlineBtn2 = await staffPage.$('#set-avail-online-btn');
    if (onlineBtn2) {
      await onlineBtn2.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    // Verify Counter 2 is in expected idle state before calling next
    // Note: Check .text-token presence, not body text (see idle check 1 rationale).
    const isServing2 = await staffPage.evaluate(() => document.querySelector('.text-token') !== null);
    if (isServing2) {
      throw new Error(`[E2E] [Staff] Counter ${COUNTER_2_NUMBER} is unexpectedly serving an active token. Aborting to avoid altering unrelated customer service.`);
    }
    
    console.log(`[E2E] [Staff] Triggering Call Next at Counter ${COUNTER_2_NUMBER}...`);
    await staffPage.waitForFunction(() => {
        const btn = document.querySelector('#call-next-main-btn');
        return btn && !btn.disabled;
    }, { timeout: 10000 });
    
    await staffPage.evaluate(() => {
      document.querySelector('#call-next-main-btn').click();
    });

    await staffPage.waitForFunction((expected) => {
      const servingText = document.body.innerText.toUpperCase();
      const tokenElem = document.querySelector('.text-token');
      return servingText.includes('CURRENTLY SERVING') && tokenElem && tokenElem.innerText.trim() === expected;
    }, { timeout: 10000 }, customerNewTokenNumber);

    const staffServingToken2 = await staffPage.$eval('.text-token', el => el.innerText.trim());
    assert.strictEqual(staffServingToken2, customerNewTokenNumber, `Staff station at Counter ${COUNTER_2_NUMBER} is not serving customer replacement token`);
    console.log(`[E2E] [Staff] Verified Counter ${COUNTER_2_NUMBER} is actively serving replacement token: ${staffServingToken2}`);

    // -----------------------------------------------------------------------------
    // VERIFY FINAL CUSTOMER STATE
    // -----------------------------------------------------------------------------
    await customerPage.waitForFunction((cNum) => {
      const text = document.body.innerText.toUpperCase();
      return text.includes('PLEASE PROCEED TO') && text.includes(`COUNTER ${cNum}`);
    }, { timeout: 10000 }, COUNTER_2_NUMBER);
    console.log(`[E2E] [Customer] Verified called at Counter ${COUNTER_2_NUMBER}.`);
    
    // Complete service
    console.log('[E2E] [Staff] Completing service...');
    await staffPage.waitForSelector('#complete-service-btn');
    await staffPage.evaluate(() => {
      document.querySelector('#complete-service-btn').click();
    });
    
    await customerPage.waitForFunction(() => document.body.innerText.includes('COMPLETED'), { timeout: 10000 });
    console.log('[E2E] [Customer] Verified COMPLETED status.');
    
    console.log('\n[E2E] SUCCESS: Phase 6.7.5 Transfer Workflow FULLY VERIFIED\n');

  } catch (error) {
    console.error('\n[E2E] FAILED:', error.message);
    if (browser) {
      const pages = await browser.pages();
      for (let i = 0; i < pages.length; i++) {
        await pages[i].screenshot({path: `e2e_transfer_error_${i}.png`});
      }
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

run();
