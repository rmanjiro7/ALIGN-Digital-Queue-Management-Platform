const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000');
  
  // 1. Splash Screen
  try {
    await page.waitForSelector('button', { timeout: 2000 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const enterBtn = btns.find(b => b.innerText.includes('Enter Platform'));
      if (enterBtn) enterBtn.click();
    });
  } catch(e) {}

  // 2. Discovery Screen
  await page.waitForFunction(() => document.body.innerText.includes('Select an Organization'));
  await page.evaluate(() => {
    // Click the first organization card
    const cards = Array.from(document.querySelectorAll('div.cursor-pointer'));
    if (cards.length > 0) cards[0].click();
  });

  // 3. Services Screen
  await page.waitForFunction(() => document.body.innerText.includes('Select a Service'));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const joinBtn = btns.find(b => b.innerText.includes('Join Queue'));
    if (joinBtn) joinBtn.click();
  });

  // 4. Wait for Screen 04
  await page.waitForFunction(() => document.body.innerText.includes('Review & Join'));
  await new Promise(r => setTimeout(r, 1000)); // wait for animations

  const screenshotPath = 'C:\\Users\\Asus\\.gemini\\antigravity-ide\\brain\\ad9211a4-f792-47d3-922f-f5c100db9818\\screen04_redesign.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);
  
  await browser.close();
})();
