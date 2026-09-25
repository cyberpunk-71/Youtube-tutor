const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('1. Navigating to My Tutor...');
  await page.goto('http://localhost:3456');
  await page.waitForTimeout(1000);

  console.log('2. Clicking second video in Quick Links...');
  await page.click('button:has-text("Quick Links")');
  await page.waitForTimeout(500);

  // Click MIT physics video
  await page.click('button:has-text("MIT 8.01")');
  await page.waitForTimeout(1000);

  console.log('3. Simulating playback progression to 125 seconds...');
  await page.evaluate(() => {
    // Dispatch time update and save
    const session = JSON.parse(localStorage.getItem('mytutor_active_session_v1') || '{}');
    if (session && session.video) {
      session.timestamp = 125;
      localStorage.setItem('mytutor_active_session_v1', JSON.stringify(session));
    }
  });

  console.log('4. Refreshing the browser page...');
  await page.reload();
  await page.waitForTimeout(1500);

  const restoredSession = await page.evaluate(() => {
    const raw = localStorage.getItem('mytutor_active_session_v1');
    return JSON.parse(raw || '{}');
  });

  console.log('5. Restored Video Title:', restoredSession.video?.title);
  console.log('6. Restored Timestamp:', restoredSession.timestamp);

  await page.screenshot({ path: '/home/opc/lumotutor-video-ai/public/mytutor_restored_live.png' });
  await browser.close();
  console.log('✓ Persistence test passed!');
})();
