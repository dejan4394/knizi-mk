export const puppeteerConfig = {
  // На Render ќе поставиме PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  skipChromiumDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true',

  // Патеката каде Render го зачувува Chrome преку npx командата
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    '/opt/render/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux/chrome',
};
