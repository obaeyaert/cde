import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.cdegroupe.com',
  output: 'static',
  // Port fixe et strict : sans cela Astro glisse sur le port suivant quand 4321 est pris,
  // et on teste sans le savoir un serveur laissé ouvert par une session précédente.
  server: { port: 4321 },
  vite: { server: { strictPort: true } },
  devToolbar: { enabled: false },
  adapter: vercel({ imageService: false }),
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // Les 3 anciennes pages d'index restent des 301 : elles ne doivent pas figurer au sitemap
      filter: (page) => !/\/(nos-clients|amenagement-et-equipement|materiel-hotelier)\/$/.test(page),
    }),
  ],
});
