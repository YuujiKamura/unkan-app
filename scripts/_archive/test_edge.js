const puppeteer = require('puppeteer');
const assert = require('assert');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('--- Test 1: MULTI_GROUP Partial selection & Correct answer ---');
    await page.goto('http://localhost:3000/quiz/249', { waitUntil: 'networkidle0' });
    
    let submitBtn = await page.$('button::-p-text(解答する)');
    assert(!submitBtn, 'Submit button should be hidden initially.');

    // Select only 1 option (Partial selection)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('①') || b.innerText.includes('②') || b.innerText.includes('③') || b.innerText.includes('④'));
      if (btns.length > 0) btns[0].click(); // A:①
    });
    
    await new Promise(r => setTimeout(r, 200));

    submitBtn = await page.$('button::-p-text(解答する)');
    assert(submitBtn, 'Submit button should appear after partial selection.');

    // Select the rest for a CORRECT answer (Q249: 1, 4, 5 -> A:①, B:②, C:①)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('①') || b.innerText.includes('②') || b.innerText.includes('③') || b.innerText.includes('④'));
      if (btns.length > 3) btns[3].click();
      if (btns.length > 4) btns[4].click();
    });
    
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('解答する'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1000));
    const pageText1 = await page.evaluate(() => document.body.innerText);
    assert(pageText1.includes('正解！'), 'Should display 正解！ for fully correct MULTI_GROUP selection.');
    console.log('Test 1 Passed.');


    console.log('--- Test 2: SINGLE format regression (Q248) ---');
    await page.goto('http://localhost:3000/quiz/248', { waitUntil: 'networkidle0' }); 
    
    let submitBtn2 = await page.$('button::-p-text(解答する)');
    assert(!submitBtn2, 'Submit button should be hidden initially (SINGLE).');

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.match(/^[1-6]\./));
      if (btns.length > 0) btns[0].click(); 
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


    console.log('--- Test 3: Explanation mode fallback (No selection) ---');
    await page.goto('http://localhost:3000/quiz/249', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('解答せずに正解・解説を見る'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1000));
    const pageText3 = await page.evaluate(() => document.body.innerText);
    assert(pageText3.includes('解説閲覧モード'), 'Should display 解説閲覧モード when skipping without selection.');
    console.log('Test 3 Passed.');

    console.log('All E2E tests passed successfully.');
  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await browser.close();
  }
})();
