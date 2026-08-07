const puppeteer = require('puppeteer');
const assert = require('assert');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('--- Test 1: MULTI_GROUP Partial selection & Correct answer ---');
    await page.goto('http://localhost:3000/quiz/249', { waitUntil: 'networkidle0' });
    
    // Select only 1 option (Partial selection)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('①') || b.innerText.includes('②') || b.innerText.includes('③') || b.innerText.includes('④'));
      if (btns.length > 0) btns[0].click(); // A:①
    });
    
    await new Promise(r => setTimeout(r, 200));

    // Select the rest for a CORRECT answer (Q249: 1, 4, 5 -> A:①, B:②, C:①)
    // A:① is already selected. B:② is index 3. C:① is index 4.
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
    
  } catch (err) {
    console.error('Test Failed:', err);
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log(pageText.substring(0, 1000));
  } finally {
    await browser.close();
  }
})();
