const puppeteer = require('puppeteer');
const assert = require('assert');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('--- Test 2: SINGLE format regression (Q248) ---');
    await page.goto('http://localhost:3000/quiz/248', { waitUntil: 'networkidle0' }); 
    
    let submitBtn2 = await page.$('button::-p-text(解答する)');
    assert(!submitBtn2, 'Submit button should be hidden initially (SINGLE).');

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.className.includes('btn-outline') || b.className.includes('btn-secondary'));
      if (btns.length > 1) btns[1].click(); 
    });

    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('解答する'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1000));
    const pageText2 = await page.evaluate(() => document.body.innerText);
    assert(pageText2.includes('正解！') || pageText2.includes('不正解...'), 'Should display result for SINGLE format.');
    console.log('Test 2 Passed.');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await browser.close();
  }
})();
