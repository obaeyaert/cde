import { visit } from 'unist-util-visit';
import fs from 'node:fs';

/**
 * Transforme chaque <img> du contenu Markdown en <picture> WebP responsive, avec
 * width/height issus du manifeste pour éviter tout décalage de mise en page.
 * La première image de la page est le bandeau : c'est le LCP, elle n'est pas différée.
 */
const sizes = JSON.parse(
  fs.readFileSync(new URL('../src/generated/image-sizes.json', import.meta.url), 'utf8'),
);

/* Le contenu est rendu dans une colonne de 1170px au plus, pleine largeur en dessous. */
const SIZES_ATTR = '(max-width: 1170px) 100vw, 1170px';

export default function rehypePicture() {
  return (tree) => {
    let first = true;
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'img' || !parent || index === null) return;
      const src = node.properties?.src;
      if (typeof src !== 'string' || !src.startsWith('/media/')) return;

      // Le Markdown fournit des URL percent-encodées ; le manifeste est indexé sur les
      // chemins littéraux. Sans décodage, les images accentuées perdent leurs dimensions.
      const key = decodeURIComponent(src);
      const entry = sizes[key] ?? sizes[src];
      if (entry) {
        node.properties.width = entry.width;
        node.properties.height = entry.height;
      }

      if (first) {
        node.properties.loading = 'eager';
        node.properties.fetchpriority = 'high';
        first = false;
      } else {
        node.properties.loading ??= 'lazy';
        node.properties.decoding ??= 'async';
      }

      if (!entry?.srcset?.length) return;

      const srcset = entry.srcset.map((v) => `${v.url} ${v.width}w`).join(', ');
      parent.children[index] = {
        type: 'element',
        tagName: 'picture',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'source',
            properties: { srcset, sizes: SIZES_ATTR, type: 'image/webp' },
            children: [],
          },
          node,
        ],
      };
    });
  };
}
