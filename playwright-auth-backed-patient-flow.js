const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4311';
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
  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const therapistPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const clientPage = await mobileContext.newPage();

  const runId = Date.now();
  const therapistName = `Terapeut ${runId}`;
  const therapistEmail = `therapist.real.${runId}@kbtapp.se`;
  const clientName = `Patient ${runId}`;
  const clientEmail = `client.real.${runId}@kbtapp.se`;
  const therapistMessage = `Hej ${clientName}, detta är ett riktigt kontotest ${runId}.`;

  await register(therapistPage, 'therapist', therapistName, therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await logout(therapistPage);

  await register(clientPage, 'client', clientName, clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await logout(clientPage);

  await login(therapistPage, 'therapist', therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await therapistPage.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await therapistPage.locator('#assign-patient').click();
  await therapistPage.locator('#patient-select').waitFor();

  const initialPatientOptions = await therapistPage.locator('#patient-select option').evaluateAll(options => options.map(option => option.textContent.trim()));
  if (!initialPatientOptions.some(option => option.includes('Inga länkade patienter ännu'))) {
    throw new Error(`Terapeuten ska börja utan globala patientkonton i väljaren: ${initialPatientOptions.join(', ')}`);
  }

  await therapistPage.locator('#link-client-email').fill(clientEmail);
  await therapistPage.locator('#link-client-button').click();
  await therapistPage.locator('#link-client-feedback').getByText(clientName).waitFor();

  const patientOptions = await therapistPage.locator('#patient-select option').evaluateAll(options => options.map(option => option.textContent.trim()));
  if (!patientOptions.some(option => option.includes(clientName))) {
    throw new Error(`Länkad patient saknas i väljaren: ${clientName}`);
  }
  if (patientOptions.some(option => option.includes('(pt_'))) {
    throw new Error(`Seedade demopatienter visas fortfarande i auth-backed väljaren: ${patientOptions.join(', ')}`);
  }
  await therapistPage.locator('#patient-select').evaluate((select, expectedName) => {
    const option = Array.from(select.options).find(item => item.textContent.includes(expectedName));
    if (!option) throw new Error(`Hittade ingen patientoption för ${expectedName}`);
    select.value = option.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, clientName);

  await therapistPage.locator('#confirm-assign').click();
  await therapistPage.locator('#toast-area').getByText(/Material tilldelat/i).waitFor();
  await therapistPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPage.waitForTimeout(800);
  const therapistThreadText = await therapistPage.locator('#therapist-thread-list').textContent();
  if (!therapistThreadText.includes(clientName)) {
    throw new Error(`Registrerad patienttråd saknas för inloggad terapeut: ${clientName}`);
  }
  if (therapistThreadText.includes('Maja Svensson')) {
    throw new Error('Seedad patienttråd visas fortfarande för inloggad terapeut.');
  }
  await therapistPage.evaluate((expectedName) => {
    const buttons = Array.from(document.querySelectorAll('#therapist-thread-list .message-thread-button'));
    const match = buttons.find(button => button.textContent.includes(expectedName));
    if (!match) throw new Error(`Hittade ingen tråd för ${expectedName}`);
    match.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }, clientName);
  await therapistPage.locator('#therapist-message-input').fill(therapistMessage);
  await therapistPage.locator('#therapist-message-form button[type="submit"]').click();
  await therapistPage.locator('#therapist-message-list').getByText(therapistName).waitFor();
  await therapistPage.screenshot({ path: 'qa-artifacts/auth-backed-patient-flow-desktop.png', fullPage: true });
  await logout(therapistPage);

  await login(clientPage, 'client', clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.waitForTimeout(800);
  const clientThreadTitle = await clientPage.locator('#client-thread-title').textContent();
  const clientMessageText = await clientPage.locator('#client-message-list').textContent();
  if (!clientThreadTitle.includes(therapistName)) {
    throw new Error(`Klientvyn visar inte rätt terapeutfokus: ${clientThreadTitle}`);
  }
  if (!clientMessageText.includes(therapistName)) {
    throw new Error(`Klientvyn visar inte terapeutens riktiga namn i meddelandet: ${clientMessageText}`);
  }
  await clientPage.screenshot({ path: 'qa-artifacts/auth-backed-patient-flow-mobile.png', fullPage: true });

  console.log('Auth-backed patient flow passed.');
  await browser.close();
})();
