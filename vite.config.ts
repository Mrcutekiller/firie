import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

/**
 * Cloudflare Workers / Pages enforces a strict 25 MiB asset limit.
 * Any bundle file larger than 25 MiB (e.g. FITLY.apk or FITLY.ipa)
 * is removed from the production dist/ folder so wrangler deploy succeeds.
 * Download buttons automatically link to the GitHub repository raw package.
 */
function cleanLargeAssetsForCloudflare() {
  return {
    name: "clean-large-assets",
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir);
        for (const file of files) {
          const fullPath = path.join(distDir, file);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile() && stat.size > 25 * 1024 * 1024) {
              console.log(`[Cloudflare Deploy] Stripping ${file} (${(stat.size / 1024 / 1024).toFixed(1)}MB) from dist to pass Cloudflare 25MB asset limit`);
              fs.unlinkSync(fullPath);
            }
          } catch {}
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cleanLargeAssetsForCloudflare()],
  server: {
    port: 5173,
  },
});
