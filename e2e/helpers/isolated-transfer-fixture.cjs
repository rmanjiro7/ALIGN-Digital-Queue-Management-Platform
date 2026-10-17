/**
 * ALIGN Phase 6 — Isolated Transfer Test Fixture Helper
 *
 * Provides safe setup and teardown for dedicated, isolated transfer-test
 * services, queues, and counters without altering existing baseline E2E data
 * or pilot tenant records.
 *
 * ARCHITECTURAL SAFETY NOTE:
 * Core operational resources (organizations, locations, services, queues, counters)
 * do not have DELETE endpoints in the ALIGN backend to protect audit integrity
 * and referential consistency. Teardown therefore administrative deactivates resources
 * rather than physically deleting them:
 *   1. Removes counter-service assignments via DELETE /api/v1/counters/{cId}/services/{sId}
 *   2. Sets counters OFFLINE and CLOSED
 *   3. Sets queues to CLOSED
 *   4. Disables services (enabled: false), removing them from customer discovery
 *
 * SAFETY RULES:
 * - Creates only new resources; never mutates existing services, queues, or counters.
 * - Tracks created resources in an exact-ID manifest file.
 * - Refuses to provision duplicate fixtures if an existing manifest is present.
 * - Teardown operates EXCLUSIVELY on IDs stored in the manifest (never by name lookup).
 * - Never runs SQL mutations, database truncation, or reseeding.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_API_URL = process.env.API_URL || 'http://localhost:8080';
const DEFAULT_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e.admin@align.local';
const DEFAULT_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'e2e-password';
const DEFAULT_LOCATION_ID = process.env.E2E_LOCATION_ID || 'e2e00000-0000-0000-0000-000000000002';
const DEFAULT_ORG_ID = process.env.E2E_ORG_ID || 'e2e00000-0000-0000-0000-000000000001';
const DEFAULT_MANIFEST_PATH = path.join(__dirname, '.isolated-transfer-fixture-manifest.json');

/**
 * Authenticates as administrator and returns JWT access token.
 */
async function authenticateAdmin(apiUrl, email, password) {
  let loginRes;
  try {
    loginRes = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  } catch (err) {
    throw new Error(`[Fixture] Cannot connect to backend at ${apiUrl}: ${err.message}`);
  }

  if (!loginRes.ok) {
    throw new Error(`[Fixture] Admin authentication failed (${loginRes.status}). Verify credentials at ${apiUrl}.`);
  }

  const data = await loginRes.json();
  if (!data || !data.accessToken) {
    throw new Error('[Fixture] Login response missing accessToken.');
  }

  return data.accessToken;
}

/**
 * Sets up dedicated isolated transfer resources via REST APIs:
 *   - Service A' + Queue A' (prefix TA)
 *   - Service B' + Queue B' (prefix TB)
 *   - Counter 1' + Counter 2' (using next available counter numbers)
 *   - Counter-Service assignments
 *
 * Records all created resource IDs into a manifest file.
 */
async function setupIsolatedTransferResources(options = {}) {
  const apiUrl = options.apiUrl || DEFAULT_API_URL;
  const adminEmail = options.adminEmail || DEFAULT_ADMIN_EMAIL;
  const adminPassword = options.adminPassword || DEFAULT_ADMIN_PASSWORD;
  const locationId = options.locationId || DEFAULT_LOCATION_ID;
  const orgId = options.orgId || DEFAULT_ORG_ID;
  const manifestPath = options.manifestPath || process.env.FIXTURE_MANIFEST_PATH || DEFAULT_MANIFEST_PATH;

  console.log('[Fixture] [Setup] Checking for existing fixture manifest...');
  if (fs.existsSync(manifestPath)) {
    let existing;
    try {
      existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {}

    if (existing && existing.status === 'DEACTIVATED_WITH_UNRESOLVED_OUTCOME') {
      throw new Error(
        `[Fixture] Archived audit record found at "${manifestPath}". ` +
        `Refusing to overwrite an archived unresolved manifest. Specify a distinct manifestPath or archive it elsewhere.`
      );
    }

    throw new Error(
      `[Fixture] Existing fixture manifest found at "${manifestPath}". Refusing to create duplicate fixtures. ` +
      `Run teardownIsolatedTransferResources() first before provisioning a new fixture.`
    );
  }

  const fixtureId = `transfer-fixture-${Date.now()}`;
  const manifest = {
    fixtureId,
    status: 'PROVISIONING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    apiUrl,
    orgId,
    locationId,
    serviceA: null,
    queueA: null,
    serviceB: null,
    queueB: null,
    counter1: null,
    counter2: null,
    assignments: [],
    unresolvedOutcome: null
  };

  const persistManifest = () => {
    manifest.updatedAt = new Date().toISOString();
    const tmpPath = `${manifestPath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf8');
    fs.renameSync(tmpPath, manifestPath);
  };

  console.log(`[Fixture] [Setup] Authenticating admin as ${adminEmail}...`);
  const token = await authenticateAdmin(apiUrl, adminEmail, adminPassword);
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Determine safe unused counter numbers
  console.log(`[Fixture] [Setup] Fetching existing counters for location ${locationId}...`);
  const countersRes = await fetch(`${apiUrl}/api/v1/counters?locationId=${locationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!countersRes.ok) {
    throw new Error(`[Fixture] Failed to list counters for location ${locationId} (${countersRes.status}).`);
  }

  const existingCounters = await countersRes.json();
  const existingNumbers = new Set(Array.isArray(existingCounters) ? existingCounters.map(c => c.number) : []);

  let counter1Number = options.counter1Number;
  let counter2Number = options.counter2Number;

  if (!counter1Number) {
    let candidate = 3;
    while (existingNumbers.has(candidate)) candidate++;
    counter1Number = candidate;
    existingNumbers.add(candidate);
  }

  if (!counter2Number) {
    let candidate = counter1Number + 1;
    while (existingNumbers.has(candidate)) candidate++;
    counter2Number = candidate;
  }

  console.log(`[Fixture] [Setup] Selected counter numbers: Counter 1 => ${counter1Number}, Counter 2 => ${counter2Number}`);

  // 1. Create Service A
  console.log('[Fixture] [Setup] Creating isolated Service A...');
  let serviceA;
  try {
    const serviceARes = await fetch(`${apiUrl}/api/v1/services`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        locationId,
        name: options.serviceAName || 'Isolated Transfer Service A',
        description: 'Dedicated isolated service A for automated transfer testing',
        icon: 'info',
        isFastTrack: false,
        preparationGuidance: 'None'
      })
    });
    if (!serviceARes.ok) {
      throw new Error(`Failed to create Service A (${serviceARes.status}): ${await serviceARes.text()}`);
    }
    serviceA = await serviceARes.json();
    if (!serviceA || !serviceA.id) {
      throw new Error('Create Service A response did not contain a valid service ID.');
    }
    manifest.serviceA = { id: serviceA.id, name: serviceA.name };
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'CREATE_SERVICE_A',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 1 (Create Service A): ${err.message}`);
  }

  // 2. Create Queue A
  console.log(`[Fixture] [Setup] Creating isolated Queue A for Service A (${serviceA.id})...`);
  let queueA;
  try {
    const queueARes = await fetch(`${apiUrl}/api/v1/queues`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        serviceId: serviceA.id,
        name: 'Isolated Transfer Queue A',
        tokenPrefix: 'TA',
        maxCapacity: 100
      })
    });
    if (!queueARes.ok) {
      throw new Error(`Failed to create Queue A (${queueARes.status}): ${await queueARes.text()}`);
    }
    queueA = await queueARes.json();
    if (!queueA || !queueA.id) {
      throw new Error('Create Queue A response did not contain a valid queue ID.');
    }
    manifest.queueA = { id: queueA.id, name: queueA.name };
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'CREATE_QUEUE_A',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 2 (Create Queue A): ${err.message}`);
  }

  // 3. Create Service B
  console.log('[Fixture] [Setup] Creating isolated Service B...');
  let serviceB;
  try {
    const serviceBRes = await fetch(`${apiUrl}/api/v1/services`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        locationId,
        name: options.serviceBName || 'Isolated Transfer Service B',
        description: 'Dedicated isolated service B for automated transfer testing',
        icon: 'star',
        isFastTrack: false,
        preparationGuidance: 'None'
      })
    });
    if (!serviceBRes.ok) {
      throw new Error(`Failed to create Service B (${serviceBRes.status}): ${await serviceBRes.text()}`);
    }
    serviceB = await serviceBRes.json();
    if (!serviceB || !serviceB.id) {
      throw new Error('Create Service B response did not contain a valid service ID.');
    }
    manifest.serviceB = { id: serviceB.id, name: serviceB.name };
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'CREATE_SERVICE_B',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 3 (Create Service B): ${err.message}`);
  }

  // 4. Create Queue B
  console.log(`[Fixture] [Setup] Creating isolated Queue B for Service B (${serviceB.id})...`);
  let queueB;
  try {
    const queueBRes = await fetch(`${apiUrl}/api/v1/queues`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        serviceId: serviceB.id,
        name: 'Isolated Transfer Queue B',
        tokenPrefix: 'TB',
        maxCapacity: 100
      })
    });
    if (!queueBRes.ok) {
      throw new Error(`Failed to create Queue B (${queueBRes.status}): ${await queueBRes.text()}`);
    }
    queueB = await queueBRes.json();
    if (!queueB || !queueB.id) {
      throw new Error('Create Queue B response did not contain a valid queue ID.');
    }
    manifest.queueB = { id: queueB.id, name: queueB.name };
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'CREATE_QUEUE_B',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 4 (Create Queue B): ${err.message}`);
  }

  // 5. Create Counter 1
  console.log(`[Fixture] [Setup] Creating Counter 1 (number ${counter1Number})...`);
  let counter1;
  try {
    const counter1Res = await fetch(`${apiUrl}/api/v1/counters`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        locationId,
        number: counter1Number,
        name: `Isolated Counter ${counter1Number}`
      })
    });
    if (!counter1Res.ok) {
      throw new Error(`Failed to create Counter 1 (${counter1Res.status}): ${await counter1Res.text()}`);
    }
    counter1 = await counter1Res.json();
    if (!counter1 || !counter1.id) {
      throw new Error('Create Counter 1 response did not contain a valid counter ID.');
    }
    manifest.counter1 = { id: counter1.id, number: counter1.number };
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'CREATE_COUNTER_1',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 5 (Create Counter 1): ${err.message}`);
  }

  // 6. Create Counter 2
  console.log(`[Fixture] [Setup] Creating Counter 2 (number ${counter2Number})...`);
  let counter2;
  try {
    const counter2Res = await fetch(`${apiUrl}/api/v1/counters`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        locationId,
        number: counter2Number,
        name: `Isolated Counter ${counter2Number}`
      })
    });
    if (!counter2Res.ok) {
      throw new Error(`Failed to create Counter 2 (${counter2Res.status}): ${await counter2Res.text()}`);
    }
    counter2 = await counter2Res.json();
    if (!counter2 || !counter2.id) {
      throw new Error('Create Counter 2 response did not contain a valid counter ID.');
    }
    manifest.counter2 = { id: counter2.id, number: counter2.number };
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'CREATE_COUNTER_2',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 6 (Create Counter 2): ${err.message}`);
  }

  // 7. Assign Counter 1 to Service A
  console.log(`[Fixture] [Setup] Assigning Counter ${counter1Number} (${counter1.id}) to Service A (${serviceA.id})...`);
  try {
    const assign1Res = await fetch(`${apiUrl}/api/v1/counters/${counter1.id}/services/${serviceA.id}`, {
      method: 'POST',
      headers: authHeaders
    });
    if (!assign1Res.ok && assign1Res.status !== 201) {
      throw new Error(`Failed to assign Counter 1 to Service A (${assign1Res.status}): ${await assign1Res.text()}`);
    }
    manifest.assignments.push({ counterId: counter1.id, serviceId: serviceA.id });
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'ASSIGN_COUNTER_1_TO_SERVICE_A',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 7 (Assign Counter 1): ${err.message}`);
  }

  // 8. Assign Counter 2 to Service B
  console.log(`[Fixture] [Setup] Assigning Counter ${counter2Number} (${counter2.id}) to Service B (${serviceB.id})...`);
  try {
    const assign2Res = await fetch(`${apiUrl}/api/v1/counters/${counter2.id}/services/${serviceB.id}`, {
      method: 'POST',
      headers: authHeaders
    });
    if (!assign2Res.ok && assign2Res.status !== 201) {
      throw new Error(`Failed to assign Counter 2 to Service B (${assign2Res.status}): ${await assign2Res.text()}`);
    }
    manifest.assignments.push({ counterId: counter2.id, serviceId: serviceB.id });
    persistManifest();
  } catch (err) {
    manifest.status = 'PARTIAL_SETUP_FAILURE';
    manifest.unresolvedOutcome = {
      step: 'ASSIGN_COUNTER_2_TO_SERVICE_B',
      failedAt: new Date().toISOString(),
      error: err.message
    };
    try { persistManifest(); } catch (e) {}
    throw new Error(`[Fixture] Setup failed at step 8 (Assign Counter 2): ${err.message}`);
  }

  // Finalize manifest upon complete success
  manifest.status = 'COMPLETE';
  manifest.unresolvedOutcome = null;
  persistManifest();
  console.log(`[Fixture] [Setup] Successfully provisioned isolated fixture. Manifest finalized at "${manifestPath}".`);

  return manifest;
}

/**
 * Safely deactivates isolated transfer test resources using ONLY IDs recorded
 * in the fixture manifest.
 *
 * Teardown actions:
 *   1. Deletes counter-service assignments via supported DELETE endpoint
 *   2. Sets counters OFFLINE and CLOSED
 *   3. Sets queues to CLOSED
 *   4. Sets services to disabled (enabled: false)
 *   5. Removes manifest file ONLY upon complete deactivation
 */
async function teardownIsolatedTransferResources(options = {}) {
  const apiUrl = options.apiUrl || DEFAULT_API_URL;
  const adminEmail = options.adminEmail || DEFAULT_ADMIN_EMAIL;
  const adminPassword = options.adminPassword || DEFAULT_ADMIN_PASSWORD;
  const manifestPath = options.manifestPath || process.env.FIXTURE_MANIFEST_PATH || DEFAULT_MANIFEST_PATH;

  console.log(`[Fixture] [Teardown] Checking for manifest at "${manifestPath}"...`);
  if (!fs.existsSync(manifestPath)) {
    if (options.ignoreMissing) {
      console.log('[Fixture] [Teardown] No manifest found. Nothing to tear down.');
      return null;
    }
    throw new Error(`[Fixture] [Teardown] Manifest file not found at "${manifestPath}". Cannot safely identify resources to deactivate.`);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    throw new Error(`[Fixture] [Teardown] Failed to parse manifest at "${manifestPath}": ${err.message}`);
  }

  if (manifest && manifest.status === 'DEACTIVATED_WITH_UNRESOLVED_OUTCOME') {
    console.log(
      `[Fixture] [Teardown] Manifest at "${manifestPath}" is an archived audit record that has already been deactivated.`
    );
    return { success: true, deactivatedManifest: manifest, alreadyArchived: true };
  }

  console.log(`[Fixture] [Teardown] Authenticating admin as ${adminEmail}...`);
  const token = await authenticateAdmin(apiUrl, adminEmail, adminPassword);
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  if (manifest.unresolvedOutcome) {
    console.warn(`[Fixture] [Teardown] Manifest indicates an unresolved provisioning outcome during setup:`, manifest.unresolvedOutcome);
    console.warn(`[Fixture] [Teardown] Proceeding with exact-ID deactivation for all successfully recorded resources.`);
  }

  const failures = [];

  const recordFailure = async (operation, resourceId, res, error) => {
    let body = '';
    if (res) {
      try {
        body = (await res.text()).trim().substring(0, 500);
      } catch (e) {
        body = '<unable to read response body>';
      }
    }
    failures.push({
      operation,
      resourceId,
      status: res ? res.status : 'NETWORK_ERROR',
      responseBody: body || (error ? error.message : '<no response body>')
    });
  };

  // 1. Remove counter service assignments (404 is acceptable for absent relations)
  if (Array.isArray(manifest.assignments)) {
    for (const assignment of manifest.assignments) {
      const resourceDesc = `Counter ${assignment.counterId} -> Service ${assignment.serviceId}`;
      console.log(`[Fixture] [Teardown] Removing assignment: ${resourceDesc}...`);
      try {
        const delRes = await fetch(`${apiUrl}/api/v1/counters/${assignment.counterId}/services/${assignment.serviceId}`, {
          method: 'DELETE',
          headers: authHeaders
        });
        if (!delRes.ok && delRes.status !== 404) {
          await recordFailure('DELETE_COUNTER_ASSIGNMENT', resourceDesc, delRes);
        }
      } catch (err) {
        await recordFailure('DELETE_COUNTER_ASSIGNMENT', resourceDesc, null, err);
      }
    }
  }

  // 2. Deactivate counters (404 is treated as unresolved failure, not success)
  const countersToDeactivate = [manifest.counter1, manifest.counter2].filter(c => c && c.id);
  for (const counter of countersToDeactivate) {
    console.log(`[Fixture] [Teardown] Deactivating Counter ${counter.number} (${counter.id})...`);
    try {
      const availRes = await fetch(`${apiUrl}/api/v1/counters/${counter.id}/availability`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ availability: 'OFFLINE' })
      });
      if (!availRes.ok) {
        await recordFailure('SET_COUNTER_OFFLINE', counter.id, availRes);
      }
    } catch (err) {
      await recordFailure('SET_COUNTER_OFFLINE', counter.id, null, err);
    }

    try {
      const statusRes = await fetch(`${apiUrl}/api/v1/counters/${counter.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'CLOSED' })
      });
      if (!statusRes.ok) {
        await recordFailure('SET_COUNTER_CLOSED', counter.id, statusRes);
      }
    } catch (err) {
      await recordFailure('SET_COUNTER_CLOSED', counter.id, null, err);
    }
  }

  // 3. Close queues (404 is treated as unresolved failure, not success)
  const queuesToClose = [manifest.queueA, manifest.queueB].filter(q => q && q.id);
  for (const queue of queuesToClose) {
    console.log(`[Fixture] [Teardown] Closing Queue ${queue.name} (${queue.id})...`);
    try {
      const queueRes = await fetch(`${apiUrl}/api/v1/queues/${queue.id}/status`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: 'CLOSED' })
      });
      if (!queueRes.ok) {
        await recordFailure('SET_QUEUE_CLOSED', queue.id, queueRes);
      }
    } catch (err) {
      await recordFailure('SET_QUEUE_CLOSED', queue.id, null, err);
    }
  }

  // 4. Disable services (404 is treated as unresolved failure, not success)
  const servicesToDisable = [manifest.serviceA, manifest.serviceB].filter(s => s && s.id);
  for (const service of servicesToDisable) {
    console.log(`[Fixture] [Teardown] Disabling Service ${service.name} (${service.id})...`);
    try {
      const srvRes = await fetch(`${apiUrl}/api/v1/services/${service.id}/status`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ enabled: false })
      });
      if (!srvRes.ok) {
        await recordFailure('DISABLE_SERVICE', service.id, srvRes);
      }
    } catch (err) {
      await recordFailure('DISABLE_SERVICE', service.id, null, err);
    }
  }

  // Check for any failures across all teardown operations
  if (failures.length > 0) {
    console.error(`\n[Fixture] [Teardown] ERROR: ${failures.length} teardown mutation(s) failed:`);
    for (const f of failures) {
      console.error(`  - Operation: ${f.operation}`);
      console.error(`    Resource:  ${f.resourceId}`);
      console.error(`    Status:    ${f.status}`);
      console.error(`    Details:   ${f.responseBody}`);
    }
    throw new Error(
      `[Fixture] [Teardown] Teardown incomplete with ${failures.length} failed mutation(s). ` +
      `Manifest preserved at "${manifestPath}" for safe retry.`
    );
  }

  // 5. Finalize manifest: delete on clean teardown, or archive if unresolved outcome remains
  if (manifest.unresolvedOutcome) {
    const unresolvedStep = manifest.unresolvedOutcome.step || manifest.unresolvedOutcome.failedStep || 'UNKNOWN';
    const archivePath = path.join(
      path.dirname(manifestPath),
      `${path.basename(manifestPath, '.json')}.unresolved-${Date.now()}.json`
    );

    const archivedManifest = {
      ...manifest,
      status: 'DEACTIVATED_WITH_UNRESOLVED_OUTCOME',
      deactivatedAt: new Date().toISOString(),
      archivedPath
    };

    // Atomically write archive record
    const tmpArchive = `${archivePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpArchive, JSON.stringify(archivedManifest, null, 2), 'utf8');
    fs.renameSync(tmpArchive, archivePath);

    // Remove the active manifest file now that it is safely archived
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }

    console.warn(
      `\n[Fixture] [Teardown] NOTICE: All known recorded resources were successfully deactivated, ` +
      `but setup encountered an unresolved outcome at step: "${unresolvedStep}".`
    );
    console.warn(`[Fixture] [Teardown] Unresolved setup details:`, manifest.unresolvedOutcome);
    console.warn(`[Fixture] [Teardown] Audit manifest preserved at archive path: "${archivePath}".\n`);

    return {
      success: true,
      deactivatedManifest: archivedManifest,
      archivedPath,
      hasUnresolvedOutcome: true
    };
  }

  // Completely clean teardown (no unresolved outcome during setup)
  fs.unlinkSync(manifestPath);
  console.log(`[Fixture] [Teardown] Deactivation complete. Manifest removed from "${manifestPath}".`);

  return { success: true, deactivatedManifest: manifest, hasUnresolvedOutcome: false };
}

// CLI Execution support
if (require.main === module) {
  const command = process.argv[2];
  if (command === 'setup') {
    setupIsolatedTransferResources()
      .then(m => {
        console.log('\n[Fixture] Setup complete. Created resources:');
        console.log(JSON.stringify(m, null, 2));
        process.exit(0);
      })
      .catch(err => {
        console.error('\n[Fixture] Setup failed:', err.message);
        process.exit(1);
      });
  } else if (command === 'teardown') {
    teardownIsolatedTransferResources()
      .then(() => {
        console.log('\n[Fixture] Teardown complete.');
        process.exit(0);
      })
      .catch(err => {
        console.error('\n[Fixture] Teardown failed:', err.message);
        process.exit(1);
      });
  } else {
    console.log('Usage: node isolated-transfer-fixture.cjs <setup|teardown>');
    process.exit(1);
  }
}

module.exports = {
  setupIsolatedTransferResources,
  teardownIsolatedTransferResources,
  DEFAULT_MANIFEST_PATH
};
