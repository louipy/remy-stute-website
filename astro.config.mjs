import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://remyvenezuela.com',
  adapter: cloudflare({ imageService: "compile" }),
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  // Variables de servidor leídas vía `astro:env/server`. En Cloudflare, el adapter
  // las resuelve desde el runtime del Worker (panel de Pages); en local desde `.env`.
  // `import.meta.env.X` NO funciona en el runtime de Cloudflare para variables no-PUBLIC_.
  // Todas son `optional`: el código verifica `undefined` y degrada sin romper el build.
  env: {
    schema: {
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      AIRTABLE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      AIRTABLE_BASE_PRODUCTION: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      NOTIFY_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      META_PIXEL_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      META_ACCESS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
