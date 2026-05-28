import puppeteer from 'puppeteer';

export const puppeteerConfig = {
  isProd:
    process.env.NODE_ENV === 'production' ||
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true',

  executablePath: puppeteer.executablePath(),
};
