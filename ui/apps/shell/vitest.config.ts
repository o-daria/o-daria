import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@app/auth": path.resolve(__dirname, "../../packages/@app/auth/src/index.ts"),
      "@app/api-client": path.resolve(__dirname, "../../packages/@app/api-client/src/index.ts"),
      "@app/ui": path.resolve(__dirname, "../../packages/@app/ui/src/index.ts"),
      // Allow direct sub-path imports used in layout components
      "@app/ui/src/lib/utils": path.resolve(__dirname, "../../packages/@app/ui/src/lib/utils.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
});
