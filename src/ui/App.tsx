import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { chapters, chapterById } from '../content/chapters'
import { gameStore } from '../core/store'
import { canEnter, chapterReady, flames, isVisible, playerStats, skillInfo, skillUnlocked, unlockedFlames } from '../core/rules'
import { AlchemyPanel, SavesPanel, SettingsPanel, ShopPanel } from './Panels'
import TouchControls from './TouchControls'
import { setVolume, unlockAudio } from '../game/audio'
import type { Dialogue } from '../core/model'
import { eventsForChapter } from '../content/events'
import { mapForChapter } from '../content/maps'
import { eventDone, eventHint, eventProgress } from '../core/events'
import StoryEventPanel from './StoryEventPanel'
import { teacherSupport } from '../core/companions'

const GameView = lazy(() => import('./GameView'))
type Panel = 'guide' | 'camp' | 'character' | 'alchemy' | 'save' | 'settings' | 'shop' | 'event' | null
interface Story { lines: Dialogue[]; index: number; closing: boolean }

export default function App() {
  const { state: s, runtime: r, notice } = useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot)
  const [screen, setScreen] = useState<'home' | 'world' | 'play'>('home')
  const [panel, setPanel] = useState<Panel>(null)
  const [eventId, setEventId] = useState<string>()
  const [eventCheckpoint, setEventCheckpoint] = useState<number>()
  const [story, setStory] = useState<Story | null>(null)
  const [run, setRun] = useState(0)
  const [ready, setReady] = useState(false)
  const [portrait, setPortrait] = useState(() => window.matchMedia('(max-width:720px) and (orientation:portrait)').matches)
  const chapter = chapterById(s.chapter), progress = s.progress[s.chapter]
  const map = mapForChapter(s.chapter)
  const flame = flames.find(f => f.id === s.flame)!
  const stats = playerStats(s)
  const completed = s.completed.includes(s.chapter)
  const support = teacherSupport(s)

  useEffect(() => { gameStore.initialize().finally(() => setReady(true)) }, [])
  useEffect(() => { setVolume(s.settings.volume) }, [s.settings.volume])
  useEffect(() => {
    const media = window.matchMedia('(max-width:720px) and (orientation:portrait)')
    const changed = () => setPortrait(media.matches)
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [])
  useEffect(() => {
    gameStore.paused = screen !== 'play' || panel !== null || story !== null || r.dead || portrait
    if (gameStore.paused) { gameStore.move = { x: 0, y: 0 }; gameStore.actions.length = 0 }
    gameStore.onInteract = () => setPanel('camp')
    gameStore.onStoryEvent = (id, checkpoint) => { setEventId(id); setEventCheckpoint(checkpoint); setPanel('event') }
    return () => { gameStore.onInteract = null; gameStore.onStoryEvent = null }
  }, [screen, panel, story, r.dead, portrait])
  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => gameStore.notify(''), 3500)
    return () => window.clearTimeout(id)
  }, [notice])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !story && (screen === 'play' || panel)) setPanel(p => p ? null : 'camp')
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [story, screen, panel])
  useEffect(() => {
    if (!panel && !story && !r.dead) return
    const previous = document.activeElement as HTMLElement | null
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]')
    const dialog = dialogs[dialogs.length - 1]
    if (!dialog) return
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),select,input:not([hidden]),a[href]')]
    focusable()[0]?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const controls = focusable(), first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); previous?.focus() }
  }, [panel, story, r.dead])

  function enter(id: number) {
    unlockAudio()
    if (!gameStore.enter(id)) { gameStore.notify('该篇章尚未解锁或超出剧透范围。'); return }
    const c = chapterById(id), p = gameStore.getSnapshot().state.progress[id]
    setPanel(null); setScreen('play'); setRun(n => n + 1)
    if (!p.intro) setStory({ lines: c.opening, index: 0, closing: false })
  }
  function advanceStory() {
    if (!story) return
    if (story.index < story.lines.length - 1) { setStory({ ...story, index: story.index + 1 }); return }
    if (!story.closing) gameStore.introSeen()
    const closing = story.closing
    setStory(null)
    if (closing) setScreen('world')
  }
  function finish() {
    if (gameStore.finish()) { setPanel(null); setStory({ lines: chapter.closing, index: 0, closing: true }) }
  }
  function retry() { gameStore.runtime({ ...r, dead: false }); setRun(n => n + 1) }

  return <div className={`shell ${screen === 'play' ? 'playing' : ''} ${s.settings.reducedMotion ? 'reduced' : ''}`}>
    <header className="topbar">
      <button className="brand brand-button" onClick={() => { setScreen('home'); setPanel(null); setStory(null) }}><span className="brand-seal">炎</span><span>斗破苍穹<small>异 火 之 路</small></span></button>
      <nav aria-label="主导航">
        <button className={screen === 'home' ? 'nav active' : 'nav'} onClick={() => { setScreen('home'); setStory(null) }}>启程</button>
        <button className={screen === 'world' ? 'nav active' : 'nav'} onClick={() => { setScreen('world'); setStory(null) }}>大陆舆图</button>
        <button className="nav" onClick={() => setPanel('guide')}>修炼手札</button>
      </nav>
      <span className="version-label">{screen === 'play' ? `${s.gold} 金币 · ${chapter.realm}` : '浏览器单机 · 章节式冒险'}</span>
      <div className="top-tools"><button className="icon-button" onClick={() => setPanel('character')} aria-label="查看人物">◈</button><button className="icon-button" onClick={() => setPanel('save')} aria-label="存档管理">▤</button><button className="icon-button" onClick={() => setPanel('settings')} aria-label="游戏设置">⚙</button></div>
    </header>
    {screen === 'home' && <main className="landing">
      <div className="landscape" />
      <section className="hero">
        <span className="eyebrow"><i /> 从乌坦城，走向斗气大陆</span>
        <h1>以少年之名<br /><em>赴异火之约。</em></h1>
        <p>一枚古戒，一位老师，一条不向命运低头的路。<br />探索山川，磨砺斗技，以掌中之火照亮新的旅途。</p>
        <div className="hero-actions"><button className="primary" disabled={!ready} onClick={() => enter(s.chapter)}>{ready ? '开始历练' : '读取旅途…'} <span>↗</span></button><button className="secondary" onClick={() => setScreen('world')}>展开大陆舆图</button></div>
        <div className="hero-stats"><div><b>{String(chapters.length).padStart(2, '0')}</b><span>当前可玩篇章</span></div><div><b>焚诀</b><span>异火成长之路</span></div><div><b>纯网页</b><span>无需安装客户端</span></div></div>
      </section>
      <aside className="landing-note"><span className="vertical-title">万 火 归 一</span><span>斗气大陆 · 故事改编</span></aside>
      <footer className="landing-footer"><span>原创短对白 · 程序绘制场景 · 单机冒险</span><span>漫长的旅途，从此刻开始。</span></footer>
    </main>}
    {screen === 'world' && <main className="world-page">
      <div className="page-heading"><div><span className="eyebrow">斗气大陆 / 章节旅途</span><h1>山海有尽，修炼无涯。</h1><p className="muted">沿着萧炎的足迹前行。首通解锁下一篇章，已完成的篇章可重返修炼。</p></div><span className="chapter-counter">{s.completed.length}<small> / {chapters.length} 篇章</small></span></div>
      {s.completed.length === chapters.length && isVisible(s, 28) && <div className="ending-banner"><span className="brand-seal">帝</span><div><span className="eyebrow">全主线已完成 / 旅途仍在继续</span><h2>从少年，到炎帝。</h2><p className="muted">你已走过 {chapters.length} 个篇章，完成 {s.totalKills} 次普通战、炼制 {s.totalBrews} 炉丹药。可以重返各地，自由修炼，或导出存档纪念这一程。</p></div></div>}
      <div className="chapter-grid">{chapters.map(c => {
        const visible = isVisible(s, c.id), unlocked = canEnter(s, c.id), done = s.completed.includes(c.id)
        return <button key={c.id} disabled={!unlocked} className={`chapter-card theme-${visible ? c.theme : 'city'} ${done ? 'done' : ''}`} onClick={() => enter(c.id)}>
          <span className="chapter-number">{String(c.id).padStart(2, '0')}<small>{done ? '已历练 ✓' : unlocked ? '可启程 ↗' : '未解锁 ◇'}</small></span>
          <div className="chapter-art"><span>山</span><i /><i /><i /></div>
          <span className="chapter-place">{visible ? c.location : '待揭晓之地'}</span>
          <h2>{visible ? c.title : '未揭晓篇章'}</h2><p>{visible ? c.summary : '超出当前剧透范围。可在后续设置中调整已观看篇章上限。'}</p>
          <span className="chapter-bottom">{visible ? c.realm : '旅途尚未抵达'}<b>{done ? '重返' : '启程'} →</b></span>
        </button>
      })}</div>
    </main>}
    {screen === 'play' && <main className="adventure">
      <aside className="quest-sidebar">
        <span className="eyebrow">第 {String(chapter.id).padStart(2, '0')} 章</span><h2>{chapter.title}</h2>
        <p className="muted">{chapter.summary}</p><div className="thin-divider" />
        <span className="section-label">本章历练</span>
        {eventsForChapter(s.chapter).map(event => <div key={event.id} className={`quest-line ${eventDone(s, s.chapter, event.id) ? 'checked' : ''}`}><span>{eventDone(s, s.chapter, event.id) ? '✓' : '◇'}</span><div>{event.title}{event.optional && ' · 支线'}<small>{eventHint(s, event.id)}</small></div><b>{eventProgress(s, s.chapter, event.id).stage} / {event.stages.length - 1}</b></div>)}
        {chapter.objectives.herbs > 0 && <Quest text="采集灵草" current={progress.herbs} target={chapter.objectives.herbs} />}
        {chapter.objectives.kills > 0 && <Quest text="击败普通敌人" current={progress.kills} target={chapter.objectives.kills} />}
        {chapter.objectives.brews > 0 && <Quest text="炼制丹药" current={progress.brews} target={chapter.objectives.brews} />}
        {r.escort && <div className="mountain-status"><b>采药同伴</b><Meter value={r.escort.hp} max={r.escort.maxHp} label="同伴生命" color="hp" /><span>{r.escort.failed ? '受伤倒下 · 营地休整重试' : r.escort.waiting ? '等待你靠近 · 先清理沿途威胁' : '正在跟进 · 到达后按 E 采药'}</span></div>}
        {r.survival && <div className="mountain-status"><b>狮王警戒 · 剩余 {r.survival.remaining} 秒</b><span>{r.survival.inZone ? '避开紫色落焰预警，窗口开启后向西撤离' : '请进入紫色警戒区 · 区外不计时'}</span></div>}
        {r.patrol && <div className="mountain-status patrol-status"><b>蛇人巡逻 · 警戒 {r.patrol.alert}%</b><span>{r.patrol.alerted ? '已被发现 · 战斗或退回营地脱离警戒' : '掩体可阻挡视线 · 在警戒满前离开巡逻圈'}</span></div>}
        {r.heatChallenge && <div className="mountain-status heat-status"><b>{['火焰引流', '熔脉绕行', '火息凝定'][r.heatChallenge.phase - 2]} · 剩余 {r.heatChallenge.remaining} 秒</b><span>热量 {r.heatChallenge.heat} / 100 · {r.heatChallenge.failed ? '火焰失控，营地休整后重试当前阶段' : !r.heatChallenge.inZone ? '进入火域继续计时，区外可降温' : r.heatChallenge.cooling ? '正在冷却 · 继续避开预警' : '靠近青色冷却点降温，躲开火焰预警'}</span></div>}
        {r.duel && <div className="mountain-status duel-status"><b>约定之战 · 第{r.duel.phase}阶段 · {r.duel.move}</b><span>{r.duel.warning ? '预警已锁定 · 离开危险范围' : r.duel.recovery ? '收招窗口 · 反击伤害提高15%' : '保持走位 · 决斗期间无法离开演武台'}</span></div>}
        {r.escape && <div className="mountain-status escape-status"><b>{map.thunderRoute ? r.escape.stage === 1 ? '西侧避雷石' : '东侧避雷石' : r.escape.stage === 1 ? '岩间掩体' : '竹林掩体'} · 剩余{r.escape.remaining}秒</b><span>{r.escape.sheltered ? map.thunderRoute ? '正在整理退路 · 落雷仍会锁定脚下' : '正在稳住退路 · 继续躲避追击预警' : '前往当前青色区域 · 区外暂停计时'}</span></div>}
        {r.squad && <div className="mountain-status squad-status"><b>试炼同伴 · 双阵协作</b><Meter value={r.squad.hp} max={r.squad.maxHp} label="试炼同伴生命" color="hp" /><span>{r.squad.failed ? '同伴受伤 · 休整后重试' : r.squad.holding ? r.squad.channeling ? `持续共鸣 · 剩余${r.squad.remaining}秒` : '同伴守住西阵 · 保护同伴，到东阵共鸣' : r.squad.waiting ? '同伴等你靠近 · 不要甩下队伍' : '同伴正在跟进 · 双方到达后E交互'}</span></div>}
        {r.huntTeam && <div className="mountain-status"><b>磐门猎捕队友</b><Meter value={r.huntTeam.hp} max={r.huntTeam.maxHp} label="猎捕队友生命" color="hp" /><span>{r.huntTeam.failed ? '队友受伤 · 休整重试，已领火能保留' : r.huntTeam.arrived ? '双方已返回 · 向胡嘉登记' : r.huntTeam.waiting ? '队友等待靠近 · 不要甩下队伍' : '队友正在跟进 · 清理守卫后共同交互'}</span></div>}
        {chapter.id === 14 && <div className="mountain-status"><b>火能 {s.fireEnergy}</b><span>{completed ? '每次复练胜利+1 · 人物面板2火能换30积累' : '两路各+2 · 登记−2 · 强榜首胜+3'}</span></div>}
        {r.ranking && <div className="mountain-status"><b>{r.ranking.practice ? '强榜复练' : '强榜挑战'} · 第{r.ranking.phase}阶段</b><span>{r.ranking.shield ? '蓄势护盾 · 伤害降低65%，离开锁定预警' : r.ranking.recovery ? '收招窗口 · 反击伤害提高25%' : '保持走位，等待收招反击'}</span></div>}
        {r.tower && <div className="mountain-status"><b>火塔第{r.tower.floor}层 · 剩余{r.tower.remaining}秒</b><span>心炎热量 {r.tower.heat} / 100 · {r.tower.failed ? '本层失控 · 休整从安全台阶重试' : r.tower.cooling ? '镇心石降热 · 当前计时暂停' : r.tower.inZone ? '镇炎计时中 · 躲开落焰并留意热量' : '前往当前层阵眼 · 区外暂停计时'}</span></div>}
        {r.siege && <div className="mountain-status"><b>第{r.siege.stage}阵 · 连续破阵剩余{r.siege.remaining}秒</b><span>{r.siege.guards > 0 ? `守阵投影${r.siege.guards}名 · 先清理威胁` : r.siege.channeling ? '稳定斗气中 · 离阵或受击会中断' : '进入当前阵眼 · 已通过节点保留'}</span></div>}
        {r.sect && <div className="mountain-status"><b>宗门决战 · 第{r.sect.phase}阶段</b><span>{r.sect.shield ? '云盾蓄势 · 减伤45%，离开锁定预警' : r.sect.recovery ? '收招窗口 · 反击伤害提高30%' : '留心云阵预警，等待反击机会'}</span></div>}
        {chapter.id === 17 && <div className="mountain-status"><b>炎盟筹备</b><span>{eventProgress(s).choice === 'none' ? '先看议事牌 · 免费巡防或60金币补给' : eventProgress(s).choice === 'premium' ? '补给已支付 · 按序登记两处驻点' : '免费巡防 · 清理两处驻点守卫后登记'}</span></div>}
        {chapter.id === 19 && <div className="mountain-status"><b>师门记录</b><span>西林{eventProgress(s).score & 1 ? '已取得' : '待寻找'} · 东侧{eventProgress(s).score & 2 ? '已取得' : '待寻找'} · 药老仍待营救</span></div>}
        {r.expedition && <div className="mountain-status"><b>丹界目标 {r.expedition.collected}/3 · 剩余{r.expedition.remaining}秒</b><span>{r.expedition.failed ? '已超时 · 免费重试，保留已取得节点' : '清理驻点守卫后E取得 · 普通药草不能代交'}</span></div>}
        {r.danLightning && <div className="mountain-status"><b>丹雷第{r.danLightning.phase}段 · 剩余{r.danLightning.remaining}秒</b><span>{r.danLightning.inZone ? '范围内计时 · 躲避落雷预警' : '范围外暂停计时 · 雷击仍会继续'}</span></div>}
        <div className={`quest-line ${progress.boss ? 'checked' : ''}`}><span>{progress.boss ? '✓' : '◇'}</span><div>通过章节试炼<small>{chapter.boss}</small></div></div>
        <p className="quest-hint">{completed ? '本章已结算，可自由修炼或返回大陆舆图继续旅途。' : progress.boss ? '返回左下营地，结算本章并解锁新的旅途。' : chapterReady(s) ? `准备完成。前往${map.gateLabel ?? '地图上的试炼碑'}，按 E ${map.trialMode === 'assessment' ? '提交审核' : map.trialMode === 'attunement' ? '确认火域收服' : '开始挑战'}。` : !eventDone(s) ? eventHint(s) : '沿小径寻找发光药草。接近敌人后，用走位和斗技完成历练。'}</p>
        <div className="sidebar-bottom"><button className="secondary" onClick={() => setPanel('alchemy')}>开炉炼药</button><button className="secondary" onClick={() => setPanel('camp')}>营地与休整</button><button className="text-button" onClick={() => setPanel('character')}>人物 · 行囊 ↗</button></div>
      </aside>
      <section className="stage-wrap">
        <div className="stage-topline"><span>◈ {chapter.location}</span><span style={{ color: flame.color }}>● {flame.name}</span></div>
        <div className="stage">
          <Suspense fallback={<div className="loading">正在展开山川画卷…</div>}><GameView key={`${s.chapter}:${run}`} /></Suspense>
          <div className="player-hud" data-player-x={r.x} data-player-y={r.y}><span className="portrait-small">炎</span><div><b>萧炎 <small>{chapter.realm}</small></b><Meter value={r.hp} max={r.maxHp} label="生命" color="hp" /><Meter value={r.qi} max={r.maxQi} label="斗气" color="qi" /><Meter value={r.stamina} max={100} label="体力" color="stamina" /></div></div>
          {r.bossMaxHp > 0 && r.bossHp > 0 && <div className="boss-hud"><span>{r.bossName}<small className="boss-phase">第 {r.duel?.phase ?? r.ranking?.phase ?? r.sect?.phase ?? (r.bossHp / r.bossMaxHp < .35 ? 3 : r.bossHp / r.bossMaxHp < .7 ? 2 : 1)} 阶段</small></span><Meter value={r.bossHp} max={r.bossMaxHp} label="首领生命" color="boss" /></div>}
          {r.prompt && !panel && !story && <button className="interaction" onClick={() => gameStore.action('interact')}>{r.prompt}</button>}
          <div className="stage-location"><span>☷</span> {chapter.trialNote || '游戏改编历练 · 场景与战斗为原创实现'}</div>
          <TouchControls onMenu={() => setPanel('camp')} />
        </div>
        <div className="combat-bar"><div className="basic-controls"><span><kbd>WASD</kbd> 移动</span><button onClick={() => gameStore.action('attack')}><kbd>J</kbd> 普攻</button><button onClick={() => gameStore.action('dodge')}><kbd>空格</kbd> 闪避</button><button onClick={() => gameStore.action('mana')}><kbd>F</kbd> 回气</button><button disabled={!support.available} onClick={() => gameStore.action('support')}><kbd>R</kbd> {support.available ? '支援' : '支援暂不可用'}</button></div>
          <div className="skills">{skillInfo.map(skill => {
            const unlocked = skillUnlocked(s, skill.id), cd = r.cooldowns[skill.id]
            const revealed = isVisible(s, skill.unlock)
            return <button className={`skill ${unlocked ? '' : 'locked'}`} key={skill.id} onClick={() => gameStore.action(skill.id)} disabled={!unlocked || !revealed} title={revealed ? skill.description : '超出当前剧透范围'}><kbd>{skill.key}</kbd><b>{revealed ? skill.name : '未揭晓斗技'}</b><small>{!unlocked || !revealed ? '剧情解锁' : cd > .1 ? `${cd.toFixed(1)}s` : `${skill.cost} 斗气`}</small></button>
          })}<button className="skill potion" onClick={() => gameStore.action('heal')}><kbd>Q</kbd><b>恢复丹</b><small>{r.cooldowns.heal > .1 ? `${r.cooldowns.heal.toFixed(1)}s` : `持有 ${s.inventory.heal}`}</small></button></div>
        </div>
      </section>
    </main>}
    {notice && <div className="toast" role="status">{notice}</div>}
    {panel && <div className="modal-backdrop"><section className="modal panel" role="dialog" aria-modal="true" aria-label={{guide:'修炼手札',camp:'营地休整',character:'人物行囊',alchemy:'炼药',save:'存档管理',settings:'游戏设置',shop:'坊市',event:'剧情事件'}[panel]}>
      <button className="close" onClick={() => setPanel(null)} aria-label="关闭">×</button>
      {panel === 'event' && <StoryEventPanel key={`${eventId}:${eventCheckpoint}`} state={s} eventId={eventId} checkpoint={eventCheckpoint} close={() => setPanel(null)} shop={() => setPanel('shop')} />}
      {panel === 'guide' && <><span className="eyebrow">修炼手札 / 操作指引</span><h2>每一份力量，都来自历练。</h2><p className="muted">按左侧目标完成本章事件：前三章先与药老、萧战或坊市执事交谈，分别练习斗技、走完立约路线和交付订单。采集、击杀与炼药仅在目标列出时必做。目标完成后到试炼碑挑战首领，再回到营地结算。</p><div className="guide-grid">{[['WASD / 方向键', '移动'], ['J / 鼠标', '普攻'], ['空格', '闪避'], ['1 · 2 · 3', '斗技'], ['E', '人物 / 路标 / 采集 / 营地 / 试炼碑'], ['Q / R', '恢复丹 / 药老支援']].map(([key, label]) => <div key={label}><kbd>{key}</kbd><span>{label}</span></div>)}</div><p className="muted">浅红色圆形是敌人的攻击预警，及时离开范围。菜单、对白、切换后台时暂停战斗。失败可重试，已获得的资源不会消失。</p><button className="primary" onClick={() => setPanel(null)}>记下了</button></>}
      {panel === 'camp' && <><span className="eyebrow">灯火与归途 / 营地</span><h2>{completed ? '本章已经完成。' : progress.boss ? '这一程，你做到了。' : '整装，再赴历练。'}</h2><p className="muted">休整会回到营地并恢复状态，已结算的资源和任务进度保留。</p><div className="camp-options"><button className="secondary" onClick={() => { setPanel(null); retry() }}>营地休整 · 恢复状态</button>{progress.boss && !completed && <button className="primary" onClick={finish}>结算本章 · {chapter.reward} 金币 ↗</button>}<button className="secondary" onClick={() => { setPanel(null); setScreen('world') }}>返回大陆舆图</button></div><p className="muted">{chapter.trialNote}</p></>}
      {panel === 'camp' && <div className="panel-tabs"><button className="secondary" onClick={() => setPanel('alchemy')}>炼药</button><button className="secondary" onClick={() => setPanel('shop')}>坊市</button><button className="secondary" onClick={() => setPanel('save')}>存档</button><button className="secondary" onClick={() => setPanel('settings')}>设置</button></div>}
      {panel === 'character' && <><span className="eyebrow">人物 / 行囊</span><h2>萧炎 <small className="muted">{chapter.realm}</small></h2><div className="stat-grid">{[['生命上限', stats.maxHp], ['斗气上限', stats.maxQi], ['攻击', Math.round(stats.attack)], ['防御', Math.round(stats.defense)], ['金币', s.gold], ['修炼积累', s.xp]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div><div className="inventory-grid">{[['灵草', s.inventory.herb], ['魔晶', s.inventory.crystal], ['恢复丹', s.inventory.heal], ['回气丹', s.inventory.mana]].map(([label, value]) => <div key={label}><span>◇ {label}</span><b>×{value}</b></div>)}</div><p className="muted">当前火焰：{flame.name}。{flame.description}</p></>}
      {panel === 'character' && s.completed.length >= 13 && isVisible(s, 14) && <div className="mountain-status"><b>火能 {s.fireEnergy} · 磐门修炼</b><span>双路猎捕与强榜胜利取得。完成内院首通后可用于修炼；金币与火能分别记录。</span><button className="secondary" disabled={!s.completed.includes(14) || s.fireEnergy < 2} onClick={() => gameStore.fireTraining()}>火能修炼 · 2火能 / 30积累</button></div>}
      {panel === 'character' && <div className="mountain-status"><b>药老 · {support.available ? '支援可用' : '支援暂不可用'}</b><span>{support.status === 'away' && !isVisible(s, 16) ? '支援状态随已历练进度变化。' : support.status === 'returned' && !isVisible(s, 22) ? '同行指导' : support.label}</span></div>}
      {panel === 'character' && <><div className="upgrade-row"><button className="secondary" disabled={s.gold < 60 + s.attackUpgrade * 60 || s.attackUpgrade >= 20} onClick={() => gameStore.upgrade('attack')}>兵器磨砺 +{s.attackUpgrade} · {60 + s.attackUpgrade * 60} 金币</button><button className="secondary" disabled={s.gold < 60 + s.armorUpgrade * 60 || s.armorUpgrade >= 20} onClick={() => gameStore.upgrade('armor')}>护具强化 +{s.armorUpgrade} · {60 + s.armorUpgrade * 60} 金币</button><button className="secondary" disabled={s.inventory.elixir < 1} onClick={() => gameStore.update(s => { if (s.inventory.elixir > 0) { s.inventory.elixir--; s.xp += 100 } })}>修炼丹 ×{s.inventory.elixir} · 使用</button></div><span className="section-label">已取得火焰</span><div className="flame-list">{unlockedFlames(s).filter(f => isVisible(s, f.chapter)).map(f => <button key={f.id} className={`flame-card ${s.flame === f.id ? 'active' : ''}`} onClick={() => gameStore.update(s => { s.flame = f.id })}><b style={{ color: f.color }}>◈ {f.name}</b><small>{f.description}</small></button>)}</div></>}
      {panel === 'alchemy' && <AlchemyPanel state={s} />}
      {panel === 'shop' && <ShopPanel state={s} />}
      {panel === 'settings' && <SettingsPanel state={s} />}
      {panel === 'save' && <SavesPanel state={s} onLoaded={() => { setPanel(null); setStory(null); setScreen('home'); setRun(n => n + 1) }} onReset={() => { setPanel(null); setStory(null); setScreen('home'); setRun(n => n + 1) }} />}
    </section></div>}
    {story && <div className="story-backdrop"><section className="story-box" role="dialog" aria-modal="true" aria-label="剧情对白"><div className="story-portrait">{story.lines[story.index].speaker.slice(0, 1)}</div><div className="story-content"><span className="eyebrow">{story.closing ? '历练归来' : chapter.location}</span><h2>{story.lines[story.index].speaker}</h2><p>{story.lines[story.index].text}</p><button className="primary" onClick={advanceStory}>{story.index < story.lines.length - 1 ? '继续' : story.closing ? '展开新的旅途' : '开始探索'} <span>→</span></button><small>{story.index + 1} / {story.lines.length}</small></div></section></div>}
    {screen === 'play' && r.dead && !story && <div className="modal-backdrop"><section className="modal panel" role="dialog" aria-modal="true" aria-label="历练失败"><span className="eyebrow">暂歇，不是终点</span><h2>这一次，记住预警与退路。</h2><p className="muted">任务进度、金币和材料已保留。{map.escapeRoute ? '重试会返回最近完成的安全点。前往当前青色掩体，追击锁定后离开紫色区域，再回来稳住退路。' : map.heatZone ? '重试会从当前控火阶段恢复。离开预警范围，并利用青色冷却点降温。' : map.duelArena ? '决斗会重新开始，赴约足迹保留。躲开锁定招式，在收招窗口反击。' : '在蓄力预警时离开危险区域，再用八极崩打断普通敌人。'}</p><button className="primary" onClick={retry}>{map.escapeRoute ? '返回安全点，继续撤离' : '回到营地，重新挑战'}</button><button className="text-button" onClick={() => setScreen('world')}>返回舆图</button></section></div>}
  </div>
}
function Quest({ text, current, target }: { text: string; current: number; target: number }) {
  return <div className={`quest-line ${current >= target ? 'checked' : ''}`}><span>{current >= target ? '✓' : '◇'}</span><div>{text}</div><b>{Math.min(current, target)} / {target}</b></div>
}
function Meter({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  return <div className={`meter ${color}`} role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><i style={{ width: `${Math.max(0, Math.min(100, value / max * 100))}%` }} /><span>{label} {value} / {max}</span></div>
}
