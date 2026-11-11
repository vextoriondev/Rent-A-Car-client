import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${process.env.BACKEND_URL || 'https://rent-a-car-server-production-fc17.up.railway.app'}/api/v1/:path*`
      }
    ];
  }
};
export default nextConfig;
