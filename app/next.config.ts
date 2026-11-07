import type { NextConfig } from "next";
import path from "node:path";

const repositoryRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingRoot: repositoryRoot,
  partialPrefetching: true,
  turbopack: {
    root: repositoryRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
