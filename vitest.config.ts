import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  // These are correctness replays, including complete historical branches.
  // Keep a finite deadline without treating a busy Windows host as a 5s benchmark.
  // Actual frame/performance acceptance is tracked separately under C11/E03.
  test: { maxWorkers: 4, testTimeout: 15_000 },
}))
