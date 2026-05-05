const { chromium, devices } = require('playwright');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://127.0.0.1:4173';

async function seed(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    const assigned = [{
      id: 'assignment_seed_1',
      title: 'Sömnlogg vecka 1',
      patientId: 'patient_1',
      patientName: 'Maja Svensson',
      createdAt: '2026-05-05 13:00',
      reviewedAt: '2026-05-05 14:00',
      status: 'granskad',
      blocks: [{ id: 'block_1', type: 'info', settings: { title: 'Rubrik', content: 'Text' } }],
      feedback: { text: 'Bra jobbat', updatedAt: '2026-05-05 14:00' }
    }];
    const submissions = [{
      id: 'submission_seed_1',
      assignmentId: 'assignment_seed_1',
      title: 'Sömnlogg vecka 1',
      patientId: 'patient_1',
      patientName: 'Maja Svensson',
      submittedAt: '2026-05-05 13:30',
      reviewedAt: '2026-05-05 14:00',
      status: 'granskad',
      blocks: [{ id: 'block_1', type: 'info', settings: { title: 'Rubrik', content: 'Text' } }],
      answers: {},
      summary: { answeredCount: 1, preview: 'Somnade lite snabbare.' },
      feedback: { text: 'Bra jobbat', updatedAt: '2026-05-05 14:00' }
    }, {
      id: 'submission_seed_2',
      assignmentId: 'assignment_seed_2',
      title: 'Exponeringslogg',
      patientId: 'patient_2',
      patientName: 'Erik Johansson',
      submittedAt: '2026-05-05 14:05',
      status: 'inskickad',
      blocks: [{ id: 'block_2', type: 'info', settings: { title: 'Rubrik', content: 'Text' } }],
      answers: {},
      summary: { answeredCount: 2, preview: 'Gick till affären trots oro.' }
    }, {
      id: 'submission_seed_3',
      assignmentId: 'assignment_seed_3',
      title: 'Aktivitetsplan',
      patientId: 'patient_3',
      patientName: 'Linda Berg',
      submittedAt: '2026-05-05 14:20',
      status: 'inskickad',
      blocks: [{ id: 'block_3', type: 'info', settings: { title: 'Rubrik', content: 'Text' } }],
      answers: {},
      summary: { answeredCount: 3, preview: 'Tog en promenad efter jobbet.' }
    }];
    localStorage.setItem('kbtapp_assigned_materials', JSON.stringify(assigned));
    localStorage.setItem('kbtapp_material_submissions', JSON.stringify(submissions));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-role="therapist"]');
  await page.evaluate(() => {
    document.getElementById('login-view')?.classList.remove('active');
    document.getElementById('client-view')?.classList.remove('active');
    document.getElementById('therapist-view')?.classList.add('active');
    document.querySelector('#therapist-view .nav-item[data-page="messages"]')?.click();
  });
  await page.waitForFunction(() => document.querySelectorAll('#therapist-submissions-grid .library-card').length > 0);
}

async function runDesktop() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await seed(page);

  const buttonBefore = await page.locator('#open-next-submission').textContent();
  await page.click('#open-next-submission');
  await page.waitForSelector('#submission-modal.open');
  const openedTitle = await page.locator('#submission-modal-title').textContent();
  const openedPatient = await page.locator('#submission-shell .assignment-summary div:nth-child(1) span').textContent();
  await page.click('#mark-submission-reviewed');
  await page.waitForTimeout(150);
  const buttonAfter = await page.locator('#open-next-submission').textContent();
  await page.screenshot({ path: '/Users/erikjarl/.openclaw/workspace/kbtapp/qa-artifacts/next-submission-desktop.png', fullPage: true });
  await browser.close();
  return { buttonBefore, openedTitle, openedPatient, buttonAfter };
}

async function runMobile() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME_PATH });
  const context = await browser.newContext({ ...devices['iPhone 12'], viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await seed(page);
  const buttonBefore = await page.locator('#open-next-submission').textContent();
  await page.click('#open-next-submission');
  await page.waitForSelector('#submission-modal.open');
  const openedTitle = await page.locator('#submission-modal-title').textContent();
  await page.screenshot({ path: '/Users/erikjarl/.openclaw/workspace/kbtapp/qa-artifacts/next-submission-mobile.png', fullPage: true });
  await browser.close();
  return { buttonBefore, openedTitle };
}

(async () => {
  const desktop = await runDesktop();
  const mobile = await runMobile();
  console.log(JSON.stringify({ desktop, mobile }, null, 2));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
