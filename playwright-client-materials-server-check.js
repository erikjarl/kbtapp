const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4321';
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
  const therapistPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const clientPage = await mobileContext.newPage();

  const runId = Date.now();
  const therapistName = `Terapeut Material ${runId}`;
  const therapistEmail = `therapist.material.${runId}@kbtapp.se`;
  const clientName = `Patient Material ${runId}`;
  const clientEmail = `client.material.${runId}@kbtapp.se`;

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
  await therapistPage.locator('#link-client-email').fill(clientEmail);
  await therapistPage.locator('#link-client-button').click();
  await therapistPage.locator('#link-client-feedback').getByText(clientName).waitFor();
  await therapistPage.locator('#confirm-assign').click();
  await therapistPage.locator('#toast-area').getByText(/Material tilldelat/i).waitFor();
  await logout(therapistPage);

  await login(clientPage, 'client', clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="materials"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="materials"]')?.click();
  });
  await clientPage.waitForTimeout(700);

  const materialsText = await clientPage.locator('#client-materials-grid').textContent();
  if (!materialsText.includes('Delat material')) {
    throw new Error(`Klientens materialvy visar inte serverdelat material: ${materialsText}`);
  }
  if (!materialsText.includes(therapistName)) {
    throw new Error(`Klientens materialvy visar inte rätt terapeutnamn: ${materialsText}`);
  }
  if (!materialsText.includes('tilldelad')) {
    throw new Error(`Klientens materialvy visar inte aktuell status: ${materialsText}`);
  }
  if (materialsText.includes('Vad är oro?') || materialsText.includes('Sömn och återhämtning')) {
    throw new Error(`Seedat klientmaterial visas fortfarande i auth-backed materialvy: ${materialsText}`);
  }

  await clientPage.getByRole('button', { name: 'Öppna material' }).click();
  await clientPage.locator('#assignment-modal.open').waitFor();
  await clientPage.screenshot({ path: 'qa-artifacts/client-materials-server-mobile.png', fullPage: true });

  await clientPage.reload({ waitUntil: 'networkidle' });
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="materials"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="materials"]')?.click();
  });
  await clientPage.waitForTimeout(700);
  await clientPage.locator('#client-materials-grid').getByText(therapistName).waitFor();

  await login(therapistPage, 'therapist', therapistEmail);
  await therapistPage.waitForSelector('#therapist-view.active');
  await therapistPage.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPage.waitForTimeout(700);
  await therapistPage.screenshot({ path: 'qa-artifacts/client-materials-server-desktop.png', fullPage: true });

  console.log('Client materials server flow passed.');
  await browser.close();
})();
