import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

const urls = fs.readFileSync('urls.txt','utf8').trim().split('\n');
const out = [];
for (const u of urls) {
  const slug = u === '/' ? '__home__' : u.replace(/^\//,'').replace(/\/$/,'').replace(/\//g,'__');
  const f = path.join('pages', slug + '.html');
  const html = fs.readFileSync(f,'utf8');
  if (html.length < 100) { out.push({url:u, slug, redirect:true}); continue; }
  const $ = cheerio.load(html);
  const ld = [];
  $('script[type="application/ld+json"]').each((i,e)=>{ try{ ld.push(JSON.parse($(e).html())); }catch{} });
  const content = $('main#main div.fusion-row section#content');
  out.push({
    url: u, slug, redirect: false,
    bodyId: ($('body').attr('class')||'').match(/page-id-(\d+)/)?.[1] ?? null,
    title: $('title').text(),
    description: $('meta[name=description]').attr('content') ?? null,
    canonical: $('link[rel=canonical]').attr('href') ?? null,
    ogTitle: $('meta[property="og:title"]').attr('content') ?? null,
    ogDesc: $('meta[property="og:description"]').attr('content') ?? null,
    ogImage: $('meta[property="og:image"]').attr('content') ?? null,
    robots: $('meta[name=robots]').attr('content') ?? null,
    h1: $('#content h1').map((i,e)=>$(e).text().trim()).get(),
    h2: $('#content h2').map((i,e)=>$(e).text().trim()).get(),
    h3: $('#content h3').map((i,e)=>$(e).text().trim()).get(),
    textLen: content.text().replace(/\s+/g,' ').trim().length,
    contentHtml: content.html() ?? null,
    hasSlider: $('#sliders-container').children().length > 0,
    hasForm: $('form.wpcf7-form').length > 0,
    images: [...new Set($('#content img').map((i,e)=>$(e).attr('data-orig-src')||$(e).attr('src')).get().filter(Boolean))],
    jsonld: ld,
  });
}
fs.mkdirSync('extracted',{recursive:true});
for (const p of out) fs.writeFileSync(`extracted/${p.slug}.json`, JSON.stringify(p,null,2));
fs.writeFileSync('extracted/_index.json', JSON.stringify(out.map(({contentHtml,jsonld,...r})=>r),null,2));
console.log('url'.padEnd(58), 'txt'.padStart(6), 'h1', 'imgs', 'slider', 'form');
for (const p of out) console.log(
  (p.url).padEnd(58),
  String(p.redirect?'301':p.textLen).padStart(6),
  String(p.h1?.length ?? '-').padStart(3),
  String(p.images?.length ?? '-').padStart(4),
  p.hasSlider?'SLIDER':'      ',
  p.hasForm?'FORM':''
);
