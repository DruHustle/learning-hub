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
    registerType: 'prompt',
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
    manifest: {
      name: 'Learning Hub',
      short_name: 'Learning Hub',
      description: 'Interactive learning hub for designing, prototyping, and deploying real-world AI solutions using a modern multi-tool ecosystem.',
      theme_color: '#ffffff',
      // For Hash Routing, the start_url is just the base path
      start_url: '/sap-btp-ai-hub/', 
      scope: '/sap-btp-ai-hub/',      
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
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      // With Hash Routing, we don't need a navigateFallback 404 hack
      navigateFallback: null 
    }
  })
];

export default defineConfig({
  plugins,
  // This ensures assets (JS/CSS) are loaded from /sap-btp-ai-hub/assets/
  base: "/sap-btp-ai-hub/", 
  
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
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
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