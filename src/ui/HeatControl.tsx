import { PrimaryButton, SecondaryButton } from './Buttons'
import { useEffect, useRef, useState } from 'react'
import { startHeatMotion, type HeatMotionControl } from './heat-motion'

export default function HeatControl({
  reducedMotion, target = .5, targetWidth = 20, markerLabel, inputLabel, lockLabel,
  speed = 1, alchemyPeriod, targetColor, onLock,
}: {
  reducedMotion: boolean; target?: number; targetWidth?: number
  markerLabel: string; inputLabel: string; lockLabel: string
  speed?: number; alchemyPeriod?: number; targetColor?: string; onLock: (marker: number) => unknown
}) {
  const [marker, setMarker] = useState(alchemyPeriod ? .5 : 0)
  const [paused, setPaused] = useState(false)
  const motion = useRef<HeatMotionControl | null>(null)
  useEffect(() => {
    setMarker(alchemyPeriod ? .5 : 0)
    setPaused(false)
    if (reducedMotion) return
    const control = startHeatMotion(setMarker, { speed, alchemyPeriod, onPause: () => setPaused(true) })
    motion.current = control
    return () => { motion.current = null; control.stop() }
  }, [reducedMotion, speed, alchemyPeriod])
  return <>
    {reducedMotion && <label className="setting-row"><span>{inputLabel}<small>减弱动态开启：用方向键调整，目标{Math.round(target * 100)}%，再锁定。</small></span>
      <input aria-label={inputLabel} aria-valuetext={`${Math.round(marker * 100)}%，目标${Math.round(target * 100)}%`}
        type="range" min="0" max="1" step=".01" value={marker} onChange={event => setMarker(Number(event.target.value))} />
    </label>}
    <div className="heat-meter" data-marker={marker.toFixed(3)} aria-label={markerLabel}>
      <div className="heat-target" style={{ left: `${target * 100 - targetWidth / 2}%`, width: `${targetWidth}%`, background: targetColor }} />
      <i style={{ left: `${marker * 100}%` }} />
    </div>
    {!reducedMotion && (paused
      ? <><p role="status">时机已暂停。返回前台后，请明确继续；暂停期间不能锁定。</p>
        <SecondaryButton onClick={() => { if (motion.current?.resume()) setPaused(false) }}>继续时机</SecondaryButton></>
      : <SecondaryButton onClick={() => motion.current?.pause()}>暂停时机</SecondaryButton>)}
    <PrimaryButton disabled={!reducedMotion && paused} onClick={() => {
      if (!reducedMotion && (paused || motion.current?.isPaused())) return
      onLock(marker)
    }}>{lockLabel}</PrimaryButton>
  </>
}
