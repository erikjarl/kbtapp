const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'ux-mobile-login.png', fullPage: true });

  await page.getByRole('link', { name: /terapeutvyn/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'ux-mobile-therapist-dashboard.png', fullPage: true });

  await page.getByRole('link', { name: /skapa/i }).last().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'ux-mobile-builder.png', fullPage: true });

  const navCount = await page.locator('.bottom-nav').count();
  console.log(`mobile bottom nav count: ${navCount}`);

  await browser.close();
})();
