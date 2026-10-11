import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  // Bound process startup on hosts reporting many CPUs; retain file isolation.
  test: { maxWorkers: 4 },
}))
