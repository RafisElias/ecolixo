import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/// <reference types="vitest/config" />

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://backend:8000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "/tmp/coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.d.ts",
        "src/**/*.test.*",
        "src/main.tsx",
        "src/leaflet-heat.d.ts",
        "src/env.d.ts",
        "src/App.tsx",
      ],
    },
  },
});
