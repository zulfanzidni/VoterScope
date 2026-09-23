import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers are applied by proxy.ts (Next 16's rename of middleware).
  reactStrictMode: true,

  // Emit a self-contained server bundle (.next/standalone) with only the
  // dependencies it actually needs. Required for the Docker image: the runner
  // stage copies it instead of the full 896 MB node_modules tree.
  output: "standalone",

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
