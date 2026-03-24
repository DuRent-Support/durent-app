import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      // Domain produksi
      {
        protocol: 'https',
        hostname: 'fgwithwldolyofxnorhd.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**', // semua path public
      },

      // Localhost untuk development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',              // port development
        pathname: '/**',
      },
      {
      protocol: 'https',
      hostname: 'lh3.googleusercontent.com',
      port: '',
      pathname: '/**',
    },
    ]
  },
};

export default nextConfig;
