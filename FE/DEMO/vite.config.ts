import { configDefaults, defineConfig } from 'vitest/config'
import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function assertVercelApiBaseUrl() {
  if (process.env.VERCEL !== '1') {
    return
  }

  const value = process.env.VITE_API_BASE_URL?.trim()
  if (!value) {
    throw new Error('VITE_API_BASE_URL is required for Vercel builds.')
  }

  let apiUrl: URL
  try {
    apiUrl = new URL(value)
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTPS URL for Vercel builds.')
  }

  const normalizedPath = apiUrl.pathname.replace(/\/+$/, '')
  const hostname = apiUrl.hostname.toLowerCase()
  const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(hostname)
    || hostname.endsWith('.localhost')
  if (
    apiUrl.protocol !== 'https:'
    || isLocalHost
    || normalizedPath !== '/api/v1'
    || Boolean(apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash)
  ) {
    throw new Error('VITE_API_BASE_URL must be a clean HTTPS URL on a non-local host and end with /api/v1 for Vercel builds.')
  }
}

export default defineConfig(() => {
  assertVercelApiBaseUrl()

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
    server: {
      fs: {
        allow: [
          path.resolve(__dirname),
          fs.realpathSync(path.resolve(__dirname, 'node_modules')),
        ],
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      maxWorkers: 1,
      // The admin screens render large MUI trees; with maxWorkers: 1 the heaviest
      // specs sit close to the 5s default and tip over on a loaded or slower
      // machine. Infra/build-local-web-windows.ps1 runs this suite on the client's
      // own machine, where a spurious red blocks the whole build.
      testTimeout: 20000,
      hookTimeout: 20000,
      exclude: [...configDefaults.exclude, '**/node_modules.incomplete-*/**'],
    },
  }
})
