import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Адресите на сегашния сайт, които имат нов дом (статиите, правните текстове и рафтовете са на същите адреси)
  async redirects() {
    return [
      { source: "/moyat-profil", destination: "/profil", permanent: true },
      { source: "/za-nas", destination: "/za-gsol", permanent: true },
      { source: "/garanciya", destination: "/reklamacii-garanciya-serviz", permanent: true },
      { source: "/magazin", has: [{ type: "query", key: "catalog", value: "gaming" }], destination: "/geimarski-kompyutri", permanent: true },
      { source: "/review-order", destination: "/kolichka", permanent: true },
    ];
  },
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
