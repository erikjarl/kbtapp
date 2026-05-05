const { chromium } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = 'http://127.0.0.1:4173/index.html';

async function desktopFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await page.getByRole('link', { name: /Skapa patientmaterial/i }).click();
  await page.locator('.library-block').nth(0).click();
  await page.locator('.library-block').nth(1).click();
  await page.getByRole('button', { name: /Tilldela patient/i }).click();
  await page.getByRole('button', { name: /Tilldela material/i }).click();

  await page.getByRole('link', { name: /Öppna patientvyn/i }).click({ trial: true }).catch(() => {});
  await page.getByRole('link', { name: /Tillbaka/i }).last().click();
  await page.getByRole('link', { name: /Öppna patientvyn/i }).click();
  await page.getByRole('link', { name: /Mina hemuppgifter/i }).click();
  await page.locator('#client-assignments-grid .status-pill', { hasText: 'tilldelad' }).first().waitFor();
  await page.getByRole('button', { name: /Öppna formulär/i }).click();
  await page.locator('#assignment-shell').getByText('påbörjad').waitFor();
  await page.locator('.assignment-textarea').first().fill('Jag började med första steget och märkte att det blev lugnare.');
  await page.getByRole('button', { name: /Skicka in till terapeut/i }).last().click();
  await page.locator('#client-assignments-grid .status-pill', { hasText: 'inskickad' }).first().waitFor();

  await page.getByRole('link', { name: /Tillbaka/i }).last().click();
  await page.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await page.getByRole('link', { name: /Patientmeddelanden/i }).click();
  await page.getByRole('button', { name: /Öppna inskick/i }).click();
  await page.getByRole('button', { name: /Markera som granskad/i }).click();
  const modal = page.locator('#submission-modal.open');
  await page.locator('#submission-shell').getByText('granskad', { exact: true }).waitFor();
  const patientCardText = await page.locator('#client-assignments-grid').innerText();
  await page.screenshot({ path: 'qa-artifacts/status-flow-desktop.png', fullPage: true });
  return /granskad/i.test(await modal.innerText()) && /granskad/i.test(patientCardText);
}

async function mobileFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await page.getByRole('link', { name: /^Skapa$/i }).click();
  await page.locator('.library-block').nth(4).click();
  await page.getByRole('button', { name: /Tilldela patient/i }).click();
  await page.getByRole('button', { name: /Tilldela material/i }).click();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Öppna patientvyn/i }).click();
  await page.getByRole('link', { name: /Uppg\./i }).click();
  await page.locator('#client-assignments-grid .status-pill', { hasText: 'tilldelad' }).first().waitFor();
  await page.getByRole('button', { name: /Öppna formulär/i }).first().click();
  await page.locator('#assignment-shell').getByText('påbörjad').waitFor();
  await page.locator('.assignment-emoji-button').nth(4).click();
  await page.getByRole('button', { name: /Skicka in till terapeut/i }).last().click();
  await page.locator('#client-assignments-grid .status-pill', { hasText: 'inskickad' }).first().waitFor();

  const gridText = await page.locator('#client-assignments-grid').innerText();
  await page.screenshot({ path: 'qa-artifacts/status-flow-mobile.png', fullPage: true });
  return /inskickad/i.test(gridText) && /Skicka in igen/i.test(gridText);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const desktopOk = await desktopFlow(browser);
  const mobileOk = await mobileFlow(browser);
  console.log(JSON.stringify({ desktopOk, mobileOk }));
  await browser.close();
})();
