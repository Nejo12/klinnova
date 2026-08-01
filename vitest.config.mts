import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  // Keep unit tests independent of developer `.env.local` values.
  envDir: false,
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // Declaration / generated type surfaces (no executable behaviour)
        "src/types/**",
        "**/*.d.ts",
        // Styles (no executable behaviour under unit coverage)
        "**/*.{css,scss}",
        // Test harness (not application code)
        "src/test/**",
        // server-only wrapper around getPublicEnv; unsafe under jsdom (public env covered)
        "src/lib/env/server.ts",
        // Requires Next.js cookies(); browser factory covered separately
        "src/lib/supabase/server.ts",
        // Cookie refresh client; path helper unit-tested; Playwright covers redirects
        "src/lib/supabase/proxy.ts",
        "src/proxy.ts",
        // Route composition + server actions (Playwright + focused unit helpers)
        "src/app/**",
        "src/components/auth/**",
        // Static copy constants
        "src/lib/auth/messages.ts",
      ],
    },
  },
});
