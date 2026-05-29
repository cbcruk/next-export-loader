/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  // Linting is a separate step (`pnpm lint`); don't couple it into the build.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
