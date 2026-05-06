const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4177';
const password = 'hemligt123';

async function register(page, role, name, email) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

async function logout(page) {
  await page.evaluate(() => document.querySelector('.logout')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForSelector('#login-view.active');
}

async function login(page, role, email) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('E-post').first().fill(email);
  await page.getByLabel('Lösenord').first().fill(password);
  await page.getByRole('button', { name: 'Logga in' }).click();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const runId = Date.now();
  const therapistEmail = `therapist.link.${runId}@kbtapp.se`;
  const clientEmail = `client.link.${runId}@kbtapp.se`;
  const clientName = `Linkad Patient ${runId}`;
  const materialTitle = `Registrerad hemuppgift ${runId}`;

  const therapistPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await register(therapistPage, 'therapist', 'Linkad Terapeut', therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await logout(therapistPage);

  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const clientPage = await mobileContext.newPage();
  await register(clientPage, 'client', clientName, clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.screenshot({ path: 'qa-artifacts/user-linked-client-mobile.png', fullPage: true });
  await logout(clientPage);

  await login(therapistPage, 'therapist', therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await therapistPage.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await therapistPage.locator('.library-block[data-block-type="info"]').first().click();
  await therapistPage.locator('#canvas-stack [data-block-id]').first().waitFor();
  await therapistPage.locator('#canvas-stack [data-block-id]').first().click();
  await therapistPage.locator('#settings-content input[type="text"]').first().fill(materialTitle);
  await therapistPage.locator('#assign-patient').click();
  await therapistPage.locator('#patient-select').waitFor();
  await therapistPage.locator('#patient-select').evaluate((select, expectedName) => {
    const option = Array.from(select.options).find(item => item.textContent.includes(expectedName));
    if (!option) throw new Error(`Hittade ingen patientoption för ${expectedName}`);
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, clientName);
  await therapistPage.locator('#confirm-assign').click();
  await therapistPage.locator('#toast-area').getByText(/Material tilldelat/i).waitFor();
  await therapistPage.screenshot({ path: 'qa-artifacts/user-linked-client-desktop.png', fullPage: true });

  await login(clientPage, 'client', clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="assignments"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="assignments"]')?.click();
  });
  await clientPage.locator('#client-assignments-grid').getByText(materialTitle).waitFor();
  const assignmentsText = await clientPage.locator('#client-assignments-grid').textContent();
  if (!assignmentsText.includes(clientName)) {
    throw new Error(`Klientens namn saknas i uppgiftslistan: ${clientName}`);
  }
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.locator('#client-thread-subtitle').getByText(clientName).waitFor();

  console.log('User-linked client flow passed.');
  await browser.close();
})();
