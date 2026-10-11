import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    // CombatWorld owns collision and movement; Phaser's Matter module is unused.
    // Keep the official renderer/input bundle and the same locked engine version.
    alias: [{ find: /^phaser$/, replacement: fileURLToPath(new URL('./node_modules/phaser/dist/phaser-arcade-physics.js', import.meta.url)) }],
  },
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/phaser/')) return 'phaser'
        },
      },
    },
  },
})
