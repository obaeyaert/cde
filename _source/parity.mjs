import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';

const idx = JSON.parse(fs.readFileSync('_source/extracted/_index.json', 'utf8'));
const DIST = '.vercel/output/static';
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

let ko = 0;
const rows = [];
for (const m of idx) {
  if (m.redirect) continue;
  const rel = m.url === '/' ? 'index.html' : path.join(m.url.replace(/^\//, ''), 'index.html');
  const file = path.join(DIST, rel);
  if (!fs.existsSync(file)) { rows.push([m.url, 'ABSENT', '', '', '']); ko++; continue; }

  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  const got = {
    title: norm($('title').text()),
    desc: norm($('meta[name=description]').attr('content')),
    canon: $('link[rel=canonical]').attr('href'),
    h1: norm($('main h1').first().text()),
    text: norm($('main article').length ? $('main article').text() : $('main').clone().find('.breadcrumb').remove().end().text()).length,
  };
  const want = {
    title: norm(m.title), desc: norm(m.description), canon: m.canonical,
    h1: norm(m.h1?.[0] ?? ''), text: m.textLen,
  };
  const flag = (a, b) => (a === b ? 'ok' : 'DIFF');
  // WordPress n'avait pas de H1 sur 7 pages : on en a ajoute un, c'est voulu.
  const h1Flag = want.h1 === '' ? (got.h1 ? 'ajouté' : 'DIFF') : flag(got.h1, want.h1);
  // le texte est reconstruit : on tolère un écart, on signale une perte franche
  const ratio = want.text ? got.text / want.text : 1;
  const textFlag = ratio >= 0.8 ? 'ok' : ratio >= 0.6 ? 'court' : 'PERTE';
  const line = [flag(got.title, want.title), flag(got.desc, want.desc), flag(got.canon, want.canon), h1Flag, textFlag];
  if (line.some((f) => f === 'DIFF' || f === 'PERTE' || f === 'ABSENT')) ko++;
  rows.push([m.url, ...line, `${Math.round(ratio * 100)}%`]);
}

console.log('URL'.padEnd(60), 'title', 'desc', 'canon', 'h1', 'texte');
for (const [url, t, d, c, h, tx, r] of rows) {
  console.log(url.padEnd(60), String(t).padEnd(5), String(d).padEnd(4), String(c).padEnd(5), String(h).padEnd(4), tx, r ?? '');
}
console.log('\npages en écart :', ko, '/', rows.length);
