import { chromium } from 'playwright-core'; import fs from 'node:fs'; import path from 'node:path';
const exe=fs.readdirSync(path.join(process.env.HOME,'.cache/ms-playwright')).filter(d=>d.startsWith('chromium-')).sort().at(-1);
const browser=await chromium.launch({executablePath:path.join(process.env.HOME,'.cache/ms-playwright',exe,'chrome-linux64/chrome'),args:['--no-sandbox']});
const vw=Number(process.env.VW||1440);
const ctx=await browser.newContext({viewport:{width:vw,height:900},isMobile:vw<800});
for (const [label,base] of [['wp','https://www.cdegroupe.com'],['vercel',process.env.ASTRO_BASE]]) {
  const page=await ctx.newPage();
  for (const [name,url] of [['bandeau','/materiel-hotelier/linge-hotel/'],['logos','/marques-partenaires/'],['tuiles','/']]) {
    await page.goto(base+url,{waitUntil:'networkidle',timeout:60000});
    const r=await page.evaluate(()=>{
      const isWp=!!document.querySelector('.fusion-header-wrapper');
      const els=[...document.querySelectorAll(isWp?'#content .fusion-image-element':'.page-content .awb-image')].slice(0,3);
      return els.map(el=>{const b=el.getBoundingClientRect(); const img=el.querySelector('img').getBoundingClientRect(); const s=getComputedStyle(el); const next=el.nextElementSibling; const nb=next?next.getBoundingClientRect():null;
        return `boîte ${Math.round(b.height)} / img ${Math.round(img.height)} => +${Math.round(b.height-img.height)}  mb ${s.marginBottom}  suivant à +${nb?Math.round(nb.top-b.bottom):'?'} (${next?.className.split(' ')[0]})`;});
    });
    console.log(label.padEnd(7), name.padEnd(8), r.join(' | '));
  }
  await page.close();
}
await browser.close();
