import { describe, expect, it } from 'vitest'
import { chapters } from '../src/content/chapters'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, craft, finishChapter, skillUnlocked, registerBossVictory } from '../src/core/rules'
import { CombatWorld, HEIGHT, WIDTH, type Vec } from '../src/game/combat'
import { mapCollides, type MapDefinition } from '../src/content/maps'
import { certificationTargets, findEvent, tournamentRound, tournamentRounds } from '../src/content/events'
import { advanceEvent, eventProgress, nextEvent, pulseMarker } from '../src/core/events'
import { validateState } from '../src/core/save'

// A test-only player: it uses the same movement, combat, collection and crafting rules.
// It never changes enemy HP, player position or task counters outside normal callbacks.
function route(from: Vec, to: Vec, map: MapDefinition): Vec[] {
  const cell = 32, columns = Math.floor(WIDTH / cell), rows = Math.floor(HEIGHT / cell)
  const key = (x: number, y: number) => y * columns + x
  const pos = (n: number) => ({ x: (n % columns) * cell + cell / 2, y: Math.floor(n / columns) * cell + cell / 2 })
  const index = (p: Vec) => key(Math.min(columns - 2, Math.max(1, Math.floor(p.x / cell))), Math.min(rows - 2, Math.max(1, Math.floor(p.y / cell))))
  const start = index(from), end = index(to), parents = new Map<number, number>([[start, -1]]), queue = [start]
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    if (current === end) break
    const x = current % columns, y = Math.floor(current / columns)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = key(nx, ny)
      if (nx < 1 || ny < 1 || nx >= columns - 1 || ny >= rows - 1 || parents.has(n) || mapCollides(map, pos(n), 22)) continue
      parents.set(n, current); queue.push(n)
    }
  }
  if (!parents.has(end)) return [to]
  const result: Vec[] = [to]
  let current = end
  while (current !== start && current !== -1) { result.unshift(pos(current)); current = parents.get(current)! }
  return result
}
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)

describe('完整主线真实规则战斗回放', () => {
  it('通过移动、采集、炼制与战斗，依次打通28章', () => {
    let state = initialState()
    state.settings.difficulty = 'story'
    const timings: number[] = []
    for (const chapter of chapters) {
      state.chapter = chapter.id; state.progress[chapter.id] = blankProgress(chapter.id)
      const world = new CombatWorld(chapter, {
        state: () => state,
        collect: () => { state.progress[chapter.id].herbs++; state.inventory.herb++ },
        kill: boss => {
          if (boss) state = registerBossVictory(state)
          else { state.progress[chapter.id].kills++; state.inventory.crystal++; state.totalKills++; state.gold += 8 + chapter.id * 2; state.xp += 10 }
        },
        heal: () => { if (!state.inventory.heal) return false; state.inventory.heal--; return true },
        mana: () => { if (!state.inventory.mana) return false; state.inventory.mana--; return true },
        camp: () => {}, notify: () => {},
        eventAction: action => { state = advanceEvent(state, action).state },
        storyEvent: (eventId, checkpoint) => {
          const p = eventProgress(state, chapter.id, eventId), e = findEvent(chapter.id, eventId)!
          if (!p.started) state = advanceEvent(state, { type: 'begin', eventId }).state
          else if (e.kind === 'trade') state = advanceEvent(state, p.stage === 0 ? { type: 'quote', amount: 60, eventId } : { type: 'deliver', eventId }).state
          else if (e.kind === 'stone') {
            const marker = pulseMarker(world.elapsed * 1000)
            if (p.stage === 0) state = advanceEvent(state, { type: 'test', eventId }).state
            else if (marker >= .4 && marker <= .6) state = advanceEvent(state, { type: 'pulse', marker, stage: p.stage, eventId }).state
          } else if (e.kind === 'competition') state = advanceEvent(state, p.stage === 0 ? { type: 'strategy', choice: 'steady', eventId } : { type: 'deliver', eventId }).state
          else if (e.kind === 'cave') {
            if (checkpoint === 1 && p.stage === 1) state = advanceEvent(state, { type: 'rune', symbol: (['leaf', 'moon', 'fire'] as const)[p.score], step: p.score, eventId }).state
            else if (checkpoint === undefined && p.stage === 3) state = advanceEvent(state, { type: 'deliver', eventId }).state
          } else if (e.kind === 'certification') {
            const marker = pulseMarker(world.elapsed * 1000)
            if (checkpoint === 1 && p.stage === 1) state = advanceEvent(state, { type: 'test', eventId }).state
            else if (checkpoint === 1 && p.stage >= 2 && p.stage <= 4 && Math.abs(marker - certificationTargets[p.stage - 2]) < .08) state = advanceEvent(state, { type: 'pulse', marker, stage: p.stage, eventId }).state
            else if (checkpoint === undefined && p.stage === 5) state = advanceEvent(state, { type: 'deliver', eventId }).state
          } else if (e.kind === 'rescue' && p.stage === 3) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'squad' && p.stage === 3) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'hunt' && p.stage === 3 && world.runtime().huntTeam?.arrived) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'tower' && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'flame') {
            if (checkpoint === 1 && p.stage === 1) state = advanceEvent(state, { type: 'test', eventId }).state
            else if (checkpoint === undefined && p.stage === 5) state = advanceEvent(state, { type: 'deliver', eventId }).state
          } else if (e.kind === 'tournament') {
            const round = tournamentRound(p.stage), marker = pulseMarker(world.elapsed * 1000 * tournamentRounds[round].speed)
            if (checkpoint === round + 1 && [1, 5, 9].includes(p.stage)) state = advanceEvent(state, { type: 'test', eventId }).state
            else if (checkpoint === round + 1 && p.stage >= 2 && p.stage <= 12 && ![5, 9].includes(p.stage) &&
              Math.abs(marker - tournamentRounds[round].targets[(p.stage - 2) % 4]) < .07) state = advanceEvent(state, { type: 'pulse', marker, stage: p.stage, eventId }).state
            else if (checkpoint === undefined && p.stage === 13) state = advanceEvent(state, { type: 'deliver', eventId }).state
          } else if (e.kind === 'auction') {
            if (checkpoint === 1 && [1, 3].includes(p.stage)) state = advanceEvent(state, state.gold >= (p.stage === 1 ? 40 : 80)
              ? { type: 'bid', amount: p.stage === 1 ? 40 : 80, eventId } : { type: 'observe', eventId }).state
            else if (checkpoint === 1 && p.stage === 2) state = advanceEvent(state, { type: 'resolve-bid', eventId }).state
            else if (checkpoint === undefined && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          }
        },
      })
      let path: Vec[] = [], previousTarget: Vec = { x: -999, y: -999 }, frame = 0
      for (; frame < 60 * 240 && !state.progress[chapter.id].boss && world.player.hp > 0; frame++) {
        const p = state.progress[chapter.id]
        if (p.brews < chapter.objectives.brews && state.inventory.herb >= 2 && state.inventory.crystal >= 1) {
          const result = craft(state, 'heal', .5); if (result.ok) state = result.state
        }
        const needsHerb = p.herbs < chapter.objectives.herbs || (p.brews < chapter.objectives.brews && state.inventory.herb < 2)
        const event = nextEvent(state, true), activeEvent = !!event, ep = eventProgress(state, chapter.id, event?.id)
        const supplying = event && ((event.kind === 'trade' && ep.stage === 1) || (event.kind === 'competition' && ep.stage === 4))
        const needsTradeHerb = supplying && state.inventory.herb < 2
        const living = world.enemies.filter(e => e.hp > 0).sort((a, b) => dist(a, world.player) - dist(b, world.player))
        let target: Vec = world.map.gate
        if (needsHerb || needsTradeHerb) target = world.herbs.filter(h => h.available).sort((a, b) => dist(a, world.player) - dist(b, world.player))[0] ?? world.map.gate
        else if (living.length) target = living[0]
        if (event && !needsTradeHerb && !(supplying && state.inventory.crystal < 1)) {
          target = !ep.started || ['trade', 'stone', 'competition'].includes(event.kind) || (['cave', 'rescue', 'squad', 'hunt'].includes(event.kind) && ep.stage === 3) || (['certification', 'flame'].includes(event.kind) && ep.stage === 5) ? event.npc
            : event.kind === 'training' ? event.dummy! : event.kind === 'survival' ? event.checkpoints![ep.stage === 2 ? 1 : 0] : ['certification', 'flame'].includes(event.kind) ? event.checkpoints![ep.stage === 0 ? 0 : 1] : event.checkpoints![ep.stage]
          if (event.kind === 'escort' && world.escort && dist(world.player, world.escort) > 140) target = world.escort
          if (event.kind === 'flame' && ep.stage >= 2 && ep.stage <= 4) target = [...world.map.heatZone!.cooling].sort((a, b) => dist(a, world.player) - dist(b, world.player))[0]
          if (event.kind === 'tournament') target = !ep.started || ep.stage === 13 ? event.npc : event.checkpoints![ep.stage === 0 ? 0 : tournamentRound(ep.stage) + 1]
          if (event.kind === 'auction') target = !ep.started || ep.stage === 4 ? event.npc : event.checkpoints![ep.stage === 0 ? 0 : 1]
          if (event.kind === 'squad' && world.squad) {
            if (!world.squad.holding && dist(world.player, world.squad) > 140) target = world.squad
            if (world.squad.holding && living.length) target = living[0]
          }
          if (event.kind === 'hunt' && world.huntTeam) {
            if (dist(world.player, world.huntTeam) > 140) target = world.huntTeam
            const guards = event.checkpoints?.[ep.stage]?.guards
            const threat = living.find(enemy => enemy.spawnId && guards?.includes(enemy.spawnId))
            if (threat) target = threat
          }
          if (event.kind === 'tower') {
            if (ep.stage === 4) target = event.npc
            else if (world.towerRun) {
              const floor = world.map.towerFloors![world.towerRun.phase - 1]
              target = world.towerRun.heat > 55 || (world.towerCooling() && world.towerRun.heat > 10) ? floor.cooling : floor.center
            }
          }
        }
        const warning = [...(world.survival?.warnings ?? []), ...(world.flameRun?.warnings ?? []), ...(world.escapeRun?.warnings ?? []), ...(world.towerRun?.warnings ?? [])].find(w => dist(w, world.player) < w.radius + 25)
        const threat = living.find(e => e.windup > 0 && [e.target, ...(e.secondary ?? [])].some(t => dist(t, world.player) < e.radius + 25))
        let input = { x: 0, y: 0 }
        if (warning) {
          const direction = world.player.x < 850 ? 1 : -1
          input = world.towerRun || world.flameRun?.phase === 3 ? { x: 0, y: world.player.y < warning.y ? -1 : 1 } : { x: direction, y: 0 }
          world.action('dodge', input); path = []
        } else if (threat) {
          const point = [threat.target, ...(threat.secondary ?? [])].sort((a, b) => dist(a, world.player) - dist(b, world.player))[0]
          const dx = world.player.x - point.x, dy = world.player.y - point.y, length = Math.hypot(dx, dy)
          input = length > 1 ? { x: dx / length, y: dy / length } : { x: 0, y: 1 }
          world.action('dodge', input)
          path = []
        } else {
          if (frame % 20 === 0 || !path.length || dist(target, previousTarget) > 45) {
            path = route(world.player, target, world.collisionMap()); previousTarget = { ...target }
          }
          while (path.length > 1 && dist(path[0], world.player) < 14) path.shift()
          const waypoint = path[0] ?? target
          const dx = waypoint.x - world.player.x, dy = waypoint.y - world.player.y, length = Math.hypot(dx, dy)
          if (length > 4 && (needsHerb || needsTradeHerb || activeEvent || !living.length || dist(target, world.player) > 70)) input = { x: dx / length, y: dy / length }
        }
        if (frame % 10 === 0) {
          world.action('attack', input)
          if (living[0] && dist(living[0], world.player) < 145) world.action('strike', input)
          if (skillUnlocked(state, 'wave') && living[0] && dist(living[0], world.player) < 320) world.action('wave', input)
          if (skillUnlocked(state, 'lotus') && living[0] && dist(living[0], world.player) < 300) world.action('lotus', input)
          if (world.player.hp < world.runtime().maxHp * .5) world.action('heal', input)
          if (world.player.qi < 20) world.action('mana', input)
          world.action('support', input)
          if (event?.kind === 'training' && ep.started && dist(world.player, event.dummy!) < 145) {
            if (ep.stage === 0) world.action('strike', { ...input, aim: event.dummy })
            else world.action('dodge', input)
          }
          if (needsHerb || needsTradeHerb || activeEvent || (chapterReady(state) && !living.length)) world.action('interact', input)
        }
        world.step(input)
        if (frame % 10 === 0) expect(() => validateState(state), `第${chapter.id}章第${frame}帧必须可存档`).not.toThrow()
      }
      expect(state.progress[chapter.id].boss, `第${chapter.id}章未打通：hp=${world.player.hp}, kills=${state.progress[chapter.id].kills}, herbs=${state.progress[chapter.id].herbs}, position=${world.player.x},${world.player.y}`).toBe(true)
      state = finishChapter(state)
      expect(validateState(state)).toEqual(state)
      expect(state.completed.length).toBe(chapter.id)
      timings.push(Math.round(frame / 60))
    }
    expect(state.completed.length).toBe(28)
    console.log(`28章纯逻辑输入回放（剧情难度，非人工通关）：${timings.join(', ')} 秒`)
  }, 30_000)
})
