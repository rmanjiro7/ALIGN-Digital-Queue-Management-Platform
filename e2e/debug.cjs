const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await new Promise(r=>setTimeout(r,1000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const menuBtn = btns.find(b => b.innerText.includes('Customer Portal') || b.innerText.includes('CU'));
    if (menuBtn) menuBtn.click();
  });
  await new Promise(r=>setTimeout(r,500));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginBtn = btns.find(b => b.innerText.includes('Staff Portal Sign In'));
    if (loginBtn) loginBtn.click();
  });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'e2e.admin@align.local');
  await page.type('input[type="password"]', 'e2e-password');
  await page.evaluate(() => document.querySelector('button#staff-login-submit-btn').click());
  
  await new Promise(r=>setTimeout(r,5000));

  await page.screenshot({ path: 'e2e_debug_1.png' });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Service & Queue Settings') || b.innerText.includes('SERVICE & QUEUE SETTINGS'));
    if (btn) btn.click();
  });

  await new Promise(r=>setTimeout(r,3000));
  await page.screenshot({ path: 'e2e_debug_2.png' });
  
  console.log('INNERTEXT_START');
  console.log(await page.evaluate(() => document.body.innerText));
  console.log('INNERTEXT_END');
  await browser.close();
})();
