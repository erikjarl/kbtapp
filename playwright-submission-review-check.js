const { chromium } = require('playwright');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = 'http://127.0.0.1:4173/index.html';

async function desktopFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await page.getByRole('link', { name: /Skapa patientmaterial/i }).click();
  const blocks = page.locator('.library-block');
  await blocks.nth(0).click();
  await blocks.nth(1).click();
  await page.getByRole('button', { name: /Tilldela patient/i }).click();
  await page.getByRole('button', { name: /Tilldela material/i }).click();

  await page.getByRole('link', { name: /Öppna patientvyn/i }).click({ trial: true }).catch(() => {});
  await page.getByRole('link', { name: /Tillbaka/i }).last().click();
  await page.getByRole('link', { name: /Öppna patientvyn/i }).click();
  await page.getByRole('link', { name: /Mina hemuppgifter/i }).click();
  await page.getByRole('button', { name: /Öppna formulär/i }).click();
  await page.locator('.assignment-textarea').first().fill('Jag testade övningen hemma och märkte att det kändes lättare efter några minuter.');
  await page.getByRole('button', { name: /Skicka in till terapeut/i }).last().click();

  await page.getByRole('link', { name: /Tillbaka/i }).last().click();
  await page.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await page.getByRole('link', { name: /Patientmeddelanden/i }).click();
  const submissionsHeading = page.getByRole('heading', { name: /Inskickat patientmaterial/i });
  await submissionsHeading.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /Öppna inskick/i }).click();
  const modal = page.locator('#submission-modal.open');
  await modal.waitFor();
  const text = await modal.innerText();
  await page.screenshot({ path: 'submission-review-desktop.png', fullPage: true });
  return /Jag testade övningen hemma/.test(text) && /Maja Svensson/.test(text);
}

async function mobileFlow(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await page.getByRole('link', { name: /^Skapa$/i }).click();
  await page.locator('.library-block').nth(4).click();
  await page.getByRole('button', { name: /Tilldela patient/i }).click();
  await page.getByRole('button', { name: /Tilldela material/i }).click();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Öppna patientvyn/i }).click();
  await page.getByRole('link', { name: /Uppg\./i }).click();
  await page.getByRole('button', { name: /Öppna formulär/i }).first().click();
  await page.locator('.assignment-emoji-button').nth(5).click();
  await page.getByRole('button', { name: /Skicka in till terapeut/i }).last().click();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Öppna terapeutvyn/i }).click();
  await page.getByRole('link', { name: /Medd\./i }).click();
  await page.getByRole('button', { name: /Öppna inskick/i }).first().click();
  const modal = page.locator('#submission-modal.open');
  await modal.waitFor();
  const text = await modal.innerText();
  await page.screenshot({ path: 'submission-review-mobile.png', fullPage: true });
  return /😊|Lugnt/.test(text);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const desktopOk = await desktopFlow(browser);
  const mobileOk = await mobileFlow(browser);
  console.log(JSON.stringify({ desktopOk, mobileOk }));
  await browser.close();
})();
