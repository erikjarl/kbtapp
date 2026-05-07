const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4330';
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
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const mobile = await mobileContext.newPage();

  const runId = Date.now();
  const therapistName = `Terapeut Översikt ${runId}`;
  const therapistEmail = `therapist.dashboard.${runId}@kbtapp.se`;
  const clientName = `Patient Översikt ${runId}`;
  const clientEmail = `client.dashboard.${runId}@kbtapp.se`;

  await register(desktop, 'therapist', therapistName, therapistEmail);
  await desktop.waitForSelector('#therapist-view.active');
  await logout(desktop);

  await register(mobile, 'client', clientName, clientEmail);
  await mobile.waitForSelector('#client-view.active');
  await logout(mobile);

  await login(desktop, 'therapist', therapistEmail);
  await desktop.waitForSelector('#therapist-view.active');
  await desktop.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await desktop.locator('#assign-patient').click();
  await desktop.locator('#link-client-email').fill(clientEmail);
  await desktop.locator('#link-client-button').click();
  await desktop.locator('#link-client-feedback').getByText(clientName).waitFor();
  await desktop.locator('#confirm-assign').click();
  await desktop.locator('#toast-area').getByText(/Material tilldelat/i).waitFor();

  await desktop.locator('#therapist-nav .nav-item[data-page="dashboard"]').click();
  await desktop.locator('#therapist-patient-overview-list').getByText(clientName).waitFor();
  await desktop.locator('#dashboard-recent-activity-list').getByText('Material tilldelat').waitFor();
  const summaryText = await desktop.locator('#therapist-patient-overview-summary').textContent();
  const overviewText = await desktop.locator('#therapist-patient-overview-list').textContent();
  const eventsStat = await desktop.locator('#dashboard-stat-events').textContent();
  const patientsStat = await desktop.locator('#dashboard-stat-patients').textContent();
  const assignedStat = await desktop.locator('#dashboard-stat-assigned').textContent();
  const recentActivityText = await desktop.locator('#dashboard-recent-activity-list').textContent();

  if (!summaryText.includes('1 länkade patienter')) {
    throw new Error(`Fel sammanfattning i terapeutöversikten: ${summaryText}`);
  }
  if (!overviewText.includes('1 tilldelade')) {
    throw new Error(`Tilldelning saknas i patientöversikten: ${overviewText}`);
  }
  if (!overviewText.includes('Aktiv behandlingskontakt')) {
    throw new Error(`Status saknas i patientöversikten: ${overviewText}`);
  }
  if (Number(eventsStat || '0') < 1) {
    throw new Error(`Förväntade minst 1 ny händelse, fick: ${eventsStat}`);
  }
  if (patientsStat !== '1') {
    throw new Error(`Förväntade 1 aktiv patient, fick: ${patientsStat}`);
  }
  if (assignedStat !== '1') {
    throw new Error(`Förväntade 1 tilldelat material, fick: ${assignedStat}`);
  }
  if (!recentActivityText.includes('Material tilldelat')) {
    throw new Error(`Senaste aktivitet saknar tilldelning: ${recentActivityText}`);
  }

  await desktop.locator('#therapist-patient-overview-list').getByRole('button', { name: 'Öppna tråd' }).click();
  await desktop.waitForSelector('#therapist-main .page[data-page="messages"].active');
  await desktop.locator('#therapist-thread-list').getByText(clientName).waitFor();
  await desktop.screenshot({ path: 'qa-artifacts/dashboard-overview-desktop.png', fullPage: true });

  await login(mobile, 'client', clientEmail);
  await mobile.waitForSelector('#client-view.active');
  await mobile.locator('#client-bottom-nav .bottom-item[data-page="materials"]').click();
  await mobile.locator('#client-materials-grid').getByText(/Patientmaterial/i).waitFor();
  await mobile.screenshot({ path: 'qa-artifacts/dashboard-overview-mobile.png', fullPage: true });

  console.log('Dashboard overview check passed.');
  await browser.close();
})();
