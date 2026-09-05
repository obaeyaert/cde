import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import fs from 'node:fs';

const td = new TurndownService({ headingStyle:'atx', bulletListMarker:'-', codeBlockStyle:'fenced' });
td.keep(['iframe']);
// Les images passent en shortcode {img} pour être remappées ensuite
td.addRule('img', { filter:'img', replacement:(c,n)=>{
  const src=(n.getAttribute('data-orig-src')||n.getAttribute('data-src')||n.getAttribute('src')||'').replace(/^https:\/\/www\.cdegroupe\.com\/wp-content\/uploads\//,'');
  // Les alt WordPress sont des noms de fichiers ("Karibea-Beach-Resort-Gosier-bar").
  // On les rend lisibles sans rien inventer : les mots sont deja la, seuls les tirets
  // et le prefixe technique disparaissent.
  const rawAlt=(n.getAttribute('alt')||'').replace(/"/g,"'");
  const alt = /\s/.test(rawAlt) || rawAlt === ''
    ? rawAlt
    : rawAlt
        .replace(/^cde-comptoir-distribution-exportation-/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (c) => c.toUpperCase());
  const w=n.getAttribute('width')||'', h=n.getAttribute('height')||'';
  return src.startsWith('data:')?'':`\n\n![${alt}](/media/${src}${w?`#${w}x${h}`:''})\n\n`;
}});

const idx = JSON.parse(fs.readFileSync('extracted/_index.json','utf8'));
const usedImages = new Set();
fs.mkdirSync('markdown',{recursive:true});
const report=[];

for (const meta of idx) {
  if (meta.redirect) continue;
  const full = JSON.parse(fs.readFileSync(`extracted/${meta.slug}.json`,'utf8'));
  const $ = cheerio.load(`<div id="root">${full.contentHtml}</div>`);
  // purge du bruit Avada / WP
  $('.rich-snippet-hidden, .fusion-meta-info, script, style, noscript, .awb-hide, .screen-reader-text').remove();
  $('[class*="fusion-separator"], .fusion-sep-clear').remove();
  // Le formulaire Contact Form 7 est reconstruit par un composant Astro : ses libelles
  // ne doivent pas rester dans le contenu, sinon ils apparaissent en double.
  $('form, .wpcf7, .wpcf7-form, .screen-reader-response').remove();
  const body = $('.post-content').length ? $('.post-content') : $('#root');
  let html = body.html() ?? '';
  let md = td.turndown(html)
    // turndown eclate les liens qui entourent une image : on les recolle sur une ligne,
    // sinon le markdown n'est pas interprete et s'affiche en texte brut.
    .replace(/\[\s*\n+\s*(!\[[^\]]*\]\([^)]*\))\s*\n+\s*\]\(([^)]+)\)/g, '[$1]($2)')
    .replace(/\n{3,}/g,'\n\n')
    // Un H5 isole apres des H3 casse la hierarchie des titres (accessibilite et SEO).
    // On le ramene au niveau immediatement suivant : le texte affiche ne change pas.
    .replace(/^##### /gm, '#### ')
    .replace(/https:\/\/www\.cdegroupe\.com\/?/g,'/')  // liens internes en relatif
    // Les medias pointaient encore sur l'arborescence WordPress.
    .replace(/\]\(\/wp-content\/uploads\//g, '](/media/')
    // Le site sert des URL avec slash final (trailingSlash: always) : les liens internes
    // herites de WordPress en manquaient et seraient partis en 404.
    .replace(/\]\((\/[^)\s#?]*[^)\s#?\/.])(\s+"[^"]*")?\)/g,
      (m, url, title) => (/\.[a-z0-9]{2,5}$/i.test(url) ? m : `](${url}/${title ?? ''})`))
    .trim();
  for (const m of md.matchAll(/!\[[^\]]*\]\(\/media\/([^)#]+)/g)) usedImages.add(m[1]);
  fs.writeFileSync(`markdown/${meta.slug}.md`, md);
  report.push({slug:meta.slug, url:meta.url, chars:md.length, imgs:(md.match(/!\[/g)||[]).length, links:(md.match(/\]\(\//g)||[]).length});
}
fs.writeFileSync('used-images.txt',[...usedImages].sort().join('\n'));
console.log('slug'.padEnd(48),'chars'.padStart(6),'imgs'.padStart(5),'liens'.padStart(6));
for(const r of report) console.log(r.slug.padEnd(48),String(r.chars).padStart(6),String(r.imgs).padStart(5),String(r.links).padStart(6));
console.log('\nImages référencées dans le contenu :', usedImages.size);
