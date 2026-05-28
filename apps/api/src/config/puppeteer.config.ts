import * as path from 'path';

export const puppeteerConfig = {
  // Проверка дали сме онлајн
  isProd:
    process.env.NODE_ENV === 'production' ||
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true',

  // Ова е вистинската апсолутна патека каде Render го крие извршниот Chrome по инсталацијата!
  executablePath:
    '/opt/render/project/src/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
};
