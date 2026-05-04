const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const findings = [];

  function note(type, message) {
    findings.push({ type, message });
    console.log(`[${type}] ${message}`);
  }

  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });

  await page.screenshot({ path: 'ux-login.png', fullPage: true });
  note('info', 'Loaded login/role landing page and captured screenshot ux-login.png');

  await page.getByRole('link', { name: /Terapeutvy/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'ux-therapist-dashboard.png', fullPage: true });
  note('info', 'Opened therapist dashboard and captured screenshot ux-therapist-dashboard.png');

  await page.getByRole('link', { name: /Skapa patientmaterial/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'ux-builder-empty.png', fullPage: true });
  note('info', 'Opened material builder and captured empty-state screenshot ux-builder-empty.png');

  const addButtons = page.locator('.library-block');
  const addCount = await addButtons.count();
  note('info', `Found ${addCount} addable block types in block library`);

  for (let i = 0; i < Math.min(addCount, 5); i++) {
    await addButtons.nth(i).click();
    await page.waitForTimeout(150);
  }

  await page.screenshot({ path: 'ux-builder-filled.png', fullPage: true });
  note('info', 'Added five blocks and captured screenshot ux-builder-filled.png');

  const canvasBlocks = page.locator('.canvas-block');
  const blockCount = await canvasBlocks.count();
  note('info', `Canvas now contains ${blockCount} blocks`);

  if (blockCount !== 5) {
    note('issue', `Expected 5 blocks after adding one of each visible type, but found ${blockCount}`);
  }

  const moveDownButtons = page.locator('.move-down, [data-move="down"], .reorder-down');
  const moveUpButtons = page.locator('.move-up, [data-move="up"], .reorder-up');
  const moveTopButtons = page.locator('.move-top, [data-move="top"], .reorder-top');
  const moveBottomButtons = page.locator('.move-bottom, [data-move="bottom"], .reorder-bottom');

  note('info', `Reorder controls found — up:${await moveUpButtons.count()} down:${await moveDownButtons.count()} top:${await moveTopButtons.count()} bottom:${await moveBottomButtons.count()}`);

  if (await moveDownButtons.count()) {
    const before = await canvasBlocks.first().innerText();
    await moveDownButtons.first().click();
    await page.waitForTimeout(250);
    const after = await canvasBlocks.first().innerText();
    if (before === after) {
      note('issue', 'First block content stayed the same after clicking move-down on first block — reorder may still be broken.');
    } else {
      note('pass', 'Move-down changed first visible block, suggesting reorder controls work.');
    }
  } else {
    note('issue', 'Could not detect reorder controls in builder UI.');
  }

  const collapsedBlocks = await page.locator('.canvas-block.collapsed').count();
  note('info', `${collapsedBlocks} blocks are collapsed by default`);
  if (collapsedBlocks === 0 && blockCount > 0) {
    note('issue', 'Blocks do not appear collapsed by default; may reduce sortability/overview.');
  }

  const selectedOutline = await page.locator('.canvas-block.selected').count();
  note('info', `${selectedOutline} block(s) currently selected`);

  await page.locator('.canvas-block').nth(2).click();
  await page.waitForTimeout(200);
  const settingsVisible = await page.locator('#settings-content').innerText();
  if (!settingsVisible.trim()) {
    note('issue', 'Settings panel did not populate after selecting a block.');
  } else {
    note('pass', 'Settings panel populates when a block is selected.');
  }

  await page.getByRole('button', { name: /Förhandsvisa/i }).click();
  await page.waitForTimeout(400);
  const previewVisible = await page.locator('#preview-modal.open').count();
  if (!previewVisible) {
    note('issue', 'Preview overlay did not open.');
  } else {
    note('pass', 'Preview overlay opened in-page as intended.');
    await page.screenshot({ path: 'ux-preview-overlay.png', fullPage: true });
    note('info', 'Captured preview overlay screenshot ux-preview-overlay.png');
  }

  const modalText = previewVisible ? await page.locator('#preview-modal .modal-card').innerText() : '';
  if (previewVisible && !/patient|behandlare|Maja|hemuppgift/i.test(modalText)) {
    note('issue', 'Preview overlay opens, but does not strongly communicate patient-view context.');
  }

  await browser.close();

  console.log('\nSUMMARY_JSON_START');
  console.log(JSON.stringify(findings, null, 2));
  console.log('SUMMARY_JSON_END');
})();
