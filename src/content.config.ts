import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    metaTitle: z.string(),
    description: z.string(),
    slug: z.string(),
    canonical: z.url(),
    heading: z.string().optional(),
    ogImage: z.string().optional(),
    wpId: z.number().nullable(),
  }),
});

export const collections = { pages };
