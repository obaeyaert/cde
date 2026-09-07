import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path';
const exe=fs.readdirSync(path.join(process.env.HOME,'.cache/ms-playwright')).filter(d=>d.startsWith('chromium-')).sort().at(-1);
const browser=await chromium.launch({executablePath:path.join(process.env.HOME,'.cache/ms-playwright',exe,'chrome-linux64/chrome'),args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:800},deviceScaleFactor:1,isMobile:true,hasTouch:true});
for (const [label,base] of [['wp','https://www.cdegroupe.com'],['vercel',process.env.ASTRO_BASE||'https://cde-roan-six.vercel.app']]) {
  const page=await ctx.newPage();
  for (const [name,url] of [['contact','/contact/'],['linge','/materiel-hotelier/linge-hotel/'],['marques','/marques-partenaires/']]) {
    await page.goto(base+url,{waitUntil:'networkidle',timeout:60000});
    const r=await page.evaluate(()=>{
      const cs=(sel,props)=>{const e=document.querySelector(sel); if(!e) return null; const s=getComputedStyle(e); const o={}; for(const p of props) o[p]=s[p]; const b=e.getBoundingClientRect(); o.w=Math.round(b.width); o.h=Math.round(b.height); return o;};
      const isWp=!!document.querySelector('.fusion-header-wrapper');
      const sec=isWp?'#content .post-content > .fusion-fullwidth':'.page-content > .awb-section';
      const col=isWp?'#content .fusion-layout-column':'.awb-col';
      const cols=[...document.querySelectorAll(col)].slice(0,4).map(c=>{const s=getComputedStyle(c);return `${Math.round(c.getBoundingClientRect().width)}w mb${s.marginBottom}`;});
      return {
        header: cs(isWp?'.fusion-header-wrapper':'.site-header',['height']),
        logo: cs(isWp?'.fusion-logo img':'.logo img',['width','height']),
        body: cs('body',['fontSize','lineHeight']),
        h1: cs(isWp?'#content h1, #content h2':'.page-content h1, .page-content h2',['fontSize','lineHeight']),
        h2: cs(isWp?'#content h2':'.page-content h2',['fontSize']),
        h3: cs(isWp?'#content h3':'.page-content h3',['fontSize']),
        sec0: cs(sec,['paddingTop','paddingBottom']),
        row: cs(isWp?'#content .fusion-builder-row':'.awb-row',['paddingLeft','paddingRight','width']),
        cols,
        footerTitle: cs(isWp?'.widget-title':'.widget-title',['fontSize','lineHeight']),
      };
    });
    console.log(`${label.padEnd(6)} ${name.padEnd(8)}`, JSON.stringify(r));
  }
  await page.close();
}
await browser.close();
