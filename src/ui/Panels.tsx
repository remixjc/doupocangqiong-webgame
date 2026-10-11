import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { recipes, itemNames } from '../content/recipes'
import { gameStore } from '../core/store'
import { chapterById, chapters } from '../content/chapters'
import { craft, prices, unlockedChapter, flames, isVisible } from '../core/rules'
import type { GameState, ItemId } from '../core/model'
import { listSlots, parseSave, saveSlot, serializeSave, type SaveRecord } from '../core/save'
import { bondSaveSummary } from '../core/bonds'
import SaveStatus from './SaveStatus'

export function AlchemyPanel({ state }: { state: GameState }) {
  const [recipeId, setRecipeId] = useState('heal')
  const [phase, setPhase] = useState(-1)
  const [marker, setMarker] = useState(.5)
  const [scores, setScores] = useState<number[]>([])
  const resolved = useRef(false)
  const recipe = recipes.find(r => r.id === recipeId)!
  const preview = craft(state, recipeId, .5)
  useEffect(() => {
    if (phase < 0 || phase > 2) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => { setMarker((Math.sin((now - start) / (phase === 2 ? 290 : 420)) + 1) / 2); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase])
  function lock() {
    if (resolved.current) return
    const score = Math.max(0, 1 - Math.abs(marker - .5) * 2)
    const next = [...scores, score]
    setScores(next)
    if (phase === 2) {
      resolved.current = true
      gameStore.craft(recipeId, next.reduce((a, b) => a + b, 0) / 3)
      setPhase(3)
    } else setPhase(phase + 1)
  }
  return <><span className="eyebrow">炼药 / 控火成丹</span><h2>掌中之火，也需要耐心。</h2>
    <p className="muted">三个阶段分别锁定火力。指针越靠近中间的金色区域，品质越高；上品额外产出一枚。丹药名称与数值为游戏设计。</p>
    <div className="recipe-tabs">{recipes.filter(r => unlockedChapter(state) >= r.unlock && isVisible(state, r.unlock)).map(r => <button key={r.id} className={r.id === recipeId ? 'selected' : ''} disabled={phase >= 0 && phase <= 2} onClick={() => { setRecipeId(r.id); setPhase(-1) }}>{r.name}</button>)}</div>
    <p className="muted">{recipe.description}</p><div className="ingredient-row">{(Object.entries(recipe.cost) as [ItemId, number][]).map(([id, n]) => <span key={id} className={state.inventory[id] < n ? 'insufficient' : ''}>{itemNames[id]} {state.inventory[id]} / {n}</span>)}</div>
    {phase < 0 && <div className="alchemy-idle"><div className="cauldron">鼎</div><div className="camp-options"><button className="primary" disabled={!preview.ok} onClick={() => { resolved.current = false; setScores([]); setPhase(0) }}>开炉 · 手动控火</button><button className="secondary" disabled={!preview.ok} onClick={() => gameStore.craft(recipeId, .5)}>稳火炼制 · 固定良品</button></div>{!preview.ok && <p className="muted">{preview.message}</p>}</div>}
    {phase >= 0 && phase <= 2 && <div className="alchemy-active"><div className="cauldron burning">鼎</div><span className="eyebrow">第 {phase + 1} 步 / {['提炼 · 除去杂质', '融合 · 协调药性', '凝丹 · 收束火焰'][phase]}</span><div className="heat-meter"><div className="heat-target" /><i style={{ left: `${marker * 100}%` }} /></div><button className="primary" onClick={lock}>锁定火力</button><p className="muted">中途关闭不会消耗材料。第三步结算时统一扣除并产出。</p></div>}
    {phase === 3 && <div className="alchemy-result"><div className="cauldron">丹</div><h2>一炉已成</h2><p className="muted">控火评分 {Math.round(scores.reduce((a, b) => a + b, 0) / 3 * 100)} / 100，产物已经放入行囊。</p><button className="primary" onClick={() => setPhase(-1)}>继续炼制</button></div>}
  </>
}
export function ShopPanel({ state }: { state: GameState }) {
  return <><span className="eyebrow">坊市 / 行囊补给</span><h2>备好行囊，再向远方。</h2><p className="muted">持有金币：{state.gold}。金币来自普通战与章节首通，重复首通不会再次发放奖励。</p><div className="shop-list">{(Object.keys(itemNames) as ItemId[]).map(id => <div className="shop-item" key={id}><span className="item-glyph">{id === 'herb' ? '草' : id === 'crystal' ? '晶' : '丹'}</span><div><b>{itemNames[id]}</b><small>行囊 ×{state.inventory[id]}</small></div><button className="small-btn" disabled={state.gold < prices[id]} onClick={() => gameStore.buy(id)}>{prices[id]} 金币 · 购入</button></div>)}</div></>
}
export function SettingsPanel({ state, activeDifficulty }: { state: GameState; activeDifficulty?: GameState['settings']['difficulty'] }) {
  function settings(part: Partial<GameState['settings']>) {
    gameStore.update(s => {
      Object.assign(s.settings, part)
      if (s.settings.spoiler === 'anime' && s.chapter > s.settings.animeLimit) s.chapter = Math.min(unlockedChapter(s), s.settings.animeLimit)
      if (s.settings.spoiler === 'anime' && flames.find(f => f.id === s.flame)!.chapter > s.settings.animeLimit) s.flame = 'ember'
    })
  }
  return <><span className="eyebrow">设置 / 随心历练</span><h2>用自己的节奏，走这条路。</h2>
    <label className="setting-row"><span>战斗难度<small>剧情：更低敌人生命与伤害；普通：标准；挑战：更强敌人。</small></span><select value={state.settings.difficulty} onChange={e => settings({ difficulty: e.target.value as GameState['settings']['difficulty'] })}><option value="story">剧情</option><option value="normal">普通</option><option value="hard">挑战</option></select></label>
    <p className="muted" role="status">{activeDifficulty && `本次历练：${{ story: '剧情', normal: '普通', hard: '挑战' }[activeDifficulty]}。`}难度选择会保存，重新进入篇章或营地休整后生效。</p>
    <label className="setting-row"><span>剧情范围<small>动画模式由你设置已看进度，不对应未经核实的最新集数。</small></span><select value={state.settings.spoiler} onChange={e => settings({ spoiler: e.target.value as 'novel' | 'anime' })}><option value="novel">小说完整主线</option><option value="anime">动画进度 / 防剧透</option></select></label>
    {state.settings.spoiler === 'anime' && <label className="setting-row"><span>允许揭晓至游戏第几章<small>锁定篇章隐藏标题和概要。修改不会抹除已完成记录。</small></span><select value={Math.min(state.settings.animeLimit, chapters.length)} onChange={e => settings({ animeLimit: Number(e.target.value) })}>{chapters.map(c => <option key={c.id} value={c.id}>第 {c.id} 章</option>)}</select></label>}
    <label className="setting-row"><span>音效音量<small>主动操作后启用；音量实时生效，0 为静音。暂停或切后台时停止音效。</small></span><input aria-label="音效音量" type="range" min="0" max="1" step=".05" value={state.settings.volume} onChange={e => settings({ volume: Number(e.target.value) })} /></label>
    <label className="setting-row"><span>减弱动态效果<small>减少人物摆动、挥动与火焰动画，保留动作提示和危险预警。</small></span><input type="checkbox" checked={state.settings.reducedMotion} onChange={e => settings({ reducedMotion: e.target.checked })} /></label>
    <p className="muted">菜单、剧情和页面后台暂停战斗。手机横屏使用摇杆；普攻按钮可按住连击。所有音效由程序合成。</p>
  </>
}
export function SavesPanel({ state, onLoaded, onReset }: { state: GameState; onLoaded: () => void; onReset: () => void }) {
  const { autosave } = useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot)
  const [records, setRecords] = useState<SaveRecord[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [imported, setImported] = useState<GameState | null>(null)
  const [confirm, setConfirm] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  async function refresh() {
    try { await gameStore.waitForAutosave(); setRecords(await listSlots()) } catch (e) { setError((e as Error).message) }
  }
  useEffect(() => { void refresh() }, [autosave.phase, autosave.savedAt])
  async function save(slot: number) {
    setBusy(true); setError('')
    try { await saveSlot(slot, state); await refresh(); gameStore.notify('手动存档已保存。') } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  async function load(slot: number) {
    setBusy(true); setError('')
    try {
      if (!await gameStore.loadSavedSlot(slot)) throw new Error('此存档槽为空。')
      onLoaded(); gameStore.notify('存档已载入，从营地继续历练。')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  function exportJson() {
    const url = URL.createObjectURL(new Blob([serializeSave(state)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = `异火之路-第${state.chapter}章-${Date.now()}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function importFile(file?: File) {
    if (!file) return
    try {
      if (file.size > 1_000_000) throw new Error('存档文件超过 1 MB 限制。')
      setImported(parseSave(await file.text())); setError('')
    } catch (e) { setImported(null); setError((e as Error).message) }
    if (fileInput.current) fileInput.current.value = ''
  }
  return <><span className="eyebrow">存档 / 留住这一程</span><h2>长路漫漫，记下足迹。</h2><p className="muted">自动存档保存章节与行囊，战斗重开时回到营地。清理浏览器数据会删除本地存档，请导出 JSON 备份。载入会替换当前进度。</p>
    <SaveStatus />
    <div className="save-list">{[0, 1, 2, 3].map(slot => {
      const entry = records?.find(r => r.slot === slot)
      let summary = records ? '空白存档' : '正在读取存档…'
      if (entry) {
        try {
          const saved = parseSave(entry.text)
          const visible = state.settings.spoiler === 'novel' || saved.chapter <= state.settings.animeLimit
          summary = `第 ${saved.chapter} 章 · ${visible ? chapterById(saved.chapter).title : '封存篇章'} · 已完成 ${saved.completed.length} 章 · ${bondSaveSummary(saved, state.settings)}`
        } catch { summary = '存档异常，可尝试恢复上一份自动备份' }
      }
      return <div className="save-item" key={slot}><div><b>{slot === 0 ? '自动存档' : `手动存档 ${slot}`}</b><small>{summary}</small>{entry && <small>{new Date(entry.savedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</small>}</div><div className="save-actions">{slot > 0 && <button className="small-btn" disabled={busy || !records} onClick={() => save(slot)}>保存</button>}<button className="secondary small-btn" disabled={busy || !entry} onClick={() => load(slot)}>载入</button></div></div>
    })}</div>
    <div className="save-tools"><button className="secondary" onClick={exportJson}>导出 JSON 备份</button><button className="secondary" onClick={() => fileInput.current?.click()}>导入备份</button><input ref={fileInput} aria-label="导入存档文件" type="file" accept=".json,application/json" hidden onChange={e => importFile(e.target.files?.[0])} /></div>
    {imported && <div className="import-preview"><p className="muted">校验通过：第 {imported.chapter} 章，已完成 {imported.completed.length} 章。{bondSaveSummary(imported, state.settings)}。载入前可先导出现有进度。</p><button className="small-btn" onClick={() => { gameStore.replace(imported); setImported(null); onLoaded() }}>确认载入导入存档</button></div>}
    {records?.some(r => r.slot === -1) && <button className="text-button" disabled={busy} onClick={() => load(-1)}>恢复上一份自动存档</button>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="thin-divider" />{confirm ? <><p className="muted">新旅程会替换自动存档，三个手动存档保留。请先保存或导出当前进度。</p><button className="secondary" onClick={() => { gameStore.newGame(); onReset() }}>确认开启新旅程</button><button className="text-button" onClick={() => setConfirm(false)}>取消</button></> : <button className="text-button" onClick={() => setConfirm(true)}>开启新旅程</button>}
  </>
}
