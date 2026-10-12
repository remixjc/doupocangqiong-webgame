import { WalkControls } from './NativeRegions'
import { EarlyMap } from './MapPrimitives'
import WalkDirectionButtons from './WalkDirectionButtons'
import { MapBackground, MapText } from './MapPrimitives'
import { earlyWalkDirections as directions } from '../core/early-walk-keys'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { EarlyWalkDirection, EarlyWalkPosition } from '../core/early-walk'
import { familyVisitPlaces, familyVisitWalls } from '../core/early-family-visit'
import './early-walk.css'

export default function FamilyHallMap({ label, helpId, prefix, position, place, box, near, onMove, onInteract,
  extraPlaces = {}, observer = false, focusPlace, paper = 'none', departed = false, boxLabel = '仍在来客席的玉匣' }: {
  label: string; helpId: string; prefix: string; position: EarlyWalkPosition; place?: string; box: boolean; near: boolean
  onMove: (direction: EarlyWalkDirection) => void; onInteract: () => void
  extraPlaces?: Record<string, EarlyWalkPosition & { label: string }>; observer?: boolean; focusPlace?: string
  paper?: 'none' | 'preparing' | 'written' | 'marked' | 'table' | 'nalan'; boxLabel?: string
  departed?: boolean
}) {
  const field = useRef<SVGSVGElement>(null)
  useEffect(() => { field.current?.focus() }, [])
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (document.hidden || event.altKey || event.ctrlKey || event.metaKey) return
    const value = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (!observer && directions[value]) { event.preventDefault(); onMove(directions[value]) }
    else if (value === 'e' && near) { event.preventDefault(); onInteract() }
  }
  return <>
    <EarlyMap ref={field} aria-label={label} aria-describedby={helpId} viewBox="0 0 720 420" onKeyDown={key}>
      <MapBackground fill="#22352f" />
      <rect x="35" y="255" width="180" height="140" rx="8" fill="#3d4839" />
      <rect x="255" y="30" width="425" height="315" rx="8" fill="#4b4335" />
      <path d="M100 330 H210 V270 H270 H400 V100 H550 M350 170 V310 H610 V270" fill="none" stroke="#9c8960" strokeWidth="18" opacity=".3" />
      {familyVisitWalls.map((wall, index) => <rect key={index} {...wall} rx="3" fill="#17251f" />)}
      <MapText x="125" y="285" fill="#dfc9a0">清晨 · 拜师之前</MapText>
      <MapText x="465" y="58" fill="#dfc9a0" fontSize="15">萧家接待厅</MapText>
      <MapText x="480" y="230" fill="#c8ac7b" fontSize="11">厅中陈设</MapText>
      {Object.entries({ ...familyVisitPlaces, ...extraPlaces }).map(([id, target]) => <g key={id}>
        <circle cx={target.x} cy={target.y} r="24" fill="none" stroke={place === id ? '#f7d699' : '#b09b71'} strokeDasharray="4 5" />
        {observer && focusPlace === id && <circle cx={target.x} cy={target.y} r="29" fill="none" stroke="#a6e1d3" strokeWidth="3" aria-label="旁观焦点" />}
        <MapText x={target.x} y={target.y + 37} fill="#edcea0" fontSize="11">{target.label}</MapText>
      </g>)}
      {box && <g aria-label={boxLabel}><rect x="580" y="242" width="28" height="16" rx="3" fill="#9da778" /><circle cx="595" cy="248" r="4" fill="#d5cf91" /></g>}
      {paper !== 'none' && <g aria-label={paper === 'nalan' ? '纳兰持有的同一文书' : paper === 'table' ? '已置桌的同一文书' : paper === 'marked' ? '萧炎携带的同一文书' : paper === 'preparing' ? '备好的纸张，尚无成文' : '文书桌上的同一文书'}
        transform={`translate(${paper === 'nalan' ? departed ? '145 245' : '630 240' : paper === 'table' ? '565 272' : paper === 'marked' ? `${position.x + 15} ${position.y - 20}` : '400 80'})`}>
        <rect width="19" height="25" fill="#e5d4b0" />{paper !== 'preparing' && <path d="M4 6 H15 M4 11 H15 M4 16 H12" stroke="#766444" />}
        {(paper === 'marked' || paper === 'table' || paper === 'nalan') && <circle cx="14" cy="20" r="3" fill="#9a684e" />}
      </g>}
      {!observer && <g aria-label="萧炎行走位置" transform={`translate(${position.x} ${position.y})`}>
        <ellipse cy="17" rx="14" ry="5" fill="#0005" /><path d="M-12 13 L-7-5 H7 L12 13Z" fill="#d3a567" /><circle cy="-13" r="8" fill="#edc79f" />
      </g>}
      {observer && <MapText x="465" y="390" fill="#a6e1d3" fontSize="13">{departed ? '旁观厅外 · 双方已离厅，纳兰携原文书' : '旁观厅内 · 萧炎已离厅'}</MapText>}
    </EarlyMap>
    {!observer && <WalkControls aria-label={`${prefix}行走操作`}><WalkDirectionButtons prefix={prefix} onMove={onMove} /></WalkControls>}
  </>
}
