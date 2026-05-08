const { chromium } = require('playwright');
const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PORT = process.env.PORT || '4370';
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const therapistEmail = `therapist_${Date.now()}@example.com`;
const clientEmail = `client_${Date.now()}@example.com`;
const password = 'hemligt123';

async function register(page, role, name, email) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.locator('#register-name').fill(name);
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill(password);
  await page.locator('#register-password-confirm').fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const therapistContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const clientContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const therapistPage = await therapistContext.newPage();
  const clientPage = await clientContext.newPage();

  await register(clientPage, 'client', 'Test Patient', clientEmail);
  await clientPage.getByText('Kopplingsförfrågningar').waitFor();
  await clientPage.getByText('Inga väntande kopplingar just nu').waitFor();
  await clientPage.getByText('Tillbaka').click();

  await register(therapistPage, 'therapist', 'Test Terapeut', therapistEmail);
  await therapistPage.getByRole('button', { name: 'Skapa nytt patientmaterial' }).waitFor();
  await therapistPage.getByRole('button', { name: 'Skapa nytt patientmaterial' }).click();
  await therapistPage.getByRole('button', { name: 'Tilldela till patient' }).click();
  await therapistPage.locator('#link-client-email').fill(clientEmail);
  await therapistPage.locator('#link-client-button').click();
  await therapistPage.getByText('Förfrågan skickad till Test Patient').waitFor();
  await therapistPage.getByRole('option', { name: 'Inga länkade patienter ännu' }).waitFor();

  await clientPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await clientPage.getByRole('button', { name: 'Patient' }).click();
  await clientPage.locator('#login-email').fill(clientEmail);
  await clientPage.locator('#login-password').fill(password);
  await clientPage.getByRole('button', { name: 'Logga in' }).click();
  await clientPage.getByText('Kopplingsförfrågningar').waitFor();
  await clientPage.getByRole('button', { name: 'Godkänn koppling' }).click();
  await clientPage.getByText('Koppling godkänd').waitFor();
  await clientPage.getByText('Inga väntande kopplingar just nu').waitFor();

  await therapistPage.reload({ waitUntil: 'domcontentloaded' });
  await therapistPage.getByRole('button', { name: 'Skapa nytt patientmaterial' }).click();
  await therapistPage.getByRole('button', { name: 'Tilldela till patient' }).click();
  await therapistPage.getByRole('option', { name: /Test Patient \(min patient\)/ }).waitFor();

  await browser.close();
  console.log('relationship request flow ok');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
