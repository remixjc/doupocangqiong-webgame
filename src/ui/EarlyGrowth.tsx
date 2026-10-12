import SceneHeading from './SceneHeading'
import type { GameState } from '../core/model'
import { earlyGrowthScenes } from '../content/early-growth'
import { earlyGrowthBlock, submitEarlyGrowth } from '../core/early-growth'
import { gameStore } from '../core/store'
import './early-growth.css'

export default function EarlyGrowth({ state, onContinue }: { state: GameState; onContinue?: () => void }) {
  if (earlyGrowthBlock(state)) return null
  const stage = state.earlyTraining.growth.stage, scene = earlyGrowthScenes[Math.min(stage, 2)]
  return <section className="bond-summary early-growth" aria-label="持续修炼的时日">
    <span className="eyebrow">从初期尝试到后续历练 / 成长过渡</span>
    <svg viewBox="0 0 640 220" role="img" aria-label={`修炼过渡插画：${scene.time}，萧炎继续打好基础。`}>
      <rect width="640" height="220" fill={scene.sky} />
      <circle cx={stage === 0 ? 510 : stage === 1 ? 120 : 350} cy={stage === 0 ? 45 : stage === 1 ? 100 : 42} r="22" fill={scene.sun} />
      {stage === 0 && <circle cx="520" cy="38" r="21" fill={scene.sky} />}
      <path d="M0 130 L95 65 L165 128 L276 52 L365 119 L495 60 L640 129 V220 H0Z" fill="#243e36" />
      <path d="M0 168 Q130 112 252 160 T640 151 V220 H0Z" fill="#3b5040" />
      {stage === 0 ? <g fill="none" stroke="#8d7852" strokeWidth="9"><path d="M45 20 H595 V207 H45Z M45 133 H595 M196 24 V131 M440 24 V131" /></g>
        : <g><path d="M96 184 V114 M548 184 V115" stroke="#6f5b43" strokeWidth="10" /><path d="M60 125 L98 66 L133 125Z M510 125 L548 59 L582 125Z" fill="#496349" /></g>}
      <ellipse cx="320" cy="200" rx="61" ry="9" fill="#142c27" />
      <path d="M287 186 Q294 141 320 145 Q347 141 352 186 L376 197 H264Z" fill="#c29b69" />
      <circle cx="320" cy="130" r="17" fill="#e7c49e" /><path d="M301 127 Q319 94 338 127" fill="#1d2d2b" />
      <path d="M299 160 L281 181 L313 184 M341 160 L359 181 L327 184" fill="none" stroke="#d3b082" strokeWidth="7" strokeLinecap="round" />
      {stage === 0 && <g><path d="M98 205 V171" stroke="#af9157" strokeWidth="4" /><path d="M86 172 Q97 146 108 172Z" fill="#e5bc72" /></g>}
      <text x="28" y="36" fill="#e8d8b6" fontSize="14">{scene.time} · 修炼仍在继续</text>
    </svg>
    <p className="muted">以日夜画面压缩持续练习，翻页记录只代表已读过渡，不对应固定天数、境界提升或考核成绩。</p>
    {stage < 3 ? <>
      <p role="status">过渡翻阅 {stage}/3 · 可中途关闭</p>
      <SceneHeading title={scene.title} text={scene.text} speaker={scene.speaker} />
      <button className="secondary" onClick={() => submitEarlyGrowth(gameStore, stage)}>{scene.action}</button>
    </> : <>
      <h3>这一页已记下，继续走自己的路。</h3>
      <p role="status">成长过渡 · 已翻阅</p>
      <p>{state.completed.includes(3) ? '第3章考核已有首通记录。回到舆图后，继续原来的篇章与尚待完成的历练。'
        : '接下来可在大陆舆图进入第3章，按游戏目标完成坊市供货、控气测试与武技考核。此次过渡不会代替考核结算。'}</p>
      {onContinue && <button className="primary" onClick={onContinue}>{state.completed.includes(3) ? '返回大陆舆图 · 继续原旅程' : '在舆图查看第3章考核'}</button>}
    </>}
  </section>
}
