import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

plugins: [react(), tailwindcss()]

// https://vite.dev/config/

function figmaAssetResolver(): Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        return path.resolve(__dirname, 'src/assets', id.replace('figma:asset/', ''))
      }
    }
  }
}

plugins: [figmaAssetResolver(), react(), tailwindcss()]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app')

    }
  }
})
