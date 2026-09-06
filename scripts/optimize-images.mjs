/**
 * Prépare public/media pour le web :
 *  - réencode et redimensionne les originaux qui dépassent MAX_W ;
 *  - génère les variantes WebP responsives (WIDTHS) ;
 *  - écrit src/generated/image-sizes.json, consommé par le plugin rehype pour poser
 *    width/height/srcset et supprimer tout décalage de mise en page.
 * Idempotent : relançable sans effet de bord.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'public/media';
const MAX_W = 1600;
const WIDTHS = [480, 800, 1600];
const QUALITY = { jpeg: 82, png: 90, webp: 78 };

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

const isSource = (f) => /\.(jpe?g|png)$/i.test(f);
const publicUrl = (f) => '/' + path.relative('public', f).split(path.sep).join('/');

const files = walk(ROOT).filter(isSource);
let before = 0, resized = 0, variants = 0;

const manifest = {};

for (const file of files) {
  before += fs.statSync(file).size;

  const meta = await sharp(file).metadata();
  const needsResize = (meta.width ?? 0) > MAX_W;
  if (needsResize) {
    const buf = await sharp(file)
      .resize({ width: MAX_W, withoutEnlargement: true })
      .toFormat(/\.png$/i.test(file) ? 'png' : 'jpeg', { quality: QUALITY.jpeg, mozjpeg: true })
      .toBuffer();
    fs.writeFileSync(file, buf);
    resized++;
  }

  const final = await sharp(file).metadata();
  const width = final.width ?? 0;
  const height = final.height ?? 0;

  // Variantes WebP : uniquement les largeurs utiles, jamais d'agrandissement.
  const targets = WIDTHS.filter((w) => w < width);
  const srcset = [];
  for (const w of targets) {
    const out = file.replace(/\.(jpe?g|png)$/i, `-${w}.webp`);
    if (!fs.existsSync(out)) {
      await sharp(file).resize({ width: w }).webp({ quality: QUALITY.webp }).toFile(out);
      variants++;
    }
    srcset.push({ url: publicUrl(out), width: w });
  }

  // Toujours une variante pleine taille, qui sert de fallback moderne.
  const full = file.replace(/\.(jpe?g|png)$/i, '.webp');
  if (!fs.existsSync(full)) {
    await sharp(file).webp({ quality: QUALITY.webp }).toFile(full);
    variants++;
  }
  srcset.push({ url: publicUrl(full), width });

  manifest[publicUrl(file)] = { width, height, webp: publicUrl(full), srcset };
}

fs.mkdirSync('src/generated', { recursive: true });
fs.writeFileSync('src/generated/image-sizes.json', JSON.stringify(manifest, null, 0));

const total = (pred) => walk(ROOT).filter(pred).reduce((s, f) => s + fs.statSync(f).size, 0);
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' Mo';
console.log(`images sources : ${files.length} (${resized} redimensionnées)`);
console.log(`avant          : ${mb(before)}`);
console.log(`après (sources): ${mb(total(isSource))}`);
console.log(`variantes webp : ${variants} nouvelles, ${mb(total((f) => f.endsWith('.webp')))} au total`);
console.log(`manifeste      : ${Object.keys(manifest).length} entrées`);
