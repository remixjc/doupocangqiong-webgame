import { describe, expect, it, vi } from 'vitest'
import { SceneGuard } from '../src/game/scene-guard'

describe('异步场景入口的错误隔离', () => {
  it('正常初始化/帧更新运行，致命错误先停止输入再报告，后续不重跑', () => {
    const order: string[] = [], failure = new Error('draw failed')
    const report = vi.fn(error => { expect(error).toBe(failure); order.push('report') })
    const guard = new SceneGuard(() => order.push('suspend'), report)
    guard.run(() => order.push('create'))
    guard.run(() => order.push('update'))
    guard.run(() => { order.push('bad frame'); throw failure })
    const further = vi.fn()
    for (let i = 0; i < 600; i++) guard.run(further)
    expect(order).toEqual(['create', 'update', 'bad frame', 'suspend', 'report'])
    expect(report).toHaveBeenCalledTimes(1); expect(further).not.toHaveBeenCalled()
  })
  it('初始化失败也只报告一次；释放中的再次调用不运行', () => {
    const report = vi.fn(), work = vi.fn()
    let guard!: SceneGuard
    guard = new SceneGuard(() => guard.run(work), report)
    guard.run(() => { throw new Error('create failed') })
    guard.run(work)
    expect(report).toHaveBeenCalledTimes(1); expect(work).not.toHaveBeenCalled()
  })
  it('清理异常仍把原错误交给恢复界面', () => {
    const primary = new Error('simulation failed'), report = vi.fn()
    const guard = new SceneGuard(() => { throw new Error('teardown failed') }, report)
    expect(() => guard.run(() => { throw primary })).not.toThrow()
    expect(report).toHaveBeenCalledExactlyOnceWith(primary)
  })
  it('重复销毁停止旧实例，新建实例能重新初始化', () => {
    const suspend = vi.fn(), report = vi.fn(), work = vi.fn()
    const old = new SceneGuard(suspend, report)
    old.dispose(); old.dispose(); old.run(work)
    expect(work).not.toHaveBeenCalled(); expect(suspend).not.toHaveBeenCalled(); expect(report).not.toHaveBeenCalled()
    const next = new SceneGuard(suspend, report)
    next.run(work); expect(work).toHaveBeenCalledTimes(1)
  })
})
