import type { APIRoute } from 'astro'
import { pageMetadata, canonicalPath } from '../lib/site'

export const GET: APIRoute = ({ site }) => {
  const urls = Object.keys(pageMetadata)
    .map(
      (path) =>
        `<url><loc>${new URL(canonicalPath(path), site ?? 'https://yahaha.net').href}</loc></url>`
    )
    .join('')
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' }
    }
  )
}
