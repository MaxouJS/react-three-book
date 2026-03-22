import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/images');
const URL = process.env.URL || 'http://localhost:5173/';

function waitFrames(page, n) {
  return page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let i = 0;
        (function tick() {
          if (++i >= count) return resolve();
          requestAnimationFrame(tick);
        })();
      }),
    n,
  );
}

// React range inputs need the native setter trick to trigger onChange
function setOpenProgress(value) {
  return (page) =>
    page.evaluate((v) => {
      for (const label of document.querySelectorAll('label')) {
        const span = label.querySelector('span');
        if (span?.textContent === 'Open Progress') {
          const input = label.querySelector('input[type="range"]');
          if (input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype, 'value',
            ).set;
            nativeSetter.call(input, String(v));
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          break;
        }
      }
    }, value);
}

async function hideUI(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]')
      .forEach((el) => {
        if (el.querySelector('canvas')) return;
        el.style.display = 'none';
      });
  });
}

async function simulatePageCurl(page, startX, startY, endX, endY, steps = 20) {
  const canvas = await page.$('canvas');
  if (!canvas) { console.warn('  No canvas found, skipping curl'); return; }
  const box = await canvas.boundingBox();
  if (!box) { console.warn('  Canvas has no bounding box, skipping curl'); return; }
  const sx = box.x + box.width * startX;
  const sy = box.y + box.height * startY;
  const ex = box.x + box.width * endX;
  const ey = box.y + box.height * endY;

  await page.mouse.move(sx, sy);
  await page.mouse.down({ button: 'left' });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await page.mouse.move(sx + (ex - sx) * t, sy + (ey - sy) * t);
    await waitFrames(page, 2);
  }
}

async function clickTab(page, tabName) {
  await page.evaluate((name) => {
    for (const btn of document.querySelectorAll('button')) {
      if (btn.textContent.trim() === name) { btn.click(); break; }
    }
  }, tabName);
  await waitFrames(page, 10);
}

async function addTextBlock(page, text) {
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll('button')) {
      if (btn.textContent.trim() === '+ Add Text') { btn.click(); break; }
    }
  });
  await waitFrames(page, 10);

  if (text) {
    await page.evaluate((t) => {
      const ta = document.querySelector('textarea');
      if (ta) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype, 'value',
        ).set;
        nativeSetter.call(ta, t);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, text);
    await waitFrames(page, 10);
  }
}

async function toggleSpread(page, pageLabel) {
  await page.evaluate((label) => {
    for (const el of document.querySelectorAll('label')) {
      if (el.textContent.includes(label)) {
        const cb = el.querySelector('input[type="checkbox"]');
        if (cb) cb.click();
        break;
      }
    }
  }, pageLabel);
  await waitFrames(page, 30);
}

const shots = [
  {
    name: 'default',
    description: 'Closed book',
    setup: async (page) => {
      await waitFrames(page, 60);
    },
  },
  {
    name: 'open-half',
    description: 'Open book at 50%',
    setup: async (page) => {
      await setOpenProgress(0.5)(page);
      await waitFrames(page, 60);
    },
  },
  {
    name: 'page-curl',
    description: 'Page curl mid-turn',
    setup: async (page) => {
      await setOpenProgress(0.5)(page);
      await waitFrames(page, 60);
      await simulatePageCurl(page, 0.58, 0.65, 0.35, 0.40, 25);
      await waitFrames(page, 8);
      await hideUI(page);
      await waitFrames(page, 5);
    },
    skipHideUI: true,
  },
  {
    name: 'text-overlay',
    description: 'Page with text overlay rendered on surface',
    setup: async (page) => {
      await clickTab(page, 'Editor');
      await addTextBlock(page, 'Once upon a time, in a land far away...');
      await waitFrames(page, 20);

      await clickTab(page, 'Book');
      await setOpenProgress(0.15)(page);
      await waitFrames(page, 60);
    },
  },
  {
    name: 'spread',
    description: 'Double-page spread with text',
    setup: async (page) => {
      await clickTab(page, 'Textures');
      await toggleSpread(page, 'Pages 1');
      await waitFrames(page, 20);

      await clickTab(page, 'Editor');
      await addTextBlock(page, 'A beautiful spread across both pages');
      await waitFrames(page, 20);

      await clickTab(page, 'Book');
      await setOpenProgress(0.15)(page);
      await waitFrames(page, 60);
    },
  },
  {
    name: 'demo-ui',
    description: 'Full UI with panel',
    setup: async (page) => {
      await setOpenProgress(0.35)(page);
      await waitFrames(page, 60);
    },
    showUI: true,
  },

];

async function main() {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=metal', '--enable-webgl'],
    headless: false,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const shot of shots) {
    console.log(`Taking: ${shot.name}`);
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await waitFrames(page, 60);

    await shot.setup(page);

    if (!shot.showUI && !shot.skipHideUI) {
      await hideUI(page);
      await waitFrames(page, 5);
    }

    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    await page.mouse.up({ button: 'left' }).catch(() => {});
    await page.close();
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
