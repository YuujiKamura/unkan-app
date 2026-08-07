const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const url = 'http://localhost:3000/quiz/249';
  await page.goto(url, { waitUntil: 'networkidle0' });

  // ボタンをクリック
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('①') || b.innerText.includes('②') || b.innerText.includes('③') || b.innerText.includes('④'));
    if (buttons.length > 0) {
      buttons[0].click(); // A:①
      if (buttons.length > 3) buttons[3].click(); // B:②
      if (buttons.length > 4) buttons[4].click(); // C:①
    }
  });
  
  // 送信
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => {
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('解答する'));
    if (submitBtn) submitBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));
  
  // テキスト全体を取得して、正解や不正解が出ているかチェック
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('Includes 正解！:', pageText.includes('正解！'));
  console.log('Includes 不正解...:', pageText.includes('不正解...'));
  console.log('Includes 解説閲覧モード:', pageText.includes('解説閲覧モード'));

  await browser.close();
})();
