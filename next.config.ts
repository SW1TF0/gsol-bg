import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Снимките на продуктите идват от текущия магазин, докато не ги пренесем в Supabase Storage
    remotePatterns: [new URL("https://gsol.bg/wp-content/uploads/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
