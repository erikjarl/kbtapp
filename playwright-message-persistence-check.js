const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4176';
const password = 'hemligt123';

async function register(page, role, name, email) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const therapistPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const runId = Date.now();
  const therapistEmail = `therapist.messages.${runId}@kbtapp.se`;
  const therapistMessage = `Serverlagrat testsvar från terapeut ${runId}.`;
  const clientMessage = `Serverlagrat testmeddelande från patient ${runId}.`;

  await register(therapistPage, 'therapist', 'Meddelande Terapeut', therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await therapistPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPage.locator('#therapist-message-input').waitFor();
  await therapistPage.locator('#therapist-message-input').fill(therapistMessage);
  await therapistPage.getByRole('button', { name: /skicka svar/i }).click();
  await therapistPage.locator('#therapist-message-list').getByText(therapistMessage).waitFor();
  await therapistPage.reload({ waitUntil: 'networkidle' });
  await therapistPage.waitForSelector('#therapist-view.active');
  await therapistPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPage.locator('#therapist-message-input').waitFor();
  await therapistPage.locator('#therapist-message-list').getByText(therapistMessage).waitFor();
  await therapistPage.screenshot({ path: 'qa-artifacts/message-persistence-desktop.png', fullPage: true });

  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const clientPage = await mobileContext.newPage();
  const clientEmail = `client.messages.${runId}@kbtapp.se`;

  await register(clientPage, 'client', 'Maja Meddelande', clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.locator('#client-message-input').waitFor();
  await clientPage.locator('#client-message-input').fill(clientMessage);
  await clientPage.getByRole('button', { name: /skicka meddelande/i }).click();
  await clientPage.locator('#client-message-list').getByText(clientMessage).waitFor();
  await clientPage.reload({ waitUntil: 'networkidle' });
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.locator('#client-message-input').waitFor();
  await clientPage.locator('#client-message-list').getByText(clientMessage).waitFor();
  await clientPage.screenshot({ path: 'qa-artifacts/message-persistence-mobile.png', fullPage: true });

  console.log('Message persistence check passed.');
  await browser.close();
})();
