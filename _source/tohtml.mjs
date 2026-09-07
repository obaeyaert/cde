/**
 * Convertit le HTML rendu par Avada en HTML sémantique qui PRÉSERVE la mise en page :
 * sections pleine largeur, lignes, colonnes et leurs largeurs, fonds, espacements.
 *
 * C'est ce que la conversion Markdown à plat perdait : la home et les Réalisations sont
 * des compositions en colonnes (texte | liste, grilles 3×2, cartes 2 colonnes…).
 *
 * Entrée  : pages/<slug>.html (HTML WordPress) + image-map.json + ../src/generated/image-sizes.json
 * Sortie  : html/<slug>.html (corps de page) + used-images.txt
 *
 * Éléments Avada rencontrés sur ce site (inventaire) : fusion-text, fusion-image-element,
 * fusion-slider-sc, fusion-separator, fusion-sep-clear, fusion-testimonials. Rien d'autre.
 */
import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

const urls = fs.readFileSync('urls.txt', 'utf8').trim().split('\n');
const imageMap = JSON.parse(fs.readFileSync('image-map.json', 'utf8'));
const sizes = fs.existsSync('../src/generated/image-sizes.json')
  ? JSON.parse(fs.readFileSync('../src/generated/image-sizes.json', 'utf8'))
  : {};

const SITE = 'https://www.cdegroupe.com';
const vercel = JSON.parse(fs.readFileSync('../vercel.json', 'utf8'));
const REDIRECTS = Object.fromEntries(vercel.redirects.filter((r) => !r.source.includes(':')).map((r) => [r.source, r.destination]));
const usedImages = new Set();

/* ---------- utilitaires ---------- */

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

/** URL d'upload WordPress -> /media/... en remontant du thumbnail vers l'original. */
function toMedia(url) {
  if (!url) return null;
  let rel = url.replace(`${SITE}/wp-content/uploads/`, '').replace(/^\/wp-content\/uploads\//, '');
  if (rel.startsWith('http') || rel.startsWith('data:')) return null;
  rel = imageMap[rel] ?? rel.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
  usedImages.add(rel);
  return '/media/' + rel;
}

/** Lien interne en relatif, avec slash final ; les autres inchangés. */
function toHref(href) {
  if (!href) return null;
  let h = href.trim().replace(/^<|>$/g, '');
  if (h.startsWith(SITE)) h = h.slice(SITE.length) || '/';
  if (h.startsWith('/wp-content/uploads/')) return toMedia(h) ?? h;
  if (h.startsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(h.split('#')[0].split('?')[0]) && !h.endsWith('/')) {
    h = h.replace(/^([^#?]*)/, '$1/');
  }
  // suit les 301 connus pour pointer directement la page finale
  for (let i = 0; i < 3 && REDIRECTS[h]; i++) h = REDIRECTS[h];
  return h;
}

/** Propriétés inline que l'on conserve : ce sont des choix de design, pas du bruit. */
const KEEP_STYLE = new Set(['font-size', 'color', 'text-shadow', 'text-align', 'text-transform', 'font-weight', 'line-height', 'margin-top', 'margin-bottom', 'letter-spacing']);
function keepStyle(style) {
  if (!style) return null;
  const out = [];
  for (const decl of style.split(';')) {
    const [k, ...v] = decl.split(':');
    const key = clean(k).toLowerCase();
    const val = clean(v.join(':'));
    if (!KEEP_STYLE.has(key) || !val) continue;
    if (key === 'line-height' && !/px|em|^\d/.test(val)) continue;
    // La taille passe par une variable : le CSS mobile applique la reduction du theme
    // (loi lineaire mesuree) sans pouvoir lire un font-size inline.
    if (key === 'font-size' && /^\d+(\.\d+)?px$/.test(val)) { out.push(`--fs:${val}`); out.push('font-size:var(--fs)'); continue; }
    out.push(`${key}:${val}`);
  }
  return out.length ? out.join(';') : null;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Balise <picture> responsive à partir du manifeste (ou <img> nu si inconnue). */
function picture(src, { alt = '', cls = '', eager = false, sizesAttr = '(max-width: 1170px) 100vw, 1170px' } = {}) {
  const entry = sizes[src];
  const attrs = [
    `src="${esc(src)}"`,
    `alt="${esc(alt)}"`,
    entry ? `width="${entry.width}" height="${entry.height}"` : '',
    eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"',
    cls ? `class="${cls}"` : '',
  ].filter(Boolean).join(' ');
  if (!entry?.srcset?.length) return `<img ${attrs}>`;
  const srcset = entry.srcset.map((v) => `${v.url} ${v.width}w`).join(', ');
  return `<picture><source srcset="${srcset}" sizes="${sizesAttr}" type="image/webp"><img ${attrs}></picture>`;
}

/** Alt lisible : les alt WordPress sont des noms de fichiers. */
function readableAlt(raw) {
  const a = clean(raw);
  if (!a || /\s/.test(a)) return a;
  return a.replace(/^cde-comptoir-distribution-exportation-/i, '').replace(/[-_]+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());
}

/* ---------- conversion du texte riche ---------- */

const INLINE_KEEP = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'strong', 'b', 'em', 'i', 'span', 'br', 'blockquote', 'u', 'sup', 'sub', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img']);

function richText($, root) {
  const walk = (node) => {
    if (node.type === 'text') return esc(node.data).replace(/&nbsp;| /g, ' ');
    if (node.type !== 'tag') return '';
    const tag = node.tagName.toLowerCase();
    const $n = $(node);

    // Icône Font Awesome -> élément neutre que le CSS habille en SVG.
    if (tag === 'i' && /\bfa-/.test($n.attr('class') ?? '')) {
      const name = ($n.attr('class') ?? '').split(' ').find((c) => /^fa-(?!fw$)/.test(c))?.replace(/^fa-/, '');
      return name ? `<span class="icon icon-${name}" aria-hidden="true"></span>` : '';
    }
    if (tag === 'img') {
      const src = toMedia($n.attr('data-src') || $n.attr('data-orig-src') || $n.attr('src'));
      return src ? picture(src, { alt: readableAlt($n.attr('alt')) }) : '';
    }
    if (tag === 'script' || tag === 'style' || tag === 'noscript') return '';
    if (/\bawb-form-slot\b/.test($n.attr('class') ?? '')) return '<!--CONTACT_FORM-->';

    const inner = node.children.map(walk).join('');
    if (!INLINE_KEEP.has(tag)) return inner;
    if (tag === 'div') return inner;

    const attrs = [];
    if (tag === 'a') {
      const href = toHref($n.attr('href'));
      if (!href) return inner;
      attrs.push(`href="${esc(href)}"`);
      if (/^https?:\/\//.test(href) && !href.startsWith(SITE)) attrs.push('target="_blank" rel="noopener noreferrer"');
      if ($n.attr('title')) attrs.push(`title="${esc($n.attr('title'))}"`);
    }
    const cls = ($n.attr('class') ?? '').split(' ').filter((c) => c === 'list-title').join(' ');
    if (cls) attrs.push(`class="${cls}"`);
    const style = keepStyle($n.attr('style'));
    if (style) attrs.push(`style="${esc(style)}"`);
    if (tag === 'br') return '<br>';
    const open = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
    return `${open}${inner}</${tag}>`;
  };
  return root.contents().map((_, n) => walk(n)).get().join('');
}

/* ---------- éléments Avada ---------- */

function convertElement($, el) {
  const $el = $(el);
  const cls = $el.attr('class') ?? '';

  // Les separateurs portent aussi "fusion-clearfix" : les tester avant d'ecarter les clearfix purs.
  if (/\bfusion-sep-clear\b/.test(cls)) return '';
  if (/\bfusion-clearfix\b/.test(cls) && !/\bfusion-separator\b/.test(cls)) return '';

  if (/\bawb-form-slot\b/.test(cls)) return '<!--CONTACT_FORM-->';

  if (/\bfusion-text\b/.test(cls)) {
    const html = richText($, $el).trim();
    if (!html) return '';
    const st = ($el.attr('style') ?? '').replace(/--awb-/g, '');
    const pad = st.match(/(?:^|;)\s*padding:\s*([^;]+)/)?.[1];
    const mb = st.match(/margin-bottom:\s*([^;]+)/)?.[1];
    const vars = [pad && `--p:${pad}`, mb && `--mb:${mb}`].filter(Boolean);
    return `<div class="awb-text"${vars.length ? ` style="${vars.join(';')}"` : ''}>${html}</div>`;
  }

  if (/\bfusion-image-element\b/.test(cls)) {
    const img = $el.find('img').first();
    const src = toMedia(img.attr('data-src') || img.attr('data-orig-src') || img.attr('src'));
    if (!src) return '';
    const link = $el.find('a').first();
    const href = toHref(link.attr('href'));
    const frame = $el.find('.fusion-imageframe').attr('class') ?? '';
    const classes = ['awb-image'];
    if (/fusion-image-align-center/.test(cls) || /text-align:\s*center/.test($el.attr('style') ?? '')) classes.push('is-center');
    if (/imageframe-dropshadow/.test(frame)) classes.push('has-shadow');
    if (/hover-type-zoomin/.test(frame)) classes.push('has-zoom');
    const pic = picture(src, { alt: readableAlt(img.attr('alt')) });
    const body = href && !href.startsWith('/media/') ? `<a href="${esc(href)}">${pic}</a>` : pic;
    return `<figure class="${classes.join(' ')}">${body}</figure>`;
  }

  if (/\bfusion-slider-sc\b/.test(cls)) {
    const slides = $el.find('img').map((_, i) => {
      const src = toMedia($(i).attr('data-src') || $(i).attr('data-orig-src') || $(i).attr('src'));
      return src ? picture(src, { alt: readableAlt($(i).attr('alt')), sizesAttr: '(max-width: 700px) 100vw, 560px' }) : '';
    }).get().filter(Boolean);
    if (slides.length === 0) return '';
    if (slides.length === 1) return `<figure class="awb-image">${slides[0]}</figure>`;
    return `<div class="awb-slider" data-slider>${slides.map((s, i) => `<div class="awb-slide"${i === 0 ? ' data-active' : ''}>${s}</div>`).join('')}</div>`;
  }

  if (/\bfusion-separator\b/.test(cls)) {
    const style = ($el.attr('style') ?? '').replace(/--awb-/g, '');
    const border = $el.find('.fusion-separator-border');
    const bstyle = (border.attr('style') ?? '').replace(/--awb-/g, '');
    const mt = style.match(/margin-top:\s*([^;]+)/)?.[1];
    const mb = style.match(/margin-bottom:\s*([^;]+)/)?.[1];
    const maxW = style.match(/max-width:\s*([^;]+)/)?.[1];
    const vars = [mt && `--mt:${mt}`, mb && `--mb:${mb}`, maxW && `--w:${maxW}`].filter(Boolean);
    if (border.length && /border-(top|bottom)-width:\s*[1-9]/.test(bstyle)) {
      const color = bstyle.match(/border-color:\s*([^;]+)/)?.[1];
      const top = bstyle.match(/border-top-width:\s*([^;]+)/)?.[1] ?? '0';
      const bottom = bstyle.match(/border-bottom-width:\s*([^;]+)/)?.[1] ?? '0';
      vars.push(`--bt:${top}`, `--bb:${bottom}`);
      if (color) vars.push(`--c:${color}`);
      const left = /float:\s*left/.test(style) ? ' is-left' : '';
      const dbl = top !== '0' && top !== '0px' && bottom !== '0' && bottom !== '0px' ? ' is-double' : '';
      return `<hr class="awb-sep${left}${dbl}" style="${vars.join(';')}">`;
    }
    return `<div class="awb-space" style="${vars.join(';')}"></div>`;
  }

  if (/\bfusion-testimonials\b/.test(cls)) {
    const quote = $el.find('.awb-quote-content, blockquote').first();
    quote.find('span[style*="position: absolute"]').remove(); // le grand guillemet décoratif, refait en CSS
    const text = richText($, quote).trim();
    const author = $el.find('.author');
    const authorHtml = author.length ? richText($, author).trim() : '';
    return `<blockquote class="awb-testimonial">${text}${authorHtml ? `<footer>${authorHtml}</footer>` : ''}</blockquote>`;
  }

  // Conteneur intermédiaire inconnu : on descend.
  if (el.tagName === 'div' && $el.children().length) {
    return $el.children().map((_, c) => convertElement($, c)).get().join('');
  }
  return '';
}

/* ---------- colonnes et sections ---------- */

function convertColumn($, col) {
  const $c = $(col);
  const cls = $c.attr('class') ?? '';
  const style = ($c.attr('style') ?? '').replace(/--awb-/g, '');
  // Avada ecrit deux fois width: la valeur nue puis le calc() qui retranche les gouttieres.
  // C'est la derniere qui fait foi.
  const widths = [...style.matchAll(/(?:^|;)\s*width:\s*([^;]+)/g)].map((m) => m[1].trim());
  const width = widths.at(-1) ?? '100%';
  const isLast = /fusion-column-last/.test(cls);
  const mr = isLast ? null : style.match(/margin-right:\s*([^;]+)/)?.[1];
  const mb = style.match(/margin-bottom:\s*([^;]+)/)?.[1];
  const bg = style.match(/bg-color:\s*([^;]+)/)?.[1];
  const vars = [`--w:${width}`, mr && `--mr:${mr}`, mb && `--mb:${mb}`, bg && `--bg:${bg}`].filter(Boolean);
  // Bordures de colonne (filets au-dessus/en dessous des titres de section).
  const bcolor = style.match(/border-color:\s*([^;]+)/)?.[1];
  if (bcolor && /border-style:\s*solid/.test(style)) {
    vars.push(`--bc:${bcolor}`);
    for (const side of ['top', 'bottom', 'left', 'right']) {
      const v = style.match(new RegExp(`border-sizes-${side}:\\s*([^;]+)`))?.[1];
      if (v && v !== '0px' && v !== '0') vars.push(`--b${side[0]}:${v}`);
    }
  }
  const classes = ['awb-col'];
  if (/fusion-column-has-shadow/.test($c.find('> .fusion-column-wrapper').attr('class') ?? '')) classes.push('has-shadow');
  if (/fusion-column-last/.test(cls)) classes.push('is-last');
  if (/fusion-column-first/.test(cls)) classes.push('is-first');
  const wrapper = $c.find('> .fusion-column-wrapper');
  const inner = (wrapper.length ? wrapper : $c).children().map((_, e) => convertElement($, e)).get().join('');
  return `<div class="${classes.join(' ')}" style="${vars.join(';')}">${inner}</div>`;
}

function convertSection($, sec) {
  const $s = $(sec);
  const style = ($s.attr('style') ?? '').replace(/--awb-/g, '');
  const pt = style.match(/padding-top:\s*([^;]+)/)?.[1];
  const pb = style.match(/padding-bottom:\s*([^;]+)/)?.[1];
  const bgc = style.match(/background-color:\s*([^;]+)/)?.[1];
  const bgi = style.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/)?.[1];
  const bgp = style.match(/background-position:\s*([^;]+)/)?.[1];
  const vars = [pt && `--pt:${pt}`, pb && `--pb:${pb}`, bgc && `--bg:${bgc}`, bgp && `--bg-pos:${bgp}`].filter(Boolean);
  const classes = ['awb-section'];
  if (bgi) {
    const media = toMedia(bgi);
    if (media) {
      const webp = sizes[media]?.webp ?? media;
      vars.push(`--bg-img:url(${webp})`);
      classes.push('has-bg-image');
    }
  }
  if (/fusion-equal-height-columns/.test($s.attr('class') ?? '')) classes.push('equal-heights');
  // La ligne est en general enfant direct, mais Avada l'enveloppe parfois
  // (fusion-fullwidth-center-content pour le centrage vertical).
  const row = $s.find('.fusion-builder-row').first();
  if ($s.find('> .fusion-fullwidth-center-content').length) classes.push('is-centered');
  const cols = row.find('> .fusion-layout-column').map((_, c) => convertColumn($, c)).get().join('');
  return `<section class="${classes.join(' ')}" style="${vars.join(';')}"><div class="awb-row">${cols}</div></section>`;
}

/* ---------- pages ---------- */

fs.mkdirSync('html', { recursive: true });
const report = [];

for (const u of urls) {
  const slug = u === '/' ? '__home__' : u.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '__');
  const raw = fs.readFileSync(path.join('pages', `${slug}.html`), 'utf8');
  if (raw.length < 100) continue; // redirection

  const $ = cheerio.load(raw);
  const content = $('#content .post-content');
  content.find('.rich-snippet-hidden, script, style, noscript, .screen-reader-response').remove();
  // Le formulaire Contact Form 7 est reconstruit au build : on marque sa position exacte.
  content.find('.wpcf7').replaceWith('<div class="awb-form-slot">CONTACT_FORM</div>');
  content.find('form').remove();

  const sections = content.find('> .fusion-fullwidth');
  let html;
  if (sections.length) {
    html = sections.map((_, s) => convertSection($, s)).get().join('\n');
  } else {
    // Page sans page-builder (mentions légales) : texte riche dans une section simple.
    html = `<section class="awb-section is-plain"><div class="awb-row"><div class="awb-col" style="--w:100%"><div class="awb-text">${richText($, content)}</div></div></div></section>`;
  }

  // Un seul H1 par page : s'il n'y en a pas, le premier H2 est promu en place (texte et
  // style inline inchangés — seul le niveau sémantique bouge).
  // Page sans aucun titre dans le contenu (mentions legales) : le H1 est celui du bandeau,
  // comme sur le WordPress ou le slider porte un <h1>. Rien a injecter ici.
  if (!/<h1[\s>]/.test(html)) {
    let done = false;
    html = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/, (m, attrs = '', inner) => {
      if (done) return m;
      done = true;
      const withClass = /class="/.test(attrs) ? attrs.replace(/class="/, 'class="as-h2 ') : `${attrs} class="as-h2"`;
      return `<h1${withClass}>${inner}</h1>`;
    });
  }

  fs.writeFileSync(path.join('html', `${slug}.html`), html);
  report.push({ slug, sections: sections.length, chars: html.length, imgs: (html.match(/<img /g) ?? []).length, sliders: (html.match(/awb-slider/g) ?? []).length });
}

fs.writeFileSync('used-images.txt', [...usedImages].sort().join('\n'));
console.log('page'.padEnd(64), 'sect', 'imgs', 'sliders', 'octets');
for (const r of report) console.log(r.slug.padEnd(64), String(r.sections).padStart(4), String(r.imgs).padStart(4), String(r.sliders).padStart(7), String(r.chars).padStart(7));
console.log('\nimages référencées :', usedImages.size);
