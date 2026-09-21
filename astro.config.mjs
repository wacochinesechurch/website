// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Waco Chinese Church / 韦科华人教会
 *
 * Static-first Astro site. Every page is prerendered HTML — no server required,
 * deployable free to Netlify / Cloudflare Pages. Content lives in `src/content`
 * as Markdown + YAML so church volunteers can edit it through the CMS at /admin
 * without ever touching application code.
 *
 * Bilingual routing: /en/... and /zh/... are both explicitly prefixed so that
 * neither language is a second-class citizen. `/` performs a client-side
 * language negotiation redirect (see src/pages/index.astro).
 */
export default defineConfig({
  site: 'https://www.wacochinesechurch.org',
  trailingSlash: 'ignore',

  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: {
      // Both locales carry a prefix. English is not privileged over Chinese.
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en-US', zh: 'zh-CN' },
      },
      // /review is noindex and disallowed in robots.txt. Listing it here as
      // well told Google three different things about the same page.
      filter: (page) => !page.includes('/admin') && !page.includes('/review'),
    }),
  ],

  image: {
    // Church photography is the single strongest brand asset. Optimize hard.
    responsiveStyles: true,
    layout: 'constrained',
  },

  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },

  vite: {
    build: {
      cssCodeSplit: false, // one small stylesheet beats waterfall round-trips
    },
  },
});
