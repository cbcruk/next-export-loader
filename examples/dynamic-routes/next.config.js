/** @type {import('next').NextConfig} */
// When deploying every example under one GitHub Pages site, each is served from
// a sub-path (e.g. `/next-export-loader/dynamic-routes`). The deploy workflow
// sets NEXT_BASE_PATH; local dev and e2e leave it unset, so nothing changes.
const basePath = process.env.NEXT_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  // Emit `posts/index.html` at directory paths so direct links and refreshes
  // resolve on any static host (GitHub Pages, Netlify, S3, …).
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
};

module.exports = nextConfig;
