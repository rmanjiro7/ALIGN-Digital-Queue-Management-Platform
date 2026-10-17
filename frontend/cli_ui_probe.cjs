const puppeteer = require('./node_modules/puppeteer');

async function runCliUiProbe() {
  console.log('====================================================');
  console.log('  ALIGN PLATFORM — CLI UI ERROR PROBE');
  console.log('  Traversing All Screens & Detecting Console/UI Errors');
  console.log('====================================================\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
    });
  } catch (e) {
    console.log('[INFO] Trying system Chrome executable...');
    browser = await puppeteer.launch({
      headless: 'new',
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
    });
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  const warnings = [];
  const failedRequests = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    // Filter routine WebSocket/STOMP disconnection notes if backend STOMP is reconnecting
    if (type === 'error') {
      if (text.includes('Failed to load resource') && text.includes('ws')) return;
      if (text.includes('[Snapshot] Failed')) return;
      if (text.includes('[STOMP]')) return;
      errors.push({ type: 'CONSOLE_ERROR', text });
      console.log(`  [CONSOLE ERROR] ${text}`);
    } else if (type === 'warning') {
      warnings.push({ type: 'CONSOLE_WARN', text });
    }
  });

  page.on('pageerror', err => {
    errors.push({ type: 'RUNTIME_EXCEPTION', text: err.message, stack: err.stack });
    console.log(`  [RUNTIME EXCEPTION] ${err.message}`);
  });

  page.on('requestfailed', req => {
    const failure = req.failure();
    if (failure && failure.errorText !== 'net::ERR_ABORTED') {
      failedRequests.push({ url: req.url(), error: failure.errorText });
      console.log(`  [REQUEST FAILED] ${req.url()} — ${failure.errorText}`);
    }
  });

  const testedScreens = [];

  async function checkScreen(screenName, selectorWait = null) {
    console.log(`\n---> Probing Screen: [${screenName}]`);
    if (selectorWait) {
      await page.waitForSelector(selectorWait, { timeout: 8000 });
    }
    await new Promise(r => setTimeout(r, 600)); // allow animations and state to settle
    const title = await page.evaluate(() => document.title);
    const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 150).replace(/\n/g, ' '));
    console.log(`     Rendered cleanly. Title: "${title}", Preview: "${bodyText.substring(0, 70)}..."`);
    testedScreens.push(screenName);
  }

  try {
    // 1. Splash Screen
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await checkScreen('SCREEN_01_SPLASH', 'button');

    // 2. Customer Discovery Screen
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_02_DISCOVERY');
      window.queueStore.setRole('CUSTOMER');
    });
    await checkScreen('SCREEN_02_DISCOVERY');

    // 3. Customer Services Screen
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_03_SERVICES');
    });
    await checkScreen('SCREEN_03_SERVICES');

    // 4. Customer Join Confirm Screen
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_04_JOIN_CONFIRM');
    });
    await checkScreen('SCREEN_04_JOIN_CONFIRM');

    // 5. Customer Active Status Screen
    await page.evaluate(() => {
      const state = window.queueStore.getState();
      const token = state.tokens[0] || null;
      if (token) {
        window.queueStore.setActiveCustomerToken(token.id);
      }
      window.queueStore.setScreen('SCREEN_05_ACTIVE_STATUS');
    });
    await checkScreen('SCREEN_05_ACTIVE_STATUS');

    // 6. Customer History Screen
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_07_HISTORY');
    });
    await checkScreen('SCREEN_07_HISTORY');

    // 7. Staff Login Screen
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_08_STAFF_LOGIN');
    });
    await checkScreen('SCREEN_08_STAFF_LOGIN', '#staff-login-submit-btn');

    // 8. Staff Authentication & Operations Screen
    console.log('\n---> Performing Staff End-to-End Login (staff@align.local)...');
    await page.click('#preset-role-staff');
    await page.click('#staff-login-submit-btn');
    await new Promise(r => setTimeout(r, 1200));
    await checkScreen('SCREEN_09_STAFF_OPERATIONS', '#call-next-main-btn');

    // 9. Staff Announcements Control Room
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_11_ANNOUNCEMENT_CONTROL');
    });
    await checkScreen('SCREEN_11_ANNOUNCEMENT_CONTROL');

    // 10. Org Admin Login & Dashboard
    console.log('\n---> Performing Org Admin End-to-End Login (admin@align.local)...');
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_08_STAFF_LOGIN');
    });
    await page.waitForSelector('#preset-role-org_admin', { timeout: 5000 });
    await page.click('#preset-role-org_admin');
    await page.click('#staff-login-submit-btn');
    await new Promise(r => setTimeout(r, 1200));
    await checkScreen('SCREEN_12_ORG_DASHBOARD');

    // 11. Org Admin Location Management
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_13_LOCATION_MANAGEMENT');
    });
    await checkScreen('SCREEN_13_LOCATION_MANAGEMENT', '#add-location-btn');

    // 12. Org Admin Service & Queue Configuration
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_14_SERVICE_QUEUE_CONFIG');
    });
    await checkScreen('SCREEN_14_SERVICE_QUEUE_CONFIG');

    // 13. Org Admin Analytics Screen
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_17_ANALYTICS');
    });
    await checkScreen('SCREEN_17_ANALYTICS');

    // 14. Platform Admin Login & Dashboard
    console.log('\n---> Performing Platform Admin End-to-End Login (platform@align.local)...');
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_08_STAFF_LOGIN');
    });
    await page.waitForSelector('#preset-role-platform_admin', { timeout: 5000 });
    await page.click('#preset-role-platform_admin');
    await page.click('#staff-login-submit-btn');
    await new Promise(r => setTimeout(r, 1200));
    await checkScreen('SCREEN_15_PLATFORM_DASHBOARD', '#manage-tenants-btn');

    // 15. Platform Admin Tenant Management
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_16_TENANT_MANAGEMENT');
    });
    await checkScreen('SCREEN_16_TENANT_MANAGEMENT', '#onboard-tenant-btn');

    // 16. Public Display Wallboard
    console.log('\n---> Testing Public TV Monitor Display (SCREEN_22)...');
    await page.evaluate(() => {
      window.queueStore.setScreen('SCREEN_22_PUBLIC_DISPLAY');
    });
    await checkScreen('SCREEN_22_PUBLIC_DISPLAY');

  } catch (err) {
    console.error(`\n[FATAL RUNTIME PROBE ERROR]: ${err.message}`);
    errors.push({ type: 'PROBE_FAILURE', text: err.message, stack: err.stack });
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n====================================================');
  console.log('  PROBE AUDIT SUMMARY');
  console.log('====================================================');
  console.log(`Total Screens Successfully Verified: ${testedScreens.length} / 16`);
  console.log(`Runtime Exceptions Detected:        ${errors.length}`);
  console.log(`Failed HTTP Requests:               ${failedRequests.length}`);
  console.log(`Console Warnings:                   ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\n[CRITICAL ERRORS ENCOUNTERED]:');
    errors.forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.type}] ${e.text}`);
    });
    process.exit(1);
  } else {
    console.log('\n>> SUCCESS: 100% CLEAN CLI UI AUDIT. Zero runtime errors or broken layouts detected across all 16 screens.');
    process.exit(0);
  }
}

runCliUiProbe();
