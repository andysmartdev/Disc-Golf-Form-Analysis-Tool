import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // On GitHub Actions GITHUB_ACTIONS=true is set automatically.
  // Project pages are served at /<repo-name>/ so we need that prefix in CI,
  // but '/' works fine locally.
  base: process.env.GITHUB_ACTIONS ? '/Disc-Golf-Form-Analysis-Tool/' : '/',
})
