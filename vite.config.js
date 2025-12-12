import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "map.svg"],
      manifest: {
        name: "Wasteland Map Project",
        short_name: "WastelandMap",
        description: "Interactive wasteland map with markers and intel.",
        theme_color: "#0b1020",
        background_color: "#0b1020",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "favicon.svg", // Using SVG as icon for now, ideally should be PNGs
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increase limit for map files
      },
    }),
  ],
  build: {
    rollupOptions: {
      // Avoid optional native dependency resolution in CF Pages build
      external: ["fsevents"],
    },
  },
  resolve: {
    alias: {
      path: "path-browserify",
      "node:path": "path-browserify",
    },
  },
});
