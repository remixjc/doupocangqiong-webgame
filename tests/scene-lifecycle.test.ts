import { describe, expect, it, vi } from 'vitest'
import { mountDeferred } from '../src/game/lifecycle'

describe('C11b-1 关卡初始化与回收', () => {
  it('StrictMode丢弃挂载不创建引擎，真实挂载只创建一份并回收一次', async () => {
    const create = vi.fn(() => ({ scene: 1 })), destroy = vi.fn(), failed = vi.fn()
    const abandoned = mountDeferred(create, destroy, failed); abandoned()
    const live = mountDeferred(create, destroy, failed)
    await Promise.resolve()
    expect(create).toHaveBeenCalledTimes(1); expect(destroy).not.toHaveBeenCalled()
    live(); live()
    expect(destroy).toHaveBeenCalledTimes(1); expect(destroy).toHaveBeenCalledWith({ scene: 1 })
    expect(failed).not.toHaveBeenCalled()
  })
  it('同步初始化故障传到React故障状态且不销毁不存在的引擎', async () => {
    const failure = new Error('Renderer initialization failed'), destroy = vi.fn(), failed = vi.fn()
    const dispose = mountDeferred(() => { throw failure }, destroy, failed)
    await Promise.resolve()
    expect(failed).toHaveBeenCalledTimes(1); expect(failed).toHaveBeenCalledWith(failure)
    dispose(); expect(destroy).not.toHaveBeenCalled()
  })
  it('取消挂载后不会再报告错误，第二次独立挂载仍可成功', async () => {
    const failed = vi.fn(), destroy = vi.fn()
    const canceled = mountDeferred(() => { throw new Error('canceled') }, destroy, failed)
    canceled()
    const live = mountDeferred(() => ({ scene: 2 }), destroy, failed)
    await Promise.resolve()
    expect(failed).not.toHaveBeenCalled(); live(); expect(destroy).toHaveBeenCalledWith({ scene: 2 })
  })
})
