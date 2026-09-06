import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers applied via middleware (see middleware.ts)
  // Strict mode for React
  reactStrictMode: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  // Logging
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
