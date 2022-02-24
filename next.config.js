/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['zh-CN', 'en'],
    defaultLocale: 'zh-CN',
  },
  reactStrictMode: true,
  images: {
    domains: ['img.shields.io'],
  }
}

module.exports = nextConfig
