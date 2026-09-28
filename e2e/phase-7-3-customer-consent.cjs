const assert = require('assert');

const API_URL = process.env.API_URL || 'http://localhost:8080';
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || 'e2e.staff@align.local';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || 'e2e-password';

async function run() {
  console.log('--- Phase 7.3 Customer Consent E2E ---');

  try {
    console.log('[E2E] Logging in as Admin...');
    const staffRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e.admin@align.local', password: 'e2e-password' })
    });

    if (!staffRes.ok) {
        throw new Error('Admin login failed');
    }

    const staffData = await staffRes.json();
    const staffToken = staffData.accessToken;
    const locationId = staffData.user.locationId;

    assert.ok(staffToken, 'Missing staff token');
    assert.ok(locationId, 'Missing location ID');

    // Ensure location is OPEN
    console.log('[E2E] Setting location to OPEN...');
    const d = new Date();
    let todayDay = d.getUTCDay();
    if (todayDay === 0) todayDay = 7;
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
        console.error('Failed to open location:', await locUpdateOpen.text());
    }

    // Find a service
    const svcsRes = await fetch(`${API_URL}/api/v1/queues?locationId=${locationId}`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    const svcs = await svcsRes.json();
    const serviceId = svcs[0].serviceId;
    assert.ok(serviceId, 'Missing service ID');

    console.log('[E2E] Customer joining queue WITHOUT consent...');
    const join1Res = await fetch(`${API_URL}/api/v1/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: serviceId, customerName: 'No Consent', customerPhone: '+15551110000', smsConsent: false })
    });
    if (!join1Res.ok) {
        console.error('Failed to join without consent:', await join1Res.text());
    }
    assert.strictEqual(join1Res.status, 201, 'Expected 201 Created');
    const token1 = await join1Res.json();
    assert.strictEqual(token1.smsConsent, false, 'Expected smsConsent to be false');

    console.log('[E2E] Customer joining queue WITH consent...');
    const join2Res = await fetch(`${API_URL}/api/v1/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: serviceId, customerName: 'With Consent', customerPhone: '+15552220000', smsConsent: true })
    });
    if (!join2Res.ok) {
        console.error('Failed to join with consent:', await join2Res.text());
    }
    assert.strictEqual(join2Res.status, 201, 'Expected 201 Created');
    const token2 = await join2Res.json();
    assert.strictEqual(token2.smsConsent, true, 'Expected smsConsent to be true');

    console.log('[E2E] Verifying Staff API can see full PII and consent status...');
    const queueTokensRes = await fetch(`${API_URL}/api/v1/staff/queues/${svcs[0].id}/waiting`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    assert.ok(queueTokensRes.ok, 'Failed to fetch queue tokens');
    const queueTokens = await queueTokensRes.json();

    const t1 = queueTokens.find(t => t.id === token1.id);
    const t2 = queueTokens.find(t => t.id === token2.id);

    assert.ok(t1, 'Token 1 not found in queue');
    assert.strictEqual(t1.customerPhone, '+15551110000', 'Phone should be visible to staff');
    assert.strictEqual(t1.smsConsent, false, 'smsConsent should be false');

    assert.ok(t2, 'Token 2 not found in queue');
    assert.strictEqual(t2.customerPhone, '+15552220000', 'Phone should be visible to staff');
    assert.strictEqual(t2.smsConsent, true, 'smsConsent should be true');

    console.log('[E2E] Phase 7.3 Customer Consent tests passed!');

  } catch (err) {
    console.error('[E2E] Test failed:', err);
    process.exit(1);
  }
}
run();
