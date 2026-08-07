const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/quiz/248', { waitUntil: 'networkidle0' }); 
    
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
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log(pageText.substring(0, 1000));
  } finally {
    await browser.close();
  }
})();
