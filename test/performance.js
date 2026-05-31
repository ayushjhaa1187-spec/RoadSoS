const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

async function runLighthouse() {
  const lighthouse = (await import('lighthouse')).default;
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless', '--no-sandbox']});
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'pwa', 'accessibility'],
    port: chrome.port
  };
  
  const runnerResult = await lighthouse('http://localhost:3000', options);
  
  const reportJson = runnerResult.report;
  fs.writeFileSync('test/lighthouse-report.json', reportJson);
  
  const scores = {
    performance: runnerResult.lhr.categories.performance.score * 100,
    pwa: runnerResult.lhr.categories.pwa.score * 100,
    accessibility: runnerResult.lhr.categories.accessibility.score * 100,
  };
  
  console.log('Lighthouse scores:');
  console.log(`Performance: ${scores.performance}`);
  console.log(`PWA: ${scores.pwa}`);
  console.log(`Accessibility: ${scores.accessibility}`);
  
  await chrome.kill();
  
  let failed = false;
  if (scores.performance <= 85) {
    console.error('Performance threshold not met. Suggestion: optimize images, reduce JavaScript payload, and ensure Next.js Image component is used.');
    failed = true;
  }
  if (scores.pwa <= 90) {
    console.error('PWA threshold not met. Suggestion: Verify service worker registration, manifest.json, and offline fallback.');
    failed = true;
  }
  if (scores.accessibility <= 95) {
    console.error('Accessibility threshold not met. Suggestion: Add ARIA labels, ensure high contrast, and use semantic HTML elements.');
    failed = true;
  }
  
  if (failed) {
    process.exit(1);
  } else {
    console.log('All Lighthouse thresholds met successfully!');
    process.exit(0);
  }
}

runLighthouse().catch(err => {
  console.error(err);
  process.exit(1);
});
