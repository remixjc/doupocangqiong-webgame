import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { initialState } from '../src/core/model'
import { parseSave } from '../src/core/save'
import { GameStore } from '../src/core/store'
import { downloadSaveBackup } from '../src/ui/backup-download'
import SceneBoundary from '../src/ui/SceneBoundary'

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

function downloadHost(failure?: 'create' | 'attach' | 'click' | 'defer') {
  let blob: Blob | undefined, cleanup: (() => void) | undefined
  const link = { href: '', download: '', hidden: false,
    click: vi.fn(() => { if (failure === 'click') throw new Error('download blocked') }),
    remove: vi.fn() }
  const host = {
    createUrl: vi.fn((value: Blob) => { blob = value; return 'blob:backup' }),
    revokeUrl: vi.fn(),
    createLink: vi.fn(() => { if (failure === 'create') throw new Error('link unavailable'); return link }),
    attach: vi.fn(() => { if (failure === 'attach') throw new Error('document unavailable') }),
    defer: vi.fn((callback: () => void) => { if (failure === 'defer') throw new Error('timer unavailable'); cleanup = callback }),
  }
  return { host, link, blob: () => blob!, cleanup: () => cleanup!() }
}

describe('C11b-5 模块故障时独立备份', () => {
  it('保存失败也能下载最新内存中的完整持久状态，不写槽位、不带战斗运行态', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T00:00:00Z'))
    const write = vi.fn(async () => { throw new Error('quota') })
    const store = new GameStore({ load: async () => null, write })
    await store.initialize()
    store.update(s => { s.gold = 222; s.inventory.herb = 4; s.settings.animeLimit = 1 })
    expect(await store.waitForAutosave()).toBe(false)
    store.runtime({ ...store.getSnapshot().runtime, x: 420, hp: 1 })
    const before = structuredClone(store.getSnapshot()), calls = write.mock.calls.length
    const download = downloadHost()
    downloadSaveBackup(store.getSnapshot().state, download.host)
    expect(parseSave(await download.blob().text())).toEqual(before.state)
    expect(await download.blob().text()).not.toContain('"runtime"')
    expect(download.blob().type).toBe('application/json')
    expect(download.link.download).toMatch(/^异火之路-第1章-\d+\.json$/)
    expect(download.link.href).toBe('blob:backup'); expect(download.link.hidden).toBe(true)
    expect(download.host.attach).toHaveBeenCalledWith(download.link)
    expect(download.link.click).toHaveBeenCalledOnce(); expect(download.link.remove).toHaveBeenCalledOnce()
    expect(download.host.revokeUrl).not.toHaveBeenCalled()
    download.cleanup(); download.cleanup()
    expect(download.host.revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:backup')
    expect(write.mock.calls.length).toBe(calls); expect(store.getSnapshot()).toEqual(before)
  })
  it('下载准备、点击或延后清理失败会释放URL并移除链接，后续重试可成功', () => {
    const state = initialState(), before = structuredClone(state)
    for (const failure of ['create', 'attach', 'click', 'defer'] as const) {
      const failed = downloadHost(failure)
      expect(() => downloadSaveBackup(state, failed.host)).toThrow()
      expect(failed.host.revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:backup')
      expect(failed.link.remove).toHaveBeenCalledTimes(failure === 'create' ? 0 : 1)
      const retry = downloadHost()
      downloadSaveBackup(state, retry.host)
      expect(retry.link.click).toHaveBeenCalledOnce()
      retry.cleanup()
    }
    expect(state).toEqual(before)
  })
  it('三个恢复上下文无需存档面板模块就有备份与保存状态，隐藏范围不展示未来剧情摘要', () => {
    for (const context of ['scene', 'panel', 'save'] as const) {
      const boundary = new SceneBoundary({ children: null, context, onFailure: vi.fn(), onReload: vi.fn(), onBack: vi.fn() })
      boundary.state = SceneBoundary.getDerivedStateFromError(new Error('missing chunk'))
      const html = renderToStaticMarkup(boundary.render())
      for (const text of ['直接导出当前进度 JSON', '自动存档', '保存后刷新页面', '战斗位置和敌人会从营地重建'])
        expect(html).toContain(text)
      expect(html).not.toContain('下载已发起')
      expect(html).not.toContain('净莲妖火')
    }
  })
})
