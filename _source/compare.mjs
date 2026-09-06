/** Composites WP | Astro (réduits) + score de différence pixel sur la hauteur commune. */
import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const DIR='/tmp/claude-1000/-home-olivier-Code-perso/e86d7072-c3c0-4ce3-9add-2a232dfe9227/scratchpad/cmp';
const names=[...new Set(fs.readdirSync(DIR).filter(f=>f.endsWith('__wp.png')).map(f=>f.replace('__wp.png','')))];
const rows=[];
for (const n of names) {
  const a=path.join(DIR,`${n}__wp.png`), b=path.join(DIR,`${n}__astro.png`);
  if(!fs.existsSync(b)) continue;
  const [ma,mb]=await Promise.all([sharp(a).metadata(),sharp(b).metadata()]);
  const h=Math.min(ma.height,mb.height,9000);
  const W=720, H=Math.round(h*W/1440);
  const [ra,rb]=await Promise.all([
    sharp(a).extract({left:0,top:0,width:1440,height:h}).resize(W,H).removeAlpha().raw().toBuffer(),
    sharp(b).extract({left:0,top:0,width:1440,height:h}).resize(W,H).removeAlpha().raw().toBuffer()]);
  let diff=0; for (let i=0;i<ra.length;i++) diff+=Math.abs(ra[i]-rb[i]);
  const score=diff/ra.length/255*100;
  // composite côte à côte, hauteur plafonnée pour rester lisible
  const capH=Math.min(H,2600);
  await sharp({create:{width:W*2+20,height:capH,channels:3,background:'#ff00ff'}})
    .composite([{input:await sharp(a).extract({left:0,top:0,width:1440,height:Math.min(h,Math.round(capH*2))}).resize(W).png().toBuffer(),left:0,top:0},
                {input:await sharp(b).extract({left:0,top:0,width:1440,height:Math.min(h,Math.round(capH*2))}).resize(W).png().toBuffer(),left:W+20,top:0}])
    .png().toFile(path.join(DIR,`side_${n}.png`));
  rows.push([n, ma.height, mb.height, score]);
}
rows.sort((x,y)=>y[3]-x[3]);
for (const [n,ha,hb,s] of rows) console.log(String(s.toFixed(1)).padStart(5)+'%', String(ha).padStart(5), String(hb).padStart(5), n);
