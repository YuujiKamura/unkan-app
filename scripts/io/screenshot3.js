const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 URL:', response.url());
    }
  });
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));

  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating directly to /unkan-app/questions...');
  await page.goto('http://localhost:3001/unkan-app/questions.html', { waitUntil: 'domcontentloaded' }).catch(e => console.log(e));
  // Try /questions if .html fails or just let the serve deal with it

  const screenshotPath = 'dashboard_screenshot3.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Test click
  try {
    const linkHandlers = await page.$$("::-p-xpath(//a[contains(., '令和4年')])");
    if (linkHandlers.length > 0) {
      console.log('Found 令和4年 link, clicking...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
        linkHandlers[0].click()
      ]);
      await page.waitForTimeout(2000).catch(() => new Promise(r => setTimeout(r, 2000)));
      const quizScreenshotPath = 'quiz_screenshot3.png';
      await page.screenshot({ path: quizScreenshotPath, fullPage: true });
      console.log(`Quiz screenshot saved to ${quizScreenshotPath}`);
    } else {
      console.log('Could not find link for 令和4年');
    }
  } catch (e) {
    console.log('Error clicking link:', e.message);
  }

  await browser.close();
})();
