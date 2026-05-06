const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 4174}`;

async function registerAndOpen(page, role, name, email, password) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill(password);
  await page.getByLabel('Bekräfta lösenord').fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const therapistEmail = `therapist.${Date.now()}@kbtapp.se`;
  await registerAndOpen(desktop, 'therapist', 'Test Terapeut', therapistEmail, 'hemligt123');
  await desktop.waitForSelector('#therapist-view.active');
  await desktop.screenshot({ path: 'qa-artifacts/auth-desktop-therapist.png', fullPage: true });
  await desktop.locator('#therapist-header-name').getByText('Test Terapeut').waitFor();
  await desktop.getByRole('link', { name: /Tillbaka/i }).first().click();
  await desktop.waitForSelector('#login-view.active');
  await desktop.getByLabel('E-post').first().fill(therapistEmail);
  await desktop.getByLabel('Lösenord').first().fill('hemligt123');
  await desktop.getByRole('button', { name: 'Logga in' }).click();
  await desktop.waitForSelector('#therapist-view.active');

  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const mobile = await mobileContext.newPage();
  const clientEmail = `patient.${Date.now()}@kbtapp.se`;
  await registerAndOpen(mobile, 'client', 'Maja Testpatient', clientEmail, 'hemligt123');
  await mobile.waitForSelector('#client-view.active');
  await mobile.screenshot({ path: 'qa-artifacts/auth-mobile-client.png', fullPage: true });
  await mobile.locator('#client-header-name').getByText('Maja').waitFor();

  console.log('Auth check passed for desktop therapist and mobile client.');
  await browser.close();
})();
