import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path';
const exe=fs.readdirSync(path.join(process.env.HOME,'.cache/ms-playwright')).filter(d=>d.startsWith('chromium-')).sort().at(-1);
const browser=await chromium.launch({executablePath:path.join(process.env.HOME,'.cache/ms-playwright',exe,'chrome-linux64/chrome'),args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:1440,height:900}});
const slug=process.argv[2]||'/materiel-hotelier/linge-hotel/';
const out={};
for (const [label,base,root] of [['wp','https://www.cdegroupe.com','#content'],['astro','http://localhost:4321','.page-content']]) {
  const page=await ctx.newPage(); await page.goto(base+slug,{waitUntil:'networkidle',timeout:60000});
  out[label]=await page.evaluate((root)=>{
    const r=document.querySelector(root); const items=[];
    for (const e of r.querySelectorAll('h1,h2,h3,p,ul,img,hr,.fusion-separator,.awb-sep,.awb-space,blockquote')) {
      if (e.closest('.awb-slider,.fusion-slider-sc') && e.tagName==='IMG') continue;
      const b=e.getBoundingClientRect(); if(b.height===0 && !/hr|sep|space/i.test(e.tagName+e.className)) continue;
      const s=getComputedStyle(e);
      items.push({tag:e.tagName.toLowerCase()+(e.className&&/sep|space/.test(e.className)?'.sep':''), top:Math.round(b.top+scrollY), h:Math.round(b.height), mt:s.marginTop, mb:s.marginBottom, fs:s.fontSize, txt:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,28)});
    }
    const footer=document.querySelector('.fusion-footer, .site-footer');
    items.push({tag:'FOOTER', top:Math.round(footer.getBoundingClientRect().top+scrollY), h:Math.round(footer.getBoundingClientRect().height)});
    return items;
  },root);
  await page.close();
}
await browser.close();
const n=Math.max(out.wp.length,out.astro.length);
console.log('WP'.padEnd(58),'| ASTRO');
for (let i=0;i<n;i++){ const a=out.wp[i],b=out.astro[i]; const f=(x)=>x?`${String(x.top).padStart(5)} h${String(x.h).padStart(4)} ${x.tag.padEnd(7)} ${(x.fs||'').padStart(4)} ${(x.mt||'').padStart(6)}/${(x.mb||'').padEnd(6)} ${x.txt||''}`:''; console.log(f(a).padEnd(58).slice(0,58),'|',f(b)); }
