import { BondSummary } from './NativeRegions'
import { PrimaryButton, SecondaryButton } from './Buttons'
import { useEffect, useState } from 'react'
import type { GameState } from '../core/model'
import { gameStore } from '../core/store'
import { pulseMarker } from '../core/events'
import { earlyTrainingBlock, type EarlyTrainingAction } from '../core/early-training'
import EarlyGrowth from './EarlyGrowth'

export default function EarlyPractice({ state, onAction, onContinue }: { state: GameState; onAction?: (action: Extract<EarlyTrainingAction, { type: 'practice' }>) => unknown; onContinue?: () => void }) {
  const [marker, setMarker] = useState(.5)
  const task = state.earlyTraining, practice = task.practice
  const steady = state.settings.reducedMotion
  useEffect(() => {
    if (practice.phase !== 1 || steady || earlyTrainingBlock(state)) return
    let elapsed = 0, previous = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      if (!document.hidden) { elapsed += now - previous; setMarker(pulseMarker(elapsed * .8)) }
      previous = now
    }, 30)
    return () => window.clearInterval(timer)
  }, [practice.phase, steady, state.settings.spoiler, state.settings.animeLimit])
  const act = (operation: 'begin' | 'pulse' | 'attempt' | 'finish') => {
    const action: Extract<EarlyTrainingAction, { type: 'practice' }> = {
      type: 'practice', operation, phase: practice.phase, pulse: practice.pulse,
      attempts: practice.attempts, marker: operation === 'pulse' ? marker : undefined, expectedSpent: task.purse.spent,
    }
    return onAction ? onAction(action) : gameStore.earlyTraining(action)
  }
  if (!task.liquid.ready || earlyTrainingBlock(state)) return null
  return <BondSummary aria-label="初期重修与斗技尝试">
    <span className="eyebrow">后山与静室 / 初期练习</span>
    {practice.phase === 0 && <>
      <h3>先调息，再尝试</h3>
      <p>药液准备好后，萧炎继续修炼。把呼吸和斗气稳住，再试试黑铁片中的斗技。</p>
      <SecondaryButton onClick={() => act('begin')}>开始初期调息练习</SecondaryButton>
    </>}
    {practice.phase === 1 && <>
      <h3>三次调息</h3><p>第{practice.pulse + 1}次 · 本轮{practice.score}/300 · 重试{practice.attempts}次</p>
      <p>指针靠近中央时锁定，三次合计180分通过。失误可免费重来，药液与主线资源保留。</p>
      {steady ? <label className="setting-row"><span>调息位置<small>减弱动态开启：用方向键调整位置，再锁定。</small></span>
        <input aria-label="调息位置" type="range" min="0" max="1" step=".05" value={marker} onChange={event => setMarker(Number(event.target.value))} />
      </label> : <div className="heat-meter" data-marker={marker.toFixed(3)} aria-label="调息指针"><div className="heat-target" /><i style={{ left: `${marker * 100}%` }} /></div>}
      <PrimaryButton onClick={() => act('pulse')}>锁定第{practice.pulse + 1}次调息</PrimaryButton>
    </>}
    {practice.phase === 2 && <>
      <h3>尝试黑铁片中的斗技</h3>
      <p>调息稳住了，萧炎抬手试着牵动前方物体。初期斗气有限，这一试不能让他立刻掌握强力招式。</p>
      <SecondaryButton onClick={() => act('attempt')}>尝试牵动物体</SecondaryButton>
    </>}
    {practice.phase === 3 && <>
      <h3>眼前的力量还有限</h3>
      <p>物体没有按萧炎所想飞来。药老提醒他先打好基础。往后的成长，需要持续修炼，而不是拿到铁片就立即变强。</p>
      <SecondaryButton onClick={() => act('finish')}>记下结果，继续修炼</SecondaryButton>
    </>}
    {practice.phase === 4 && <>
      <h3>重修往事 · 本次已归档</h3>
      <p>准备、借资、采购、坊市交涉、老师调制、加水与初期斗技尝试已经记录。采购余额和黑铁片保留，主线仍从原来的篇章继续。</p>
    </>}
    <p className="muted">三次调息、评分与重试是原创练习，不代表原著修炼时长或境界提升；没有新增战斗技能或章节奖励。</p>
    {practice.phase === 4 && <EarlyGrowth state={state} onContinue={onContinue} />}
  </BondSummary>
}
