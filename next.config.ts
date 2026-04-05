import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      // Domain produksi
      {
        protocol: "https",
        hostname: "fgwithwldolyofxnorhd.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "fgwithwldolyofxnorhd.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },

      // Localhost untuk development
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000", // port development
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
