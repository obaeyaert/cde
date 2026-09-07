import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path';
const exe=fs.readdirSync(path.join(process.env.HOME,'.cache/ms-playwright')).filter(d=>d.startsWith('chromium-')).sort().at(-1);
const browser=await chromium.launch({executablePath:path.join(process.env.HOME,'.cache/ms-playwright',exe,'chrome-linux64/chrome'),args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:1440,height:900}});
for (const [label,base] of [['wp','https://www.cdegroupe.com'],['vercel',process.env.ASTRO_BASE]]) {
  const page=await ctx.newPage();
  await page.goto(base+'/',{waitUntil:'networkidle',timeout:60000});
  const home=await page.evaluate(()=>{const isWp=!!document.querySelector('.fusion-header-wrapper'); const h=document.querySelector(isWp?'.fusion-header-wrapper':'.site-header').getBoundingClientRect(); const s=document.querySelector(isWp?'#sliders-container':'.hero').getBoundingClientRect(); const sec=document.querySelector(isWp?'#content .post-content > .fusion-fullwidth':'.page-content > .awb-section').getBoundingClientRect(); return `header ${Math.round(h.top)}→${Math.round(h.bottom)} | slider ${Math.round(s.top+scrollY)}→${Math.round(s.bottom+scrollY)} (h${Math.round(s.height)}) | section0 top ${Math.round(sec.top+scrollY)} pt ${getComputedStyle(document.querySelector(isWp?'#content .post-content > .fusion-fullwidth':'.page-content > .awb-section')).paddingTop}`;});
  console.log(label.padEnd(7),'HOME  ',home);
  await page.goto(base+'/marques-partenaires/',{waitUntil:'networkidle',timeout:60000});
  const cols=await page.evaluate(()=>{const isWp=!!document.querySelector('.fusion-header-wrapper'); return [...document.querySelectorAll(isWp?'#content .fusion-layout-column':'.awb-col')].slice(2,12).map(c=>{const b=c.getBoundingClientRect(); const s=getComputedStyle(c); return `${Math.round(b.top+scrollY)}→${Math.round(b.bottom+scrollY)} mb${s.marginBottom} pb${s.paddingBottom}`;}).join(' | ');});
  console.log(label.padEnd(7),'COLS  ',cols);
  await page.close();
}
await browser.close();
