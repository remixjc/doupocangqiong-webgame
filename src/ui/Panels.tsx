import { useRef, useState } from 'react'
import { recipes, itemNames } from '../content/recipes'
import { gameStore } from '../core/store'
import { chapters } from '../content/chapters'
import { craft, prices, unlockedChapter, flames, isVisible } from '../core/rules'
import type { GameState, ItemId } from '../core/model'
import HeatControl from './HeatControl'

export default function ToolkitPanel({ panel, state, activeDifficulty }: {
  panel: 'alchemy' | 'shop' | 'settings'; state: GameState; activeDifficulty?: GameState['settings']['difficulty']
}) {
  if (panel === 'alchemy') return <AlchemyPanel state={state} />
  if (panel === 'shop') return <ShopPanel state={state} />
  return <SettingsPanel state={state} activeDifficulty={activeDifficulty} />
}

export function AlchemyPanel({ state }: { state: GameState }) {
  const [recipeId, setRecipeId] = useState('heal')
  const [phase, setPhase] = useState(-1)
  const [scores, setScores] = useState<number[]>([])
  const resolved = useRef(false)
  const recipe = recipes.find(r => r.id === recipeId)!
  const preview = craft(state, recipeId, .5)
  function lock(marker: number) {
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
    {phase >= 0 && phase <= 2 && <div className="alchemy-active"><div className="cauldron burning">鼎</div><span className="eyebrow">第 {phase + 1} 步 / {['提炼 · 除去杂质', '融合 · 协调药性', '凝丹 · 收束火焰'][phase]}</span>
      <HeatControl key={`${recipeId}:${phase}`} reducedMotion={state.settings.reducedMotion} alchemyPeriod={phase === 2 ? 290 : 420}
        markerLabel="炼药控火指针" inputLabel="炼药火力位置" lockLabel="锁定火力" onLock={lock} />
      <p className="muted">中途关闭不会消耗材料。第三步结算时统一扣除并产出。</p></div>}
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
    <label className="setting-row"><span>减弱动态效果<small>减少人物与火焰动画，控气、控火和心念改用键盘滑杆；保留动作提示和危险预警。</small></span><input type="checkbox" checked={state.settings.reducedMotion} onChange={e => settings({ reducedMotion: e.target.checked })} /></label>
    <p className="muted">菜单、剧情和页面后台暂停战斗。手机横屏使用摇杆；普攻按钮可按住连击。所有音效由程序合成。</p>
  </>
}
