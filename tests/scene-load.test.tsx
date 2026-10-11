import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SceneBoundary from '../src/ui/SceneBoundary'
import { loadSceneModule, SceneLoadTimeout, SCENE_LOAD_TIMEOUT_MS } from '../src/ui/scene-load'
import { gameStore } from '../src/core/store'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
function pending<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
describe('关卡模块加载期限', () => {
  it('成功加载原样返回模块并清计时器', async () => {
    vi.useFakeTimers()
    const module = { default: () => null }, load = vi.fn(async () => module)
    expect(await loadSceneModule(load)).toBe(module)
    expect(load).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0)
  })
  it('保留导入拒绝和同步异常，均清计时器', async () => {
    vi.useFakeTimers()
    const error = new Error('module missing')
    await expect(loadSceneModule(async () => { throw error })).rejects.toBe(error)
    await expect(loadSceneModule(() => { throw error })).rejects.toBe(error)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('永久等待到20秒才进入超时，迟到模块不改变已拒绝结果', async () => {
    vi.useFakeTimers()
    const source = pending<string>()
    const result = loadSceneModule(() => source.promise)
    const recovered = result.catch(error => error)
    const success = vi.fn(); void result.then(success, () => {})
    await vi.advanceTimersByTimeAsync(SCENE_LOAD_TIMEOUT_MS - 1)
    expect(success).not.toHaveBeenCalled()
    let finished = false; void recovered.then(() => { finished = true })
    await Promise.resolve(); expect(finished).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await recovered).toBeInstanceOf(SceneLoadTimeout)
    source.resolve('late module'); await Promise.resolve(); await Promise.resolve()
    expect(success).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
  })
  it('超时后迟到拒绝被消费，独立新加载仍能成功', async () => {
    vi.useFakeTimers()
    const source = pending<string>()
    const failed = loadSceneModule(() => source.promise, 10).catch(error => error)
    await vi.advanceTimersByTimeAsync(10)
    expect(await failed).toBeInstanceOf(SceneLoadTimeout)
    source.reject(new Error('late network rejection'))
    await Promise.resolve(); await Promise.resolve()
    expect(await loadSceneModule(async () => 'new request', 10)).toBe('new request')
    expect(vi.getTimerCount()).toBe(0)
  })
  it('无效期限不启动请求或计时器', async () => {
    vi.useFakeTimers()
    const load = vi.fn(async () => 'module')
    for (const duration of [0, -1, NaN, Infinity]) await expect(loadSceneModule(load, duration)).rejects.toBeInstanceOf(RangeError)
    expect(load).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0)
  })
  it('恢复卡区别超时/普通错误，三条恢复操作保留', () => {
    const props = { children: 'scene', onFailure: vi.fn(), onReload: vi.fn(), onSave: vi.fn(), onBack: vi.fn() }
    const boundary = new SceneBoundary(props)
    boundary.state = SceneBoundary.getDerivedStateFromError(new SceneLoadTimeout())
    boundary.componentDidCatch()
    expect(props.onFailure).toHaveBeenCalledTimes(1)
    const timeout = renderToStaticMarkup(boundary.render())
    expect(timeout).toContain('等待超过20秒')
    for (const text of ['保存后刷新页面', '打开存档管理', '返回大陆舆图']) expect(timeout).toContain(text)
    boundary.state = SceneBoundary.getDerivedStateFromError(new Error('render failed'))
    expect(renderToStaticMarkup(boundary.render())).toContain('本次场景遇到问题')
    expect(renderToStaticMarkup(boundary.render())).not.toContain('等待超过20秒')
  })
  it('按需手札面板故障保留存档与舆图恢复入口，不误称战场运行错误', () => {
    const props = { children: 'panel', context: 'panel' as const, onFailure: vi.fn(), onReload: vi.fn(), onSave: vi.fn(), onBack: vi.fn() }
    const boundary = new SceneBoundary(props)
    boundary.state = SceneBoundary.getDerivedStateFromError(new SceneLoadTimeout())
    boundary.componentDidCatch()
    expect(props.onFailure).toHaveBeenCalledTimes(1)
    const timeout = renderToStaticMarkup(boundary.render())
    expect(timeout).toContain('打开此页已等待超过20秒')
    for (const text of ['保存后刷新页面', '打开存档管理', '返回大陆舆图']) expect(timeout).toContain(text)
    expect(timeout).not.toContain('本次场景')
    boundary.state = SceneBoundary.getDerivedStateFromError(new Error('recap render failed'))
    expect(renderToStaticMarkup(boundary.render())).toContain('本页遇到问题')
    expect(renderToStaticMarkup(boundary.render())).not.toContain('20秒')
  })
  it('存档管理超时显示同步保存状态且没有自指恢复入口', () => {
    const props = { children: 'save', context: 'save' as const, onFailure: vi.fn(), onReload: vi.fn(), onBack: vi.fn() }
    const boundary = new SceneBoundary(props)
    boundary.state = SceneBoundary.getDerivedStateFromError(new SceneLoadTimeout())
    boundary.componentDidCatch()
    const html = renderToStaticMarkup(boundary.render())
    expect(props.onFailure).toHaveBeenCalledOnce()
    for (const text of ['存档管理暂时无法打开', '打开存档管理已等待超过20秒', '自动存档', '保存后刷新页面', '返回大陆舆图']) expect(html).toContain(text)
    expect(html).not.toContain('>打开存档管理</button>')
  })
  it('存档窗口普通故障仍显示实际自动保存错误和重试按钮', () => {
    const snapshot = gameStore.getSnapshot()
    vi.spyOn(gameStore, 'getSnapshot').mockReturnValue({
      ...snapshot, autosave: { phase: 'error', pending: 0, error: '磁盘写入失败' },
    })
    const props = { children: 'save', context: 'save' as const, onFailure: vi.fn(), onReload: vi.fn(), onBack: vi.fn() }
    const boundary = new SceneBoundary(props)
    boundary.state = SceneBoundary.getDerivedStateFromError(new Error('save module missing'))
    const html = renderToStaticMarkup(boundary.render())
    for (const text of ['存档窗口遇到问题', '自动存档', '保存未完成', '磁盘写入失败', '重试自动保存']) expect(html).toContain(text)
    expect(html).not.toContain('等待超过20秒')
    expect(html).not.toContain('>打开存档管理</button>')
  })
})
