const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  console.log('Navigating to local server...');
  // We go to questions.html because page.tsx redirects to it via meta refresh
  await page.goto('http://localhost:3000/questions.html', { waitUntil: 'networkidle0' });

  // Take screenshot of Dashboard
  const screenshotPath = 'dashboard_screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  // Test navigation to one of the quizes (e.g., R04)
  // We'll look for a link that has "令和4年" in its text and click it
  const linkHandlers = await page.$x("//a[contains(., '令和4年')]");
  if (linkHandlers.length > 0) {
    console.log('Found 令和4年 link, clicking...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      linkHandlers[0].click()
    ]);
    const quizScreenshotPath = 'quiz_screenshot.png';
    await page.screenshot({ path: quizScreenshotPath, fullPage: true });
    console.log(`Quiz screenshot saved to ${quizScreenshotPath}`);
  } else {
    console.log('Could not find link for 令和4年');
  }

  await browser.close();
})();
