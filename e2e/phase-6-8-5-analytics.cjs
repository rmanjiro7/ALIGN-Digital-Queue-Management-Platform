/**
 * Phase 6.8.5 — Time-Series & Extended Entity Analytics E2E
 */

const puppeteer = require('puppeteer');
const assert = require('assert');

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || 'e2e.admin@align.local';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || 'e2e-password';
const PLATFORM_EMAIL = process.env.E2E_PLATFORM_EMAIL || 'e2e.platform@align.local';
const PLATFORM_PASSWORD = process.env.E2E_PLATFORM_PASSWORD || 'e2e-password';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function check(label, condition) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

async function login(page, email, password) {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const enterBtn = btns.find(b => b.innerText.includes('ENTER PORTAL'));
    if (enterBtn) enterBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const btn = document.querySelector('#nav-customer-portal');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginBtn = btns.find(b => b.innerText.includes('Staff Portal Sign In'));
    if (loginBtn) loginBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.evaluate(() => document.querySelector('input[type="email"]').value = '');
  await page.type('input[type="email"]', email);
  await page.evaluate(() => document.querySelector('input[type="password"]').value = '');
  await page.type('input[type="password"]', password);

  const submitBtns = await page.$$('button[type="submit"]');
  if (submitBtns.length > 0) {
    await submitBtns[0].click();
  } else {
    await page.evaluate(() => {
      const btn = document.querySelector('button#staff-login-submit-btn');
      if (btn) btn.click();
    });
  }

  await page.waitForFunction(() => {
    return document.querySelector('#org-nav-screen_17_analytics') ||
           document.querySelector('#platform-nav-screen_17_analytics');
  }, { timeout: 10000 });
}

async function run() {
  let browser;
  try {
    console.log('[E2E] Phase 6.8.5 Analytics Rendering & Data Verification');
    console.log('──────────────────────────────────────────────────────');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('[BROWSER]', msg.text()));
    await page.setViewport({ width: 1280, height: 900 });

    console.log('\n--- Scenario 1: ORG_ADMIN Analytics Render Flow ---');
    await login(page, STAFF_EMAIL, STAFF_PASSWORD);

    await page.evaluate(() => {
      const btn = document.querySelector('#org-nav-screen_17_analytics');
      if (btn) btn.click();
    });

    await page.waitForSelector('#analytics-refresh-btn', { timeout: 5000 });
    await page.waitForSelector('#analytics-kpi-grid', { timeout: 10000 });

    const trafficChartFound = await page.evaluate(() => {
      return !!document.querySelector('.recharts-wrapper') || !!document.querySelector('.recharts-surface');
    });
    check('1. Traffic Time-Series Chart renders (Recharts initialized)', trafficChartFound);

    const hasTrafficTab = await page.evaluate(() => {
      return !!document.querySelector('#analytics-traffic-chart');
    });
    check('2. Traffic & Activity section is visible', hasTrafficTab);

    const hasServiceTab = await page.evaluate(() => {
      return !!document.querySelector('#analytics-service-table');
    });
    check('3. Service Analytics section is visible', hasServiceTab);

    const hasCounterTab = await page.evaluate(() => {
      return !!document.querySelector('#analytics-counter-table');
    });
    check('4. Counter Analytics section is visible', hasCounterTab);

    // Check if table rendered for services
    const serviceTableHasData = await page.evaluate(() => {
      const table = document.querySelector('#analytics-service-table table');
      return table && (table.innerText.toUpperCase().includes('COMPLETION') || table.innerText.toUpperCase().includes('SERVICE'));
    });
    check('5. Service Analytics table renders successfully', serviceTableHasData);

    // Check if table rendered for counters
    const counterTableHasData = await page.evaluate(() => {
      const container = document.querySelector('#analytics-counter-table');
      if (!container) return false;
      const table = container.querySelector('table');
      const emptyState = container.innerText.includes('No counter-level data');
      return (table && table.innerText.includes('Counter')) || emptyState;
    });
    check('6. Counter Analytics table renders successfully', counterTableHasData);


    console.log('\n--- Scenario 2: PLATFORM_ADMIN Analytics Flow ---');
    await page.evaluate(() => {
      const btn = document.querySelector('#nav-logout');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await login(page, PLATFORM_EMAIL, PLATFORM_PASSWORD);

    await page.evaluate(() => {
      const btn = document.querySelector('#platform-nav-screen_17_analytics');
      if (btn) btn.click();
    });

    await page.waitForSelector('#analytics-refresh-btn', { timeout: 5000 });
    await page.waitForSelector('#analytics-traffic-chart', { timeout: 10000 });

    // Platform admin should see org selector
    const hasOrgSelector = await page.evaluate(() => !!document.querySelector('#analytics-org-selector'));
    check('7. PLATFORM_ADMIN can see Organization selector', hasOrgSelector);

    const platformTrafficChartFound = await page.evaluate(() => {
      return !!document.querySelector('.recharts-wrapper') || !!document.querySelector('.recharts-surface');
    });
    check('8. Platform Admin can see Traffic Time-Series Chart', platformTrafficChartFound);

    console.log('\n──────────────────────────────────────────────────────');
    console.log(`[E2E] Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('[E2E] Fatal Error:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

run();
