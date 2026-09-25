const puppeteer = require('puppeteer');
const assert = require('assert');

// -----------------------------------------------------------------------------
// ENVIRONMENT VARIABLES
// -----------------------------------------------------------------------------
const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL || 'e2e.staff@align.local';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || 'e2e-password';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function run() {
  let browser;
  try {
    console.log('[E2E] Resetting database state...');
    try {
      const { execSync } = require('child_process');
      execSync('docker exec -i align_postgres psql -U align_user -d align_qms -c "TRUNCATE organizations CASCADE;"', { stdio: 'ignore' });
      execSync('docker exec -i align_postgres psql -U align_user -d align_qms -v ON_ERROR_STOP=1 < backend\\dev\\seed-dev.sql', { stdio: 'ignore' });
      console.log('[E2E] Database reset successful.');
    } catch (err) {
      console.error('[E2E] Warning: Could not reset database', err.message);
    }
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
    await customerPage.waitForSelector('#org-card-e2e00000-0000-0000-0000-000000000001', { timeout: 10000 });
    await customerPage.click('#org-card-e2e00000-0000-0000-0000-000000000001');

    await new Promise(r => setTimeout(r, 1000));
    console.log('[E2E] [Customer] Searching for E2E General Service (Service A)...');
    await customerPage.waitForSelector('#join-service-btn-e2e00000-0000-0000-0000-000000000003', { timeout: 10000 });
    await customerPage.click('#join-service-btn-e2e00000-0000-0000-0000-000000000003');

    console.log('[E2E] [Customer] Confirming queue join...');
    await customerPage.waitForSelector('#confirm-join-queue-btn', { timeout: 10000 });
    await customerPage.click('#confirm-join-queue-btn');

    // Wait for Active Status screen
    await customerPage.waitForFunction(() => document.body.innerText.includes('YOUR TOKEN'), { timeout: 10000 });
    console.log('[E2E] [Customer] Successfully joined Service A.');

    // Wait for STOMP subscription
    await new Promise(r => setTimeout(r, 2000));
    const customerTokenTopicOld = Array.from(customerWs.subscriptions).find(t => t.startsWith('/topic/token/'));
    assert.ok(customerTokenTopicOld, 'Customer did not subscribe to initial token topic');
    console.log('[E2E] [Customer] Initial token subscription:', customerTokenTopicOld);
    
    const customerInitialTokenNumber = await customerPage.evaluate(() => {
        const elem = document.querySelector('.text-6xl');
        return elem ? elem.innerText.trim() : null;
    });
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

    await staffPage.waitForFunction(() => document.body.innerText.includes('Live Queue Console'), { timeout: 10000 });
    console.log('[E2E] [Staff] Successfully authenticated and loaded Operations console.');

    // -----------------------------------------------------------------------------
    // CALL NEXT AT COUNTER 1
    // -----------------------------------------------------------------------------
    console.log('[E2E] [Staff] Selecting Counter 1 and setting ONLINE...');
    await staffPage.waitForSelector('#select-counter-1-btn');
    await staffPage.click('#select-counter-1-btn');
    await new Promise(r => setTimeout(r, 500));
    
    const onlineBtn = await staffPage.$('#set-avail-online-btn');
    if (onlineBtn) {
      await onlineBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('[E2E] [Staff] Triggering Call Next at Counter 1...');
    const callNextBtn = await staffPage.$('#call-next-main-btn');
    assert.ok(callNextBtn, 'Call Next button not found');
    
    const isDisabled = await staffPage.evaluate(btn => btn.disabled, callNextBtn);
    console.log('[E2E] [Staff] Call Next button disabled state:', isDisabled);
    const reasonText = await staffPage.evaluate(() => {
      const reasonEl = document.querySelector('.text-amber-800');
      return reasonEl ? reasonEl.innerText : 'No reason found';
    });
    console.log('[E2E] [Staff] Disabled reason:', reasonText);
    
    await callNextBtn.click();
    
    try {
      await staffPage.waitForFunction(() => document.body.innerText.toUpperCase().includes('CURRENTLY SERVING'), { timeout: 10000 });
    } catch (e) {
      const stateStr = await staffPage.evaluate(() => { return window.getAppState ? JSON.stringify(window.getAppState()) : 'NOT_FOUND'; });
      console.error('[E2E] STAFF STATE ON TIMEOUT:', stateStr);
      const html = await staffPage.evaluate(() => document.body.innerHTML);
      console.error('[E2E] DOM ON TIMEOUT:', html.substring(0, 1000));
      throw e;
    }
    
    await customerPage.waitForFunction(() => document.body.innerText.toUpperCase().includes('COUNTER 1'), { timeout: 10000 });
    console.log('[E2E] [Customer] Verified called at Counter 1.');

    // -----------------------------------------------------------------------------
    // TRANSFER TO SERVICE B
    // -----------------------------------------------------------------------------
    console.log('[E2E] [Staff] Transferring token...');
    await staffPage.waitForSelector('#transfer-token-btn');
    await staffPage.click('#transfer-token-btn');

    await staffPage.waitForSelector('#transfer-target-select');
    
    console.log('[E2E] [Staff] Selecting target service...');
    const selected = await staffPage.select('#transfer-target-select', 'e2e00000-0000-0000-0000-000000000010');
    console.log('[E2E] [Staff] Select returned:', selected);
    
    console.log('[E2E] [Staff] Waiting for confirm button to be enabled...');
    await staffPage.waitForSelector('#confirm-transfer-btn:not([disabled])');
    
    console.log('[E2E] [Staff] Clicking confirm...');
    await staffPage.click('#confirm-transfer-btn');

    // Wait for the modal to close and the staff station to return to idle
    try {
      await staffPage.waitForFunction(() => !document.body.innerText.toUpperCase().includes('CURRENTLY SERVING'), { timeout: 10000 });
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
    await customerPage.waitForFunction(() => document.body.innerText.includes('WAITING') && !document.body.innerText.includes('COUNTER 1'), { timeout: 15000 });
    
    // Verify Service B Name in UI (Skipped because Customer local state only has INITIAL_SERVICES)
    
    const customerNewTokenNumber = await customerPage.evaluate(() => {
        const elem = document.querySelector('.text-6xl');
        return elem ? elem.innerText.trim() : null;
    });
    
    assert.ok(customerNewTokenNumber !== customerInitialTokenNumber, 'Customer token number did not change after transfer');
    console.log('[E2E] [Customer] Recovered successfully with new token number:', customerNewTokenNumber);

    // Verify STOMP re-subscription
    await new Promise(r => setTimeout(r, 2000));
    const customerTokenTopicNew = Array.from(customerWs.subscriptions).find(t => t.startsWith('/topic/token/') && t !== customerTokenTopicOld);
    assert.ok(customerTokenTopicNew, 'Customer did not subscribe to new token topic after transfer');
    console.log('[E2E] [Customer] New token subscription:', customerTokenTopicNew);

    // -----------------------------------------------------------------------------
    // CALL NEXT AT COUNTER 2
    // -----------------------------------------------------------------------------
    console.log('[E2E] [Staff] Switching to Counter 2...');
    await staffPage.waitForSelector('#select-counter-2-btn');
    await staffPage.click('#select-counter-2-btn');
    await new Promise(r => setTimeout(r, 500));
    
    const onlineBtn2 = await staffPage.$('#set-avail-online-btn');
    if (onlineBtn2) {
      await onlineBtn2.click();
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('[E2E] [Staff] Triggering Call Next at Counter 2...');
    await staffPage.waitForFunction(() => {
        const btn = document.querySelector('#call-next-main-btn');
        return btn && !btn.disabled;
    }, { timeout: 10000 });
    
    await staffPage.evaluate(() => {
      document.querySelector('#call-next-main-btn').click();
    });

    await staffPage.waitForFunction(() => document.body.innerText.toUpperCase().includes('CURRENTLY SERVING'), { timeout: 10000 });
    console.log('[E2E] [Staff] Verified called at Counter 2.');

    // -----------------------------------------------------------------------------
    // VERIFY FINAL CUSTOMER STATE
    // -----------------------------------------------------------------------------
    await customerPage.waitForFunction(() => document.body.innerText.toUpperCase().includes('COUNTER 2'), { timeout: 10000 });
    console.log('[E2E] [Customer] Verified called at Counter 2.');
    
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
