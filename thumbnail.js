const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
        '--ignore-gpu-blocklist'
      ]
    });
  }
  return browserInstance;
}

/**
 * Generates a static PNG thumbnail of a 3D model (.stl or .obj)
 * @param {string} inputFilePath - Absolute path to the .stl or .obj file
 * @param {string} outputImagePath - Absolute path where thumbnail.png should be written
 */
async function generateThumbnail(inputFilePath, outputImagePath) {
  let page = null;
  try {
    const ext = path.extname(inputFilePath).slice(1).toLowerCase();
    if (ext !== 'stl' && ext !== 'obj') {
      return false;
    }

    const fileBuffer = fs.readFileSync(inputFilePath);
    const base64Data = fileBuffer.toString('base64');

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 640, height: 480, deviceScaleFactor: 1 });

    const workerUrl = 'file://' + path.resolve(__dirname, 'public', 'render-worker.html').replace(/\\/g, '/');
    await page.goto(workerUrl, { waitUntil: 'load', timeout: 30000 });

    await page.waitForFunction(() => window.isWorkerReady === true, { timeout: 10000 });

    const dataUrl = await page.evaluate(async (data, fileExt) => {
      return await window.renderModel(data, fileExt);
    }, base64Data, ext);

    if (!dataUrl) {
      throw new Error('Worker returned null dataUrl');
    }

    // Extract base64 image data and save to file
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URL format from renderer');
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');
    fs.mkdirSync(path.dirname(outputImagePath), { recursive: true });
    fs.writeFileSync(outputImagePath, imageBuffer);

    return true;
  } catch (err) {
    console.error(`[Thumbnail] Generation failed for ${inputFilePath}:`, err.message);
    return false;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

module.exports = {
  generateThumbnail,
  closeBrowser
};
