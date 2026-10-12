import { StatusParagraph } from './NativeRegions'
import { useState } from 'react'
import { gameStore } from '../core/store'
import type { Runtime } from '../core/model'
import './route-controls.css'

export default function RouteControls({ navigation, disabled }: { navigation?: Runtime['navigation']; disabled: boolean }) {
  const [selected, setSelected] = useState('camp')
  const places = navigation?.places ?? []
  const destination = places.some(p => p.id === selected) ? selected : places[0]?.id ?? ''
  return <section className="route-controls" aria-label="沿路行走">
    <div className="route-actions">
      <label htmlFor="walk-destination">前往地点</label>
      <select id="walk-destination" value={destination} disabled={disabled || !places.length} onChange={e => setSelected(e.target.value)}>
        {places.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <button disabled={disabled || !destination} onClick={() => gameStore.travel(destination)}>沿路行走</button>
      <button disabled={disabled || !navigation?.active} onClick={() => gameStore.stopTravel()}>停止行走</button>
    </div>
    <StatusParagraph>{navigation?.message ?? '正在读取当前地图地点…'}</StatusParagraph>
    <small>沿路行走时战斗继续；受击、方向输入、战斗动作或打开菜单会停止。到达后手动交互。</small>
  </section>
}
