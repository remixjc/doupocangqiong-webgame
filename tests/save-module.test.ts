import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSaveModule } from '../src/core/save-module'

afterEach(() => vi.useRealTimers())
describe('异步存档模块截止与迟到结果', () => {
  it('成功或失败及时结束并清掉截止计时，保留原错误', async () => {
    vi.useFakeTimers()
    const module = {} as typeof import('../src/core/save')
    await expect(loadSaveModule(async () => module)).resolves.toBe(module)
    const error = new Error('网络读取失败')
    await expect(loadSaveModule(async () => { throw error })).rejects.toBe(error)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('挂起超过20秒拒绝，迟到模块不会继续执行读写，下一次显式读取可成功', async () => {
    vi.useFakeTimers()
    let finish!: (module: typeof import('../src/core/save')) => void
    const late = new Promise<typeof import('../src/core/save')>(resolve => { finish = resolve })
    const consumed = vi.fn()
    const reading = loadSaveModule(() => late).then(consumed)
    const rejected = expect(reading).rejects.toThrow('原有本地存档保留')
    await vi.advanceTimersByTimeAsync(20000); await rejected
    const module = {} as typeof import('../src/core/save')
    finish(module); await Promise.resolve(); await Promise.resolve()
    expect(consumed).not.toHaveBeenCalled()
    await expect(loadSaveModule(async () => module)).resolves.toBe(module)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('非法截止参数拒绝而不调用模块加载器', async () => {
    const load = vi.fn()
    for (const ms of [0, -1, Infinity, NaN]) await expect(loadSaveModule(load, ms)).rejects.toBeInstanceOf(RangeError)
    expect(load).not.toHaveBeenCalled()
  })
})
