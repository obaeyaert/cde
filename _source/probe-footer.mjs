import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path';
const exe=fs.readdirSync(path.join(process.env.HOME,'.cache/ms-playwright')).filter(d=>d.startsWith('chromium-')).sort().at(-1);
const browser=await chromium.launch({executablePath:path.join(process.env.HOME,'.cache/ms-playwright',exe,'chrome-linux64/chrome'),args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
for (const [label,base] of [['wp','https://www.cdegroupe.com'],['vercel',process.env.ASTRO_BASE]]) {
  const page=await ctx.newPage(); await page.goto(base+'/materiel-hotelier/linge-hotel/',{waitUntil:'networkidle',timeout:60000});
  const r=await page.evaluate(()=>{const q=(s)=>document.querySelector(s); const isWp=!!q('.fusion-footer'); const f=q(isWp?'.fusion-footer-widget-area':'.site-footer .widgets'); const c=q(isWp?'#footer':'.copyright'); const fs=getComputedStyle(f), cs=getComputedStyle(c);
    const cols=[...document.querySelectorAll(isWp?'.fusion-footer-widget-column':'.site-footer .widget')].map(e=>{const s=getComputedStyle(e); return `${Math.round(e.getBoundingClientRect().height)}h mb${s.marginBottom} pb${s.paddingBottom}`;});
    return {widgets:{h:Math.round(f.getBoundingClientRect().height),pt:fs.paddingTop,pb:fs.paddingBottom}, cols, copyright:{h:Math.round(c.getBoundingClientRect().height),pt:cs.paddingTop,pb:cs.paddingBottom}, mainMb:getComputedStyle(q(isWp?'#main':'.page-content')).paddingBottom, footerMt:getComputedStyle(q(isWp?'.fusion-footer':'.site-footer')).marginTop};});
  console.log(label.padEnd(7), JSON.stringify(r)); await page.close();
}
await browser.close();
