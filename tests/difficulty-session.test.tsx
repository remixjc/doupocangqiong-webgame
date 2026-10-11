import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { chapterById } from '../src/content/chapters'
import { initialState } from '../src/core/model'
import { CombatWorld } from '../src/game/combat'
import { serializeSave, parseSave } from '../src/core/save'
import { SettingsPanel } from '../src/ui/Panels'

function setup(difficulty: 'story' | 'normal' | 'hard') {
  const state = initialState(); state.settings.difficulty = difficulty
  const callbacks = { state: () => state, collect: () => {}, kill: () => {}, heal: () => false, camp: () => {}, notify: () => {} }
  return { state, callbacks, world: new CombatWorld(chapterById(1), callbacks) }
}
function firstHit(world: CombatWorld) {
  world.player.x = world.enemies[0].x; world.player.y = world.enemies[0].y
  const hp = world.player.hp
  for (let frame = 0; frame < 60 * 10 && world.player.hp === hp; frame++) world.step({ x: 0, y: 0 })
  expect(world.player.hp).toBeLessThan(hp)
  return hp - world.player.hp
}
function qualify(t: ReturnType<typeof setup>) {
  Object.assign(t.state.progress[1], { herbs: 3, kills: 3 })
  Object.assign(t.state.progress[1].events['yao-training'], { started: true, stage: 2 })
}
function spawnBoss(world: CombatWorld) {
  world.player.x = world.map.gate.x; world.player.y = world.map.gate.y
  world.action('interact', { x: 0, y: 0 })
  const boss = world.enemies.find(e => e.type === 'boss')
  expect(boss).toBeDefined()
  return boss!.maxHp
}
describe('C11c-2 一次历练的难度一致性', () => {
  it.each([['story', 'hard'], ['hard', 'story'], ['normal', 'hard']] as const)('%s中途选择%s：当前敌人/新首领/伤害保持，重建后一起切换', (from, to) => {
    const old = setup(from), baseline = setup(from), nextBaseline = setup(to)
    const initialHp = old.world.enemies[0].maxHp
    old.state.settings.difficulty = to
    expect(old.world.runtime().difficulty).toBe(from)
    expect(old.world.enemies[0].maxHp).toBe(initialHp)
    expect(firstHit(old.world)).toBe(firstHit(baseline.world))
    qualify(old); qualify(baseline); qualify(nextBaseline)
    expect(spawnBoss(old.world)).toBe(spawnBoss(baseline.world))
    const newWorld = new CombatWorld(chapterById(1), old.callbacks)
    expect(newWorld.runtime().difficulty).toBe(to)
    expect(newWorld.enemies[0].maxHp).toBe(nextBaseline.world.enemies[0].maxHp)
    expect(spawnBoss(newWorld)).toBe(spawnBoss(nextBaseline.world))
    const restored = parseSave(serializeSave(old.state))
    expect(restored.settings.difficulty).toBe(to)
    expect(serializeSave(old.state)).not.toContain('"runtime"')
    const freshDamage = setup(to)
    expect(firstHit(new CombatWorld(chapterById(1), old.callbacks))).toBe(firstHit(freshDamage.world))
  })
  it('设置同时说明当前历练难度和下一次生效，首页只说明生效时机', () => {
    const { state } = setup('hard')
    const active = renderToStaticMarkup(<SettingsPanel state={state} activeDifficulty="story" />)
    expect(active).toContain('本次历练：剧情。')
    expect(active).toContain('重新进入篇章或营地休整后生效')
    expect(active).toContain('value="hard" selected=""')
    const home = renderToStaticMarkup(<SettingsPanel state={state} />)
    expect(home).not.toContain('本次历练：')
    expect(home).toContain('难度选择会保存')
  })
})
