/**
 * Captures pleine page, viewport desktop 1440×900, WordPress d'origine et version Astro
 * côte à côte. Usage : node _source/shots.mjs [slug...]  (défaut : toutes les pages)
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/tmp/claude-1000/-home-olivier-Code-perso/e86d7072-c3c0-4ce3-9add-2a232dfe9227/scratchpad/cmp';
fs.mkdirSync(OUT, { recursive: true });

const exe = fs
  .readdirSync(path.join(process.env.HOME, '.cache/ms-playwright'))
  .filter((d) => d.startsWith('chromium-'))
  .sort()
  .at(-1);
const executablePath = path.join(process.env.HOME, '.cache/ms-playwright', exe, 'chrome-linux64/chrome');

const urls = fs.readFileSync('_source/urls.txt', 'utf8').trim().split('\n');
const wanted = process.argv.slice(2);
const targets = urls.filter((u) => wanted.length === 0 || wanted.some((w) => u.includes(w)));

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VW || 1440), height: Number(process.env.VH || 900) }, deviceScaleFactor: 1 });

const name = (u) => (u === '/' ? 'home' : u.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '__'));

for (const u of targets) {
  const pairs = [['wp', 'https://www.cdegroupe.com'], ['astro', (process.env.ASTRO_BASE || 'http://localhost:4321')]]
    .filter(([label]) => !process.env.ONLY || process.env.ONLY === label);
  for (const [label, base] of pairs) {
    const page = await ctx.newPage();
    try {
      await page.goto(base + u, { waitUntil: 'networkidle', timeout: 45000 });
      // fait défiler pour déclencher le lazy-load, puis remonte
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(800);
      // masque le badge reCAPTCHA et les cookies pour ne comparer que la page
      await page.addStyleTag({ content: '.grecaptcha-badge,#tarteaucitronRoot,#tarteaucitronAlertBig{display:none!important}' });
      const file = path.join(OUT, `${name(u)}__${label}${process.env.VW ? '_' + process.env.VW : ''}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(`${label.padEnd(6)} ${String(h).padStart(5)}px  ${u}`);
    } catch (e) {
      console.log(`${label.padEnd(6)} ERREUR ${u}: ${e.message.split('\n')[0]}`);
    }
    await page.close();
  }
}
await browser.close();
