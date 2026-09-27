const assert = require('assert');

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || 'e2e.admin@align.local';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || 'e2e-password';

const API_URL = process.env.API_URL || 'http://localhost:8080';

async function run() {
  console.log('--- Phase 7.2 Operating Hours E2E ---');

  try {
    console.log('[E2E] Logging in as Staff/Admin...');
    const staffRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD })
    });
    if (!staffRes.ok) throw new Error('Staff login failed');
    const staffData = await staffRes.json();
    const staffToken = staffData.accessToken;
    const locationId = staffData.user.locationId;
    assert.ok(staffToken, 'Missing staff token');

    // Find a service
    const svcsRes = await fetch(`${API_URL}/api/v1/queues?locationId=${locationId}`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    const svcs = await svcsRes.json();
    const serviceId = svcs[0].serviceId;
    const targetServiceId = svcs.length > 1 ? svcs[1].serviceId : svcs[0].serviceId;
    assert.ok(serviceId, 'Missing service ID');

    console.log('[E2E] Updating location schedule to OPEN...');
    const d = new Date();
    let todayDay = d.getUTCDay();
    if (todayDay === 0) todayDay = 7; // Java DayOfWeek is 1-7, Mon-Sun

    const locUpdateOpen = await fetch(`${API_URL}/api/v1/locations/${locationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
      body: JSON.stringify({
        enforceSchedule: true,
        timezone: 'UTC',
        schedules: [{ dayOfWeek: todayDay, openTime: '00:00', closeTime: '23:59:59' }]
      })
    });
    if (!locUpdateOpen.ok) {
      console.error(`Failed to update location to OPEN: ${locUpdateOpen.status} ${await locUpdateOpen.text()}`);
    }
    assert.ok(locUpdateOpen.ok, 'Failed to update location to OPEN');

    console.log('[E2E] Customer joining queue (should succeed)...');
    const join1Res = await fetch(`${API_URL}/api/v1/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: serviceId, customerName: 'Test', customerPhone: '+15551234567' })
    });
    assert.strictEqual(join1Res.status, 201, 'Expected 201 Created for OPEN location');
    const token1 = await join1Res.json();
    const tokenId = token1.id;

    console.log('[E2E] Updating location schedule to CLOSED...');
    const locUpdateClosed = await fetch(`${API_URL}/api/v1/locations/${locationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
      body: JSON.stringify({
        enforceSchedule: true,
        timezone: 'UTC',
        schedules: [{ dayOfWeek: todayDay, openTime: '00:00', closeTime: '00:01' }]
      })
    });
    assert.ok(locUpdateClosed.ok, 'Failed to update location to CLOSED');

    console.log('[E2E] Customer joining queue (should fail)...');
    const join2Res = await fetch(`${API_URL}/api/v1/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: serviceId, customerName: 'Test2', customerPhone: '+15551234568' })
    });
    assert.strictEqual(join2Res.status, 400, 'Expected 400 Bad Request for CLOSED location');

    if (targetServiceId !== serviceId) {
      console.log('[E2E] Staff transferring token to CLOSED location (should fail)...');
      const transferRes = await fetch(`${API_URL}/api/v1/tokens/${tokenId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ targetServiceId })
      });
      assert.strictEqual(transferRes.status, 400, 'Expected 400 Bad Request for transfer to CLOSED location');
    }

    console.log('[E2E] All operating hours tests passed!');

  } catch (err) {
    console.error('[E2E] Test failed:', err);
    process.exit(1);
  }
}
run();
