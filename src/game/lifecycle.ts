export function mountDeferred<T>(create: () => T, destroy: (instance: T) => void, failed: (error: unknown) => void) {
  let disposed = false
  let instance: T | undefined
  queueMicrotask(() => {
    if (disposed) return
    try { instance = create() } catch (error) { failed(error) }
  })
  return () => {
    if (disposed) return
    disposed = true
    if (instance !== undefined) destroy(instance)
  }
}
