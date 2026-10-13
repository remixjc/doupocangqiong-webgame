import { lazy, type ComponentType } from 'react'

export const SCENE_LOAD_TIMEOUT_MS = 20_000
export class SceneLoadTimeout extends Error {
  constructor() { super('Scene module did not load within the allowed time'); this.name = 'SceneLoadTimeout' }
}

export function lazyScene<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => loadSceneModule(load))
}

/** A late import is consumed but cannot mount after the recovery screen has won. */
export function loadSceneModule<T>(load: () => Promise<T>, timeoutMs = SCENE_LOAD_TIMEOUT_MS): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(new RangeError('Invalid scene load deadline'))
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => { settled = true; reject(new SceneLoadTimeout()) }, timeoutMs)
    Promise.resolve().then(load).then(
      module => { if (settled) return; settled = true; clearTimeout(timer); resolve(module) },
      error => { if (settled) return; settled = true; clearTimeout(timer); reject(error) },
    )
  })
}
