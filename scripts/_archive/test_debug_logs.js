const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  try {
    await page.goto('http://localhost:3000/quiz/249', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
      // Overwrite console.log in browser just to get exactly what we want
      const oldLog = console.log;
      console.log = (...args) => {
        oldLog(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      };
      
      const btns = Array.from(document.querySelectorAll('button')).filter(b => /^[①②③④]/.test(b.innerText.trim()));
      if (btns.length > 0) btns[0].click(); // A:①
      if (btns.length > 3) btns[3].click(); // B:②
      if (btns.length > 4) btns[4].click(); // C:①
    });
    
    await new Promise(r => setTimeout(r, 200));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('解答する'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1000));
  } finally {
    await browser.close();
  }
})();
