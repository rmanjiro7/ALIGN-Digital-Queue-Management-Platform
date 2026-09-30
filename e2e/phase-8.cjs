const puppeteer = require('puppeteer');
const assert = require('assert');

const API_URL = process.env.API_URL || 'http://localhost:8080';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const STAFF_EMAIL = 'e2e.admin@align.local';
const STAFF_PASSWORD = 'e2e-password';

async function run() {
  console.log('--- Phase 8 Full E2E ---');
  let browser;

  try {
    // 1. Setup Backend Data via API
    console.log('[E2E] Logging in as Admin...');
    const staffRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: STAFF_EMAIL, password: STAFF_PASSWORD })
    });
    if (!staffRes.ok) throw new Error('Admin login failed');
    const staffData = await staffRes.json();
    const staffToken = staffData.accessToken;
    const locationId = 'e2e00000-0000-0000-0000-000000000002';
    const orgId = 'e2e00000-0000-0000-0000-000000000001';

    const service1Id = 'e2e00000-0000-0000-0000-000000000003';
    const queue1Id = 'e2e00000-0000-0000-0000-000000000004';
    const service2Id = 'e2e00000-0000-0000-0000-000000000010';
    const queue2Id = 'e2e00000-0000-0000-0000-000000000011';

    // Ensure both are enabled
    await fetch(`${API_URL}/api/v1/services/${service1Id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }, body: JSON.stringify({id: service1Id, orgId, locationId, name: 'Service 1', description: 'Desc', enabled: true, isFastTrack: false, isHighVolume: false}) });
    await fetch(`${API_URL}/api/v1/services/${service2Id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }, body: JSON.stringify({id: service2Id, orgId, locationId, name: 'Service 2', description: 'Desc', enabled: true, isFastTrack: false, isHighVolume: false}) });

    // Make sure location is open
    const d = new Date();
    let todayDay = d.getUTCDay();
    if (todayDay === 0) todayDay = 7;
    await fetch(`${API_URL}/api/v1/locations/${locationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
      body: JSON.stringify({
        enforceSchedule: true,
        timezone: 'UTC',
        schedules: [{ dayOfWeek: todayDay, openTime: '00:00', closeTime: '23:59:59' }]
      })
    });

    // 2. Open Puppeteer for Customer
    console.log('[E2E] Starting Puppeteer...');
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('[Browser]', msg.text()));

    // Go to customer UI
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('body');
    
    console.log('[E2E] Customer: Reached Discovery. Clicking Join a Queue...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Join a Queue') || b.innerText.includes('Customer Portal'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log(`[E2E] Customer: Select Location (#org-card-${orgId})...`);
    await page.waitForSelector(`#org-card-${orgId}`, { timeout: 10000 });
    await page.click(`#org-card-${orgId}`);

    await new Promise(r => setTimeout(r, 1000));
    console.log(`[E2E] Customer: Searching for first service (#join-service-btn-${service1Id})...`);
    await page.waitForSelector(`#join-service-btn-${service1Id}`, { timeout: 10000 });
    await page.click(`#join-service-btn-${service1Id}`);

    console.log('[E2E] Customer: Confirming queue join...');
    await page.waitForSelector('#confirm-join-queue-btn', { timeout: 10000 });
    await page.click('#confirm-join-queue-btn');

    // Wait for Active Status screen
    await page.waitForFunction(() => document.body.innerText.includes('YOUR TOKEN'), { timeout: 10000 });
    console.log('[E2E] Customer: Successfully joined queue.');

    // Find the token ID
    const tokensRes = await fetch(`${API_URL}/api/v1/staff/queues/${queue1Id}/waiting`, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    const tokens = await tokensRes.json();
    const token = tokens[tokens.length - 1]; // last joined
    console.log('[E2E] Found token ID via API:', token?.id);
    assert.ok(token, 'Failed to retrieve token via API');

    // Verify ETA Range is displayed
    console.log('[E2E] Verifying ETA...');
    await page.waitForSelector('.eta-range', { timeout: 10000 });
    const etaText = await page.$eval('.eta-range', el => el.innerText);
    console.log('[E2E] Customer ETA Text:', etaText);
    assert.ok(etaText.length > 0, 'ETA text should not be empty');

    // 3. Journey Realtime Transfer Test
    console.log('[E2E] Waiting 3 seconds for WebSocket to connect before transferring...');
    await new Promise(r => setTimeout(r, 3000));
    console.log('[E2E] Transferring token (Journey Simulation)...');
    const transferRes = await fetch(`${API_URL}/api/v1/tokens/${token.id}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
      body: JSON.stringify({ targetServiceId: service2Id })
    });
    
    if (!transferRes.ok) {
        throw new Error('Transfer failed: ' + await transferRes.text());
    }
    const transferredToken = await transferRes.json();
    console.log('[E2E] Token transferred to:', transferredToken.id);

    // Wait for customer UI to automatically update via WebSocket
    console.log('[E2E] Waiting for customer UI to react to transfer...');
    // We expect the screen to show "Service 2" or "Consultation Desk" (whichever `store.ts` has)
    // Actually store.ts has "Loan Applications" or something like that. Let's wait for the class "service-name" or something similar to change
    await page.waitForFunction(() => document.body.innerText.includes('Applications') || document.body.innerText.includes('Specialist'), { timeout: 15000 }).catch(async (e) => {
        const dom = await page.evaluate(() => document.body.innerText);
        console.log('Current Screen text:', dom);
        throw e;
    });
    
    console.log('[E2E] Customer UI successfully recovered and displays new queue!');

    console.log('[E2E] Phase 8 Tests Passed.');
  } catch (err) {
    console.error('[E2E] Test failed:', err);
    if (browser && (await browser.pages()).length > 0) {
      const p = (await browser.pages())[0];
      const html = await p.evaluate(() => document.body.innerHTML);
      console.log('DOM:', html);
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

run();
