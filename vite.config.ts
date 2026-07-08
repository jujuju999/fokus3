import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base '/fokus3/' only in production: GitHub Pages serves from a sub-path,
// while the dev server stays at '/' for a friction-free local workflow.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/fokus3/' : '/',
  plugins: [react(), tailwindcss()],
}))
