import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import rehypePicture from './scripts/rehype-picture.mjs';

export default defineConfig({
  site: 'https://www.cdegroupe.com',
  output: 'static',
  adapter: vercel({ imageService: false }),
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    rehypePlugins: [rehypePicture],
  },
  integrations: [
    sitemap({
      // Les 3 anciennes pages d'index restent des 301 : elles ne doivent pas figurer au sitemap
      filter: (page) => !/\/(nos-clients|amenagement-et-equipement|materiel-hotelier)\/$/.test(page),
    }),
  ],
});
