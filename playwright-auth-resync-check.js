const { chromium, devices } = require('playwright');

const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4360';
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const password = 'hemligt123';

async function register(page, role, name, email) {
  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 30000 });
  await page.waitForTimeout(500);
  await page.locator(`[data-auth-role="${role === 'therapist' ? 'therapist' : 'client'}"]`).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill(password);
  await page.getByLabel('Bekräfta lösenord').fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

async function login(page, role, email) {
  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 30000 });
  await page.waitForTimeout(500);
  await page.locator(`[data-auth-role="${role === 'therapist' ? 'therapist' : 'client'}"]`).click();
  await page.getByLabel('E-post').first().fill(email);
  await page.getByLabel('Lösenord').first().fill(password);
  await page.getByRole('button', { name: 'Logga in' }).click();
}

async function logout(page) {
  await page.evaluate(() => document.querySelector('.logout')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const therapistPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const mobileContext = await browser.newContext({ ...devices['iPhone 12'], viewport: { width: 390, height: 844 } });
  const clientPage = await mobileContext.newPage();

  const runId = Date.now();
  const therapistName = `Terapeut Sync ${runId}`;
  const therapistEmail = `therapist.sync.${runId}@kbtapp.se`;
  const clientName = `Patient Sync ${runId}`;
  const clientEmail = `client.sync.${runId}@kbtapp.se`;
  const therapistMessage = `Hej från terapeut ${runId}`;
  const clientReply = `Svar från patient ${runId}`;

  await register(therapistPage, 'therapist', therapistName, therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await logout(therapistPage);

  await register(clientPage, 'client', clientName, clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await logout(clientPage);

  await login(therapistPage, 'therapist', therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await therapistPage.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await therapistPage.locator('#block-library .library-block[data-block-type="info"]').click();
  await therapistPage.locator('#assign-patient').click();
  await therapistPage.locator('#link-client-email').fill(clientEmail);
  await therapistPage.locator('#link-client-button').click();
  await therapistPage.locator('#link-client-feedback').getByText('är nu länkad till dig.').waitFor();
  await therapistPage.locator('#confirm-assign').click();
  await therapistPage.locator('#toast-area').getByText(/Material tilldelat/i).waitFor();

  await therapistPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPage.locator('#therapist-message-input').fill(therapistMessage);
  await therapistPage.getByRole('button', { name: /skicka svar/i }).click();
  await therapistPage.locator('#therapist-message-list').getByText(therapistMessage).waitFor();

  await login(clientPage, 'client', clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.locator('#client-nav .nav-item[data-page="contact"]').click();
  await clientPage.locator('#client-message-list').getByText(therapistMessage).waitFor();
  await clientPage.locator('#client-message-input').fill(clientReply);
  await clientPage.getByRole('button', { name: /skicka meddelande/i }).click();
  await clientPage.locator('#client-message-list').getByText(clientReply).waitFor();

  await therapistPage.locator('#therapist-nav .nav-item[data-page="dashboard"]').click();
  await therapistPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPage.locator('#therapist-message-list').getByText(clientReply).waitFor({ timeout: 15000 });
  await therapistPage.screenshot({ path: 'qa-artifacts/auth-resync-desktop.png', fullPage: true });

  await clientPage.locator('#client-nav .nav-item[data-page="assignments"]').click();
  await clientPage.locator('#client-nav .nav-item[data-page="contact"]').click();
  await clientPage.screenshot({ path: 'qa-artifacts/auth-resync-mobile.png', fullPage: true });

  console.log('Auth resync check passed.');
  await browser.close();
})();
