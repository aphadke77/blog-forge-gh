import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/blog-forge-gh/', // must match your GitHub repository name exactly
})
