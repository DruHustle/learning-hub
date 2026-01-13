import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const plugins = [
  react(), 
  tailwindcss(), 
  jsxLocPlugin(), 
  VitePWA({
    registerType: 'prompt', // Changed from autoUpdate to prompt for better control
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
    manifest: {
      name: 'Learning Hub',
      short_name: 'Learning Hub',
      description: 'Master AI business solutions on SAP Business Technology Platform',
      theme_color: '#ffffff',
      start_url: './', // CRITICAL: Relative path for GitHub Pages
      scope: './',      // CRITICAL: Relative path for GitHub Pages
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
      navigateFallback: null // CRITICAL: Disable navigateFallback for GitHub Pages to avoid 404s
    }
  })
];

export default defineConfig({
  plugins ,
  base:  "/sap-btp-ai-hub/", // CRITICAL: Fix for GitHub Pages asset loading
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },


  envDir: path.resolve(import.meta.dirname),
  
  root: path.resolve(import.meta.dirname, "client"),
  build: {
      // This tells Vite to put the final files in /dist at the project root
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
      // Ensures assets are generated with relative paths
      assetsDir: 'assets',
    },


  server: {
    port: 3000,
    strictPort: false,
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
