import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { chromium } from '@playwright/test';

// Uses a real installed browser. All servers and browser processes are closed in finally.
let server, browser;
const errors = [];
try {
  server = await preview({ configFile: 'examples/renderers/vite.config.ts', preview: { port: 0, host: '127.0.0.1', open: false } });
  const executablePath = process.env.PE_BROWSER_EXECUTABLE || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((file) => existsSync(file));
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(error.message));
  const address = server.httpServer.address();
  await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  mkdirSync('test-results/renderers', { recursive: true });
  const labels = ['架构执行', '公式推导', '算法跟踪', '消融对比', '原图检查'];
  const kinds = ['architecture_execution', 'equation_walkthrough', 'algorithm_trace', 'ablation_comparison', 'figure_inspector'];
  for (let i = 0; i < labels.length; i++) {
    await page.getByRole('button', { name: labels[i] }).click();
    assert.equal(await page.locator('.pe-renderer').getAttribute('data-renderer'), kinds[i]);
    const firstSubtitle = await page.locator('.subtitle-text').innerText();
    while (await page.getByRole('button', { name: '下一步' }).isEnabled()) {
      await page.getByRole('button', { name: '下一步' }).click();
    }
    assert.notEqual(await page.locator('.subtitle-text').innerText(), firstSubtitle);
    assert.equal(await page.getByRole('alert').count(), 0);
    const bounds = await page.evaluate(() => {
      const subtitle = document.querySelector('.subtitle-layer').getBoundingClientRect();
      const source = document.querySelector('.pe-source').getBoundingClientRect();
      const stage = document.querySelector('.demo-stage').getBoundingClientRect();
      return { separated: source.bottom <= subtitle.top, contained: subtitle.bottom <= stage.bottom };
    });
    assert.ok(bounds.separated && bounds.contained, `${kinds[i]} overlaps subtitles`);
    if (i === 1) assert.ok(await page.locator('math').count() > 0);
    if (i === 4) {
      const crop = (await page.locator('.pe-zoom').getAttribute('viewBox')).split(' ').map(Number);
      [440, 72, 320, 312].forEach((value, index) => assert.ok(Math.abs(crop[index] - value) < 1e-6));
      assert.ok(await page.locator('.pe-zoom image').getAttribute('clip-path'));
    }
    await page.screenshot({ path: resolve(`test-results/renderers/${kinds[i]}.png`), fullPage: true });
    while (await page.getByRole('button', { name: '上一步' }).isEnabled()) await page.getByRole('button', { name: '上一步' }).click();
    assert.equal(await page.locator('.subtitle-text').innerText(), firstSubtitle);
  }
  await page.getByRole('button', { name: '关闭字幕' }).click();
  assert.equal(await page.locator('.subtitle-text').count(), 0);
  await page.getByRole('button', { name: '显示字幕' }).click();
  await page.locator('body').click({ position: { x: 2, y: 2 } });
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByTestId('step-count').innerText(), '2 / 3');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.getByTestId('step-count').innerText(), '1 / 3');
  await page.keyboard.press('s');
  assert.equal(await page.locator('.subtitle-text').count(), 0);
  await page.keyboard.press('s');
  await page.getByRole('button', { name: '切换浅色' }).click();
  await page.screenshot({ path: resolve('test-results/renderers/light.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByRole('button', { name: '算法跟踪' }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: resolve('test-results/renderers/mobile.png'), fullPage: true });
  // Auto mode re-arms even if the next step's text length happens to be unchanged.
  await page.clock.install();
  await page.getByRole('button', { name: '自动播放' }).click();
  for (let i = 0; i < 5; i++) await page.clock.fastForward(30000);
  assert.equal(await page.getByTestId('step-count').innerText(), '4 / 4');
  assert.equal(await page.getByRole('button', { name: '自动播放' }).count(), 1);
  const broken = await browser.newPage();
  await broken.route('**/fixture-figure.svg', (route) => route.abort());
  await broken.goto(`http://127.0.0.1:${address.port}`);
  await broken.getByRole('button', { name: '原图检查' }).click();
  await broken.getByRole('alert').waitFor();
  assert.match(await broken.getByRole('alert').innerText(), /无法加载原图/);
  await broken.close();
  assert.deepEqual(errors, []);
  console.log('PASS: five scenes, backward seek, KaTeX, figure crop/error, subtitle clearance, keyboard, light/mobile, auto playback; no page errors.');
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((done, reject) => server.httpServer.close((error) => error ? reject(error) : done()));
}
