import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required in Next.js 16 — returning null uses the default nanoid build ID
  generateBuildId: async () => null,
};

export default nextConfig;
