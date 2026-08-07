import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/questions?groupBy=knowledge', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot_questions.png', fullPage: true });
  
  await page.goto('http://localhost:3000/questions?groupBy=situation', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot_situations.png', fullPage: true });
  
  await browser.close();
  console.log('Screenshots saved');
})();
