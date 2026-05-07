const { chromium, devices } = require('playwright');

const baseUrl = process.env.KBTAPP_BASE_URL || 'http://127.0.0.1:4350';
const password = 'hemligt123';

async function register(page, role, name, email) {
  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 15000 });
  await page.waitForSelector('#login-view.active');
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('Namn').fill(name);
  await page.getByLabel('E-post').nth(1).fill(email);
  await page.getByLabel('Lösenord').nth(1).fill(password);
  await page.getByLabel('Bekräfta lösenord').fill(password);
  await page.getByRole('button', { name: 'Skapa konto' }).click();
}

async function login(page, role, email) {
  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 15000 });
  await page.waitForSelector('#login-view.active');
  await page.getByRole('button', { name: role === 'therapist' ? 'Terapeut' : 'Patient' }).click();
  await page.getByLabel('E-post').first().fill(email);
  await page.getByLabel('Lösenord').first().fill(password);
  await page.getByRole('button', { name: 'Logga in' }).click();
}

async function logout(page) {
  await page.evaluate(() => document.querySelector('.logout')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForSelector('#login-view.active');
}

async function linkPatientAndSendMessage(page, clientEmail, messageText) {
  await page.locator('#therapist-nav .nav-item[data-page="create"]').click();
  await page.locator('#block-library .library-block[data-block-type="info"]').click();
  await page.locator('#assign-patient').click();
  await page.locator('#link-client-email').fill(clientEmail);
  await page.locator('#link-client-button').click();
  await page.locator('#link-client-feedback').getByText('är nu länkad till dig.').waitFor();
  await page.locator('#confirm-assign').click();
  await page.locator('#toast-area').getByText(/Material tilldelat/i).waitFor();

  await page.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await page.locator('#therapist-message-input').fill(messageText);
  await page.getByRole('button', { name: /skicka svar/i }).click();
  await page.locator('#therapist-message-list').getByText(messageText).waitFor();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const therapistPageA = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const therapistPageB = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const mobileContext = await browser.newContext({ ...devices['iPhone 12'] });
  const clientPage = await mobileContext.newPage();

  const runId = Date.now();
  const therapistAName = `Terapeut Alpha ${runId}`;
  const therapistAEmail = `therapist.alpha.${runId}@kbtapp.se`;
  const therapistBName = `Terapeut Beta ${runId}`;
  const therapistBEmail = `therapist.beta.${runId}@kbtapp.se`;
  const clientName = `Patient Relation ${runId}`;
  const clientEmail = `client.relation.${runId}@kbtapp.se`;
  const messageA = `Hälsning från ${therapistAName}`;
  const messageB = `Hälsning från ${therapistBName}`;
  const clientReply = `Svar till senaste terapeuten ${runId}`;

  await register(therapistPageA, 'therapist', therapistAName, therapistAEmail);
  await therapistPageA.waitForSelector('#therapist-view.active');
  await logout(therapistPageA);

  await register(therapistPageB, 'therapist', therapistBName, therapistBEmail);
  await therapistPageB.waitForSelector('#therapist-view.active');
  await logout(therapistPageB);

  await register(clientPage, 'client', clientName, clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await logout(clientPage);

  await login(therapistPageA, 'therapist', therapistAEmail);
  await therapistPageA.waitForSelector('#therapist-view.active');
  await linkPatientAndSendMessage(therapistPageA, clientEmail, messageA);
  await logout(therapistPageA);

  await login(therapistPageB, 'therapist', therapistBEmail);
  await therapistPageB.waitForSelector('#therapist-view.active');
  await linkPatientAndSendMessage(therapistPageB, clientEmail, messageB);
  await logout(therapistPageB);

  await login(clientPage, 'client', clientEmail);
  await clientPage.waitForSelector('#client-view.active');
  await clientPage.evaluate(() => {
    document.querySelector('#client-view .side-nav .nav-item[data-page="contact"]')?.click();
    document.querySelector('#client-view .bottom-item[data-page="contact"]')?.click();
  });
  await clientPage.locator('#client-thread-title').getByText(therapistBName).waitFor();
  const clientConversation = await clientPage.locator('#client-message-list').textContent();
  if (!clientConversation.includes(messageB)) {
    throw new Error('Klienten ser inte senaste relationstråden från terapeut B.');
  }
  if (clientConversation.includes(messageA)) {
    throw new Error('Klienten föll tillbaka till fel tråd och visar fortfarande terapeut A i kontaktvyn.');
  }

  await clientPage.locator('#client-message-input').fill(clientReply);
  await clientPage.getByRole('button', { name: /skicka meddelande/i }).click();
  await clientPage.locator('#client-message-list').getByText(clientReply).waitFor();
  await clientPage.screenshot({ path: 'qa-artifacts/message-relation-thread-mobile.png', fullPage: true });
  await logout(clientPage);

  await login(therapistPageB, 'therapist', therapistBEmail);
  await therapistPageB.waitForSelector('#therapist-view.active');
  await therapistPageB.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  await therapistPageB.locator('#therapist-message-list').getByText(clientReply).waitFor();
  await therapistPageB.screenshot({ path: 'qa-artifacts/message-relation-thread-desktop.png', fullPage: true });
  await logout(therapistPageB);

  await login(therapistPageA, 'therapist', therapistAEmail);
  await therapistPageA.waitForSelector('#therapist-view.active');
  await therapistPageA.locator('#therapist-nav .nav-item[data-page="messages"]').click();
  const therapistAConversation = await therapistPageA.locator('#therapist-message-list').textContent();
  if (therapistAConversation.includes(clientReply)) {
    throw new Error('Svar från klienten hamnade felaktigt även i terapeut A:s tråd.');
  }

  console.log('Message relation thread check passed.');
  await browser.close();
})();
