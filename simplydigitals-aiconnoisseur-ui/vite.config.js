import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
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
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/__tests__/',
          'src/main.jsx',
          '*.config.js',
        ],
        thresholds: {
          lines: 50,
          functions: 50,
          branches: 50,
          statements: 50,
        },
      },
    },
  }
})
