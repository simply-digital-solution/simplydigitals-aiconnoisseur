import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['playwright', 'playwright-core', '@playwright/test'],
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    define: {
      __API_BASE_URL__: JSON.stringify(
        mode === 'production' ? apiTarget : ''
      ),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.js'],
      exclude: ['node_modules', 'e2e/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/__tests__/',
          'src/main.jsx',
          '*.config.js',
          'src/store/index.js',
          'src/hooks/**',
          'src/utils/**',
          'src/components/explorer/**',
          'src/components/abtesting/**',
          'src/components/preprocessing/**',
          'src/components/plots/**',
          'src/components/upload/**',
        ],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
      },
    },
  }
})
