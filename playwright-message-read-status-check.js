const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4340';
const password = 'hemligt123';

async function register(page, role, name, email) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill(password);
  await page.getByLabel('Bekräfta lösenord').fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const therapistPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const clientPage = await mobileContext.newPage();

  const runId = Date.now();
  const therapistEmail = `therapist.read.${runId}@kbtapp.se`;
  const clientEmail = `client.read.${runId}@kbtapp.se`;
  const therapistReply = `Terapeutsvar ${runId}`;

  await register(therapistPage, 'therapist', 'Lässtatus Terapeut', therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');

  await register(clientPage, 'client', 'Lässtatus Patient', clientEmail);
  await clientPage.waitForSelector('#client-view.active');

  await therapistPage.goto(baseUrl, { waitUntil: 'networkidle' });
  await therapistPage.waitForSelector('#therapist-view.active');
  await therapistPage.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await therapistPage.locator('#block-library .library-block[data-block-type="info"]').click();
  await therapistPage.locator('#assign-patient').click();
  await therapistPage.locator('#link-client-email').fill(clientEmail);
  await therapistPage.locator('#link-client-button').click();
  await therapistPage.getByText('är nu länkad till dig.').waitFor();
  await therapistPage.locator('#confirm-assign').click();
  await therapistPage.locator('#toast-area').getByText('Material tilldelat').waitFor();

  await therapistPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPage.locator('#therapist-message-input').fill(therapistReply);
  await therapistPage.getByRole('button', { name: /skicka svar/i }).click();
  await therapistPage.locator('#therapist-message-list').getByText(therapistReply).waitFor();
  await therapistPage.screenshot({ path: 'qa-artifacts/message-read-status-desktop.png', fullPage: true });

  await clientPage.reload({ waitUntil: 'networkidle' });
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.locator('#client-message-list').getByText(therapistReply).waitFor();
  await clientPage.screenshot({ path: 'qa-artifacts/message-read-status-mobile.png', fullPage: true });

  await clientPage.reload({ waitUntil: 'networkidle' });
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.locator('#client-message-list').getByText(therapistReply).waitFor();

  console.log('Message read status check passed.');
  await browser.close();
})();
