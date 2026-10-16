import fs from 'fs';
import path from 'path';

/**
 * Very lightweight thumbnail generator used during tests.
 * In a production environment this would launch Puppeteer to
 * render the 3‑D model and capture a screenshot.  For the
 * purposes of the unit/e2e test‑suite we simply create a
 * minimal 1×1 PNG image so that the API can return a valid
 * `image/png` response without pulling in heavyweight
 * rendering dependencies.
 */

// A 1×1 pixel transparent PNG (encoded in base64)
const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/5+hHgAFgwJ/lWj8eQAAAABJRU5ErkJggg==';
const ONE_PIXEL_PNG_BUFFER = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64');

export async function generateThumbnail(
  _inputFilePath: string,
  outputImagePath: string
): Promise<void> {
  // In a real implementation this would launch Puppeteer.
  // Here we simply write a minimal PNG to the output path.
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(outputImagePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(outputImagePath, ONE_PIXEL_PNG_BUFFER);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export async function closeBrowser(): Promise<void> {
  // No-op in the test implementation.
  return Promise.resolve();
}
