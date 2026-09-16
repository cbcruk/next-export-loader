/** @type {import('next').NextConfig} */
// When deploying every example under one GitHub Pages site, each is served from
// a sub-path (e.g. `/next-export-loader/basic-list-detail`). The deploy workflow
// sets NEXT_BASE_PATH; local dev and e2e leave it unset, so nothing changes.
const basePath = process.env.NEXT_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  // Emit `items/index.html` instead of `items.html` so direct links and
  // refreshes resolve on any static host (GitHub Pages, Netlify, S3, …).
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
  // `next dev` serves `public/` files by exact path only, so the hub's
  // directory URLs (`/__devframes/<id>/`) need an explicit index rewrite.
  // Static hosts resolve directory indexes themselves; export ignores this.
  ...(process.env.NODE_ENV === 'development'
    ? {
        async rewrites() {
          return [
            { source: '/__devframes/', destination: '/__devframes/index.html' },
            {
              source: '/__devframes/:id/',
              destination: '/__devframes/:id/index.html',
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
