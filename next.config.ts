import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'irlpqrbhogdvdpfijipo.supabase.co',
      },
    ],
  },
};

export default nextConfig;
