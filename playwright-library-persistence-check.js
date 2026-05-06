const { chromium, devices } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4179';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
async function registerTherapist(page, suffix) {
  const email = `therapist-${suffix}-${Date.now()}@example.com`;
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Terapeut' }).click();
  await page.locator('#register-form input[name="name"]').fill(`Terapeut ${suffix}`);
  await page.locator('#register-form input[name="email"]').fill(email);
  await page.locator('#register-form input[name="password"]').fill('hemligt123');
  await page.locator('#register-form input[name="passwordConfirm"]').fill('hemligt123');
  await page.locator('#register-form').getByRole('button', { name: /skapa konto/i }).click();
  await page.waitForSelector('#therapist-view.active');
}

async function saveMaterialToLibrary(page) {
  await page.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await page.waitForSelector('#therapist-main .page.active[data-page="create"]');
  await page.locator('#block-library .library-block[data-block-type="info"]').click();
  await page.locator('#save-library').click();
  await page.waitForTimeout(300);
}

async function openLibrary(page) {
  const desktopLink = page.locator('#therapist-nav .nav-item[data-page="library"]');
  const mobileLink = page.locator('#therapist-bottom-nav .bottom-item[data-page="library"]');
  if (await desktopLink.isVisible().catch(() => false)) await desktopLink.click();
  else await mobileLink.click();
  await page.waitForSelector('#therapist-main .page.active[data-page="library"]');
  await page.waitForSelector('#library-grid');
}

async function getLibraryCardCount(page) {
  await openLibrary(page);
  return await page.locator('#library-grid .library-card').count();
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const therapistAContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const therapistAPage = await therapistAContext.newPage();

  await registerTherapist(therapistAPage, 'a');
  const countBeforeSave = await getLibraryCardCount(therapistAPage);
  await saveMaterialToLibrary(therapistAPage);
  const countAfterSave = await getLibraryCardCount(therapistAPage);
  if (countAfterSave !== countBeforeSave + 1) {
    throw new Error(`Material sparades inte i biblioteket. Före: ${countBeforeSave}, efter: ${countAfterSave}`);
  }
  await therapistAPage.screenshot({ path: 'qa-artifacts/library-persistence-desktop.png', fullPage: true });
  await therapistAPage.reload({ waitUntil: 'networkidle' });
  const countAfterReload = await getLibraryCardCount(therapistAPage);
  if (countAfterReload !== countAfterSave) {
    throw new Error(`Sparat bibliotek låg inte kvar efter omladdning. Före reload: ${countAfterSave}, efter reload: ${countAfterReload}`);
  }

  const therapistBContext = await browser.newContext({ ...devices['iPhone 12'] });
  const therapistBPage = await therapistBContext.newPage();
  await registerTherapist(therapistBPage, 'b');
  const countForOtherTherapist = await getLibraryCardCount(therapistBPage);
  if (countForOtherTherapist !== countBeforeSave) {
    throw new Error(`Sparat material läckte till annan terapeut. Förväntat ${countBeforeSave} kort, fick ${countForOtherTherapist}.`);
  }
  await therapistBPage.screenshot({ path: 'qa-artifacts/library-persistence-mobile.png', fullPage: true });

  await therapistAContext.close();
  await therapistBContext.close();
  await browser.close();
  console.log(`Library persistence/scoping OK. Seed count: ${countBeforeSave}, saved count: ${countAfterSave}`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
