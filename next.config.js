/** @type {import('next').NextConfig} */

const withOffline = require('next-offline')

const nextConfig = {
  i18n: {
    locales: ['zh-CN', 'en'],
    defaultLocale: 'zh-CN',
  },
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    domains: ['img.shields.io'],
  }
}

module.exports = withOffline(nextConfig)