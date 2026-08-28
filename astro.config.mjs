import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  site: 'https://yahaha.net',
  output: 'static',
  integrations: [react()],
  // Tailwind 4 ships as a Vite plugin; the old @astrojs/tailwind integration
  // is v3-only tooling. Design tokens live in src/styles/globals.css (@theme).
  vite: {
    plugins: [tailwindcss()],
  },
})
