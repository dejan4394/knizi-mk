export const puppeteerConfig = {
  // Автоматски гледа дали сме на Render
  isProd:
    process.env.NODE_ENV === 'production' ||
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true',
};
