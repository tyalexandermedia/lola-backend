import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * One markdown file per service in src/content/services/.
 * The file name is the URL slug: roof-cleaning.md → /services/roof-cleaning
 *
 * Astro validates this schema at build time and fails loudly with the file
 * name and field when something is missing. That is the intended behaviour:
 * a service page never ships with an invented FAQ or an empty summary.
 */
const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    name: z.string().min(2),
    /** 1 = most important. Drives nav order, homepage order and the form default. */
    priority: z.number().int().min(1),
    /** Shown on the homepage card and used as the meta description fallback. */
    summary: z.string().min(20).max(220),
    heroSub: z.string().max(240).optional(),
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(155).optional(),
    faqs: z.array(z.object({ q: z.string().min(5), a: z.string().min(10) })).min(1),
    beforeAfter: z
      .array(
        z.object({
          before: z.string(),
          after: z.string(),
          label: z.string(),
          alt: z.string(),
        }),
      )
      .default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    enabled: z.boolean().default(true),
  }),
});

export const collections = { services };
