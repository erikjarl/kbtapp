const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4178';
const password = 'hemligt123';

async function register(page, role, name, email) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

async function login(page, role, email) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('E-post').first().fill(email);
  await page.getByLabel('Lösenord').first().fill(password);
  await page.getByRole('button', { name: 'Logga in' }).click();
}

async function logout(page) {
  await page.evaluate(() => document.querySelector('.logout')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForSelector('#login-view.active');
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const runId = Date.now();
  const therapistAEmail = `therapist.scope.a.${runId}@kbtapp.se`;
  const therapistBEmail = `therapist.scope.b.${runId}@kbtapp.se`;
  const clientEmail = `client.scope.${runId}@kbtapp.se`;
  const clientName = `Scope Patient ${runId}`;
  const assignmentTitle = `Scope uppgift ${runId}`;
  const therapistReply = `Scope-svar ${runId}`;

  const therapistAPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await register(therapistAPage, 'therapist', 'Scope Terapeut A', therapistAEmail);
  await therapistAPage.waitForSelector('#therapist-view.active');
  await logout(therapistAPage);

  const therapistBPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await register(therapistBPage, 'therapist', 'Scope Terapeut B', therapistBEmail);
  await therapistBPage.waitForSelector('#therapist-view.active');
  await logout(therapistBPage);

  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const clientPage = await mobileContext.newPage();
  await register(clientPage, 'client', clientName, clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await logout(clientPage);

  await login(therapistAPage, 'therapist', therapistAEmail);
  await therapistAPage.waitForSelector('#therapist-view.active');
  await therapistAPage.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await therapistAPage.locator('.library-block[data-block-type="info"]').first().click();
  await therapistAPage.locator('#canvas-stack [data-block-id]').first().click();
  await therapistAPage.locator('#settings-content input[type="text"]').first().fill(assignmentTitle);
  await therapistAPage.locator('#assign-patient').click();
  await therapistAPage.locator('#patient-select').evaluate((select, expectedName) => {
    const option = Array.from(select.options).find(item => item.textContent.includes(expectedName));
    if (!option) throw new Error(`Hittade ingen patientoption för ${expectedName}`);
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, clientName);
  await therapistAPage.locator('#confirm-assign').click();
  await therapistAPage.locator('#toast-area').getByText(/Material tilldelat/i).waitFor();
  await therapistAPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistAPage.locator('#therapist-thread-list').getByText(clientName).click();
  await therapistAPage.locator('#therapist-message-input').fill(therapistReply);
  await therapistAPage.locator('#therapist-message-form').getByRole('button', { name: /skicka/i }).click();
  await therapistAPage.locator('#therapist-message-list').getByText(therapistReply).waitFor();

  await login(clientPage, 'client', clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="assignments"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="assignments"]')?.click();
  });
  await clientPage.locator('#client-assignments-grid').getByText(assignmentTitle).waitFor();
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.locator('#client-message-list').getByText(therapistReply).waitFor();
  await clientPage.screenshot({ path: 'qa-artifacts/scoped-data-mobile.png', fullPage: true });
  await logout(clientPage);

  await login(therapistBPage, 'therapist', therapistBEmail);
  await therapistBPage.waitForSelector('#therapist-view.active');
  const therapistBAssignmentsText = await therapistBPage.locator('#therapist-submissions-grid').textContent().catch(() => '');
  if ((therapistBAssignmentsText || '').includes(assignmentTitle)) {
    throw new Error('Terapeut B ser uppgift som skapats av terapeut A.');
  }
  const therapistBThreadsText = await therapistBPage.locator('#therapist-thread-list').textContent().catch(() => '');
  if ((therapistBThreadsText || '').includes(clientName)) {
    throw new Error('Terapeut B ser patienttråd som tillhör terapeut A.');
  }
  await therapistBPage.screenshot({ path: 'qa-artifacts/scoped-data-desktop.png', fullPage: true });

  console.log('Scoped data flow passed.');
  await browser.close();
})();
