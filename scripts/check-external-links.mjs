/**
 * Vérifie que les liens sortants du site (sites des marques, réseaux…) répondent encore.
 * Lit les sources (pas de build nécessaire) et sépare trois cas :
 *  - mort : 404/410, 5xx, domaine ou serveur injoignable → à corriger ;
 *  - bloqué : 401/403/429, le site refuse les robots → probablement valide, simple signal ;
 *  - ok.
 * Sortie en Markdown sur stdout (corps d'issue pour la CI), code 1 s'il y a un lien mort.
 * Usage : node scripts/check-external-links.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SOURCES = ['src/content', 'src/components', 'src/data', 'src/layouts'];
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 8;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

/* url -> fichiers qui la citent */
const links = new Map();
for (const file of SOURCES.flatMap(walk)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [, raw] of text.matchAll(/(?:href=["']|['"`])(https?:\/\/[^"'`\s<>]+)/g)) {
    const url = raw.replaceAll('&amp;', '&');
    const host = new URL(url).hostname;
    if (host.endsWith('cdegroupe.com') || host === 'schema.org') continue;
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(path.relative('.', file));
  }
}

const probe = async (url) => {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': UA, accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      await res.body?.cancel();
      // Beaucoup de serveurs répondent mal à HEAD : on retente en GET avant de conclure
      if (method === 'HEAD' && res.status >= 400) continue;
      // 404 maquillée en 200 : le site redirige vers sa page d'erreur
      if (/[/?=](?:error|404)\b/i.test(new URL(res.url).pathname + new URL(res.url).search)) return { status: 404 };
      return { status: res.status };
    } catch (err) {
      if (method === 'HEAD') continue;
      return { status: 0, error: err.cause?.code ?? err.name };
    }
  }
};

/* Chaîne de certificats incomplète : Node échoue, les navigateurs la complètent d'eux-mêmes */
const TLS_CHAIN = ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'];

const classify = ({ status, error }) =>
  status >= 200 && status < 400 ? 'ok'
  : [401, 403, 429].includes(status) || TLS_CHAIN.includes(error) ? 'bloqué'
  : 'mort';

const queue = [...links.keys()];
const results = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const r = await probe(url);
      results.push({ url, ...r, kind: classify(r), files: [...links.get(url)] });
    }
  }),
);
results.sort((a, b) => a.url.localeCompare(b.url));

const dead = results.filter((r) => r.kind === 'mort');
const blocked = results.filter((r) => r.kind === 'bloqué');
const label = (r) => (r.status ? `HTTP ${r.status}` : r.error);

console.log(`# Liens sortants : ${dead.length} mort(s) sur ${results.length}\n`);
if (dead.length) {
  console.log('## À corriger\n');
  for (const r of dead) console.log(`- ${r.url} — **${label(r)}** — ${r.files.join(', ')}`);
  console.log();
}
if (blocked.length) {
  console.log('## À vérifier à la main (refus des robots ou certificat incomplet, probablement valides)\n');
  for (const r of blocked) console.log(`- ${r.url} — ${label(r)}`);
  console.log();
}
console.log(`_${results.length - dead.length - blocked.length} liens OK._`);

process.exit(dead.length ? 1 : 0);
