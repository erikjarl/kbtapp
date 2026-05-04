const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = 'http://127.0.0.1:4173/index.html';

async function collect(page, label) {
  const issues = await page.evaluate(() => {
    const offenders = [];
    const all = [...document.querySelectorAll('body *')];
    all.forEach(el => {
      const cs = getComputedStyle(el);
      if (el.classList.contains('modal-backdrop')) return;
      const r = el.getBoundingClientRect();
      const parent = el.parentElement?.getBoundingClientRect();
      if (el.scrollWidth - el.clientWidth > 8 && el.clientWidth > 0 && cs.overflowX !== 'visible') {
        offenders.push({ type: 'inner-overflow', tag: el.tagName, cls: el.className, text: (el.innerText || '').trim().slice(0, 100) });
      }
      if (parent && r.right - parent.right > 6 && r.width < window.innerWidth && !['fixed', 'absolute'].includes(cs.position)) {
        offenders.push({ type: 'parent-overflow', tag: el.tagName, cls: el.className, text: (el.innerText || '').trim().slice(0, 100) });
      }
    });
    return offenders.slice(0, 24);
  });

  console.log(`\n[${label}] issues=${issues.length}`);
  issues.forEach(i => console.log(JSON.stringify(i)));
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await desktop.screenshot({ path: 'qa-login-desktop.png', fullPage: true });
  await collect(desktop, 'desktop-login');

  await desktop.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await desktop.waitForTimeout(300);
  await desktop.screenshot({ path: 'qa-dashboard-desktop.png', fullPage: true });
  await collect(desktop, 'desktop-dashboard');

  await desktop.getByRole('link', { name: /Skapa patientmaterial/i }).click();
  await desktop.waitForTimeout(300);
  const addButtons = desktop.locator('.library-block');
  for (let i = 0; i < 5; i++) await addButtons.nth(i).click();
  await desktop.waitForTimeout(300);
  await desktop.screenshot({ path: 'qa-builder-desktop.png', fullPage: true });
  await collect(desktop, 'desktop-builder');

  await desktop.locator('.canvas-block').nth(1).click();
  await desktop.waitForTimeout(150);
  await desktop.screenshot({ path: 'qa-builder-selected-desktop.png', fullPage: true });
  await desktop.getByRole('button', { name: /Förhandsvisa/i }).click();
  await desktop.waitForTimeout(300);
  await desktop.screenshot({ path: 'qa-preview-desktop.png', fullPage: true });
  await collect(desktop, 'desktop-preview');
  await desktop.getByRole('button', { name: /Stäng förhandsvisning/i }).click();

  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const mobile = await mobileContext.newPage();
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: 'qa-login-mobile.png', fullPage: true });
  await collect(mobile, 'mobile-login');

  await mobile.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await mobile.waitForTimeout(300);
  await mobile.screenshot({ path: 'qa-dashboard-mobile.png', fullPage: true });
  await collect(mobile, 'mobile-dashboard');

  await mobile.getByRole('link', { name: /^Skapa$/i }).click();
  await mobile.waitForTimeout(400);
  const mobileAddButtons = mobile.locator('.library-block');
  for (let i = 0; i < 4; i++) await mobileAddButtons.nth(i).click();
  await mobile.waitForTimeout(300);
  await mobile.screenshot({ path: 'qa-builder-mobile.png', fullPage: true });
  await collect(mobile, 'mobile-builder');

  await browser.close();
})();
