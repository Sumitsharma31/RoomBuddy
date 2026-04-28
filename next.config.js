/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://rentbuddy-60fc0.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
