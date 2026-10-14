import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const phaserDefines = {
  global: 'globalThis',
  'typeof CANVAS_RENDERER': 'true',
  'typeof WEBGL_RENDERER': 'true',
  'typeof WEBGL_DEBUG': 'false',
  'typeof PLUGIN_CAMERA3D': 'false',
  'typeof PLUGIN_FBINSTANT': 'false',
  'typeof FEATURE_SOUND': 'false',
}

export default defineConfig({
  plugins: [react(), {
    name: 'verify-phaser-source',
    apply: 'build',
    generateBundle() {
      const modules = [...this.getModuleIds()].map(id => id.replaceAll('\\', '/'))
        .filter(id => id.includes('/phaser/src/'))
      const required = ['core/Game.js', 'scene/Scene.js', 'gameobjects/graphics/Graphics.js',
        'gameobjects/text/Text.js', 'gameobjects/container/Container.js',
        'renderer/canvas/CanvasRenderer.js', 'renderer/webgl/WebGLRenderer.js',
        'events/EventEmitter.js', 'cameras/2d/CameraManager.js', 'gameobjects/GameObjectCreator.js',
        'gameobjects/GameObjectFactory.js', 'gameobjects/DisplayList.js', 'gameobjects/UpdateList.js',
        'scene/ScenePlugin.js', 'time/Clock.js', 'data/DataManagerPlugin.js', 'input/InputPlugin.js',
        'input/keyboard/KeyboardPlugin.js', 'input/gamepad/GamepadPlugin.js', 'loader/LoaderPlugin.js',
        'tweens/TweenManager.js', 'gameobjects/lights/LightsPlugin.js',
        'gameobjects/graphics/GraphicsFactory.js', 'gameobjects/text/TextFactory.js',
        'gameobjects/container/ContainerFactory.js']
      const missing = required.filter(file => !modules.some(id => id.endsWith(`/phaser/src/${file}`)))
      const excluded = modules.filter(id => /\/phaser\/src\/(physics|sound|tilemaps|curves)\//.test(id))
      if (missing.length || excluded.length) this.error(`Phaser source contract failed: ${JSON.stringify({ missing, excluded })}`)
      this.emitFile({ type: 'asset', fileName: 'engine-module-report.json',
        source: JSON.stringify({ required, excluded: [], moduleCount: modules.length,
          modules: modules.map(id => id.slice(id.lastIndexOf('/phaser/src/') + 1)).sort() }, null, 2) + '\n' })
    },
  }],
  base: './',
  define: phaserDefines,
  resolve: {
    // CombatWorld owns physics; audio uses our Web Audio lifecycle.
    // The source entry retains Phaser core and the three used game objects.
    alias: [{ find: /^phaser$/, replacement: fileURLToPath(new URL('./src/game/phaser-entry.cjs', import.meta.url)) }],
  },
  optimizeDeps: { include: ['phaser'], rolldownOptions: { transform: { define: phaserDefines } } },
  build: {
    manifest: true,
    // Native ESM resolves the deferred scene graph; Vite still waits for its CSS.
    // Avoid repeating speculative JS preload lists for every history route.
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/phaser/') || id.endsWith('/phaser-entry.cjs')) return 'phaser'
        },
      },
    },
  },
})
