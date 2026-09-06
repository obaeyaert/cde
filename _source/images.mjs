import fs from 'node:fs'; import path from 'node:path';
const used = fs.readFileSync('used-images.txt','utf8').trim().split('\n').filter(Boolean);
const extra = ['2026/07/cde-logo2-white.png','2019/05/favicon-32x32.png','2019/05/apple-icon-114x114.png'];
const wanted = new Set(), missing = [], resolved = new Map();
for (const rel of [...used, ...extra]) {
  // remonter du thumbnail vers l'original quand il existe
  const orig = rel.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
  const pick = fs.existsSync(path.join('uploads', orig)) ? orig
             : fs.existsSync(path.join('uploads', rel)) ? rel : null;
  if (!pick) { missing.push(rel); continue; }
  wanted.add(pick); resolved.set(rel, pick);
}
const dest = '../public/media';
let bytes = 0;
for (const rel of wanted) {
  const src = path.join('uploads', rel), dst = path.join(dest, rel);
  fs.mkdirSync(path.dirname(dst), {recursive:true});
  fs.copyFileSync(src, dst); bytes += fs.statSync(src).size;
}
fs.writeFileSync('image-map.json', JSON.stringify(Object.fromEntries(resolved), null, 2));
console.log('références   :', used.length + extra.length);
console.log('fichiers copiés:', wanted.size, '=>', (bytes/1024/1024).toFixed(1), 'Mo');
console.log('introuvables :', missing.length); missing.slice(0,10).forEach(m=>console.log('  !', m));
