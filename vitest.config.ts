import {defineConfig} from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    mockReset: true,
    globals: true,
    environment: 'node',
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
})
