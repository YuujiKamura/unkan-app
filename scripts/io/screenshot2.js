const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 URL:', response.url());
    }
  });

  console.log('Navigating directly to /questions...');
  await page.goto('http://localhost:54382/questions', { waitUntil: 'networkidle0' }).catch(e => console.log(e));

  await browser.close();
})();
