const { chromium, devices } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = 'http://127.0.0.1:4175';

async function register(page, role, name, email) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill('hemligt123');
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const therapist = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const therapistEmail = `therapist.persist.${Date.now()}@kbtapp.se`;
  const patientEmail = `patient.persist.${Date.now()}@kbtapp.se`;

  await register(therapist, 'therapist', 'Persist Terapeut', therapistEmail);
  await therapist.waitForSelector('#therapist-view.active');
  await therapist.getByRole('link', { name: /Skapa patientmaterial/i }).click();
  await therapist.locator('.library-block').nth(0).click();
  await therapist.locator('.library-block').nth(1).click();
  await therapist.getByRole('button', { name: /Tilldela patient/i }).click();
  await therapist.getByRole('button', { name: /Tilldela material/i }).click();
  await therapist.getByRole('link', { name: /Patientmeddelanden/i }).click();
  await therapist.screenshot({ path: 'qa-artifacts/backend-persistence-desktop.png', fullPage: true });

  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const patient = await mobileContext.newPage();
  await register(patient, 'client', 'Maja Persist', patientEmail);
  await patient.waitForSelector('#client-view.active');
  await patient.getByRole('link', { name: /Uppg\./i }).click();
  await patient.locator('#client-assignments-grid .status-pill', { hasText: 'tilldelad' }).first().waitFor();
  await patient.getByRole('button', { name: /Öppna formulär/i }).first().click();
  await patient.locator('.assignment-textarea').first().fill('Serverpersistens fungerar i patientflödet.');
  await patient.getByRole('button', { name: /Skicka in till terapeut/i }).last().click();
  await patient.locator('#client-assignments-grid .status-pill', { hasText: 'inskickad' }).first().waitFor();
  await patient.reload({ waitUntil: 'networkidle' });
  await patient.getByRole('link', { name: /Uppg\./i }).click();
  await patient.locator('#client-assignments-grid').getByText('inskickad').first().waitFor();
  await patient.screenshot({ path: 'qa-artifacts/backend-persistence-mobile.png', fullPage: true });

  await therapist.reload({ waitUntil: 'networkidle' });
  await therapist.waitForSelector('#therapist-view.active');
  await therapist.getByRole('link', { name: /Patientmeddelanden/i }).click();
  await therapist.getByRole('button', { name: /Öppna inskick/i }).first().waitFor();
  await therapist.getByRole('button', { name: /Öppna inskick/i }).first().click();
  await therapist.locator('#submission-shell').getByText('Serverpersistens fungerar i patientflödet.').waitFor();
  await therapist.locator('#submission-feedback-input').fill('Bra jobbat — svaret finns kvar även efter omladdning.');
  await therapist.getByRole('button', { name: /Spara återkoppling/i }).click();
  await therapist.locator('#submission-shell').getByText('Bra jobbat — svaret finns kvar även efter omladdning.').waitFor();

  console.log('Backend persistence flow passed.');
  await browser.close();
})();
