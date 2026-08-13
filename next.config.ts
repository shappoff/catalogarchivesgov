import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: basePath ? "export" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
