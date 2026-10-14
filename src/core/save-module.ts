type SaveModule = typeof import('./save')

export function loadSaveModule(load: () => Promise<SaveModule> = () => import('./save'), timeoutMs = 20_000): Promise<SaveModule> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(new RangeError('Invalid save load deadline'))
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      settled = true
      reject(new Error('读取存档模块已等待超过20秒，请检查网络并刷新；原有本地存档保留。'))
    }, timeoutMs)
    Promise.resolve().then(load).then(module => {
      if (settled) return
      settled = true; clearTimeout(timer); resolve(module)
    }, error => {
      if (settled) return
      settled = true; clearTimeout(timer); reject(error)
    })
  })
}
