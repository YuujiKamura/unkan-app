const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting E2E test...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Quiz 249 (MULTI_GROUP format question we patched earlier)
  const url = 'http://localhost:3000/quiz/249';
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle0' });

  // 1. Check if the question text renders
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText.includes('一般貨物自動車運送事業者')) {
    console.error('Question text not found.');
  } else {
    console.log('Question text found.');
  }

  // 2. Click choices in MULTI_GROUP (Wait for buttons to be available)
  // Let's assume we have buttons. We just evaluate inside the browser to click the first available options
  await page.evaluate(() => {
    // 選択肢のボタンを取得（MULTI_GROUPの場合、グリッドの各ボタン）
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('①') || b.innerText.includes('②') || b.innerText.includes('③') || b.innerText.includes('④'));
    if (buttons.length > 0) {
      buttons[0].click(); // Aの①などをクリック
    }
  });
  console.log('Clicked first choice in MULTI_GROUP.');

  // 3. Wait for "解答する" button to appear and click it
  await new Promise(r => setTimeout(r, 1000));
  const submitClicked = await page.evaluate(() => {
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('解答する'));
    if (submitBtn) {
      submitBtn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked:', submitClicked);

  // 4. Wait for the result UI to appear (正解 or 不正解)
  await new Promise(r => setTimeout(r, 1000));
  const resultText = await page.evaluate(() => {
    const h3 = document.querySelector('h3');
    return h3 ? h3.innerText : 'No h3 found';
  });
  console.log('Result text:', resultText);

  await browser.close();
  console.log('Test completed.');
})();
