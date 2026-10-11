import { describe, expect, it } from 'vitest'
import { chapters } from '../src/content/chapters'
import { blankProgress, initialState } from '../src/core/model'
import { chapterReady, craft, finishChapter, skillUnlocked, registerBossVictory } from '../src/core/rules'
import { CombatWorld, HEIGHT, WIDTH, type Vec } from '../src/game/combat'
import { mapCollides, type MapDefinition } from '../src/content/maps'
import { certificationTargets, danFinalTargets, mindTargets, findEvent, tournamentRound, tournamentRounds } from '../src/content/events'
import { advanceEvent, eventDone, eventProgress, nextEvent, pulseMarker } from '../src/core/events'
import { validateState } from '../src/core/save'
import { bondEvents } from '../src/content/bonds'
import { preparationEvents, preparationProtocols } from '../src/content/preparations'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { replayEarlyTraining } from './helpers/early-training-replay'

// A test-only player: it uses the same movement, combat, collection and crafting rules.
// It never changes enemy HP, player position or task counters outside normal callbacks.
function route(from: Vec, to: Vec, map: MapDefinition): Vec[] {
  const cell = 32, columns = Math.floor(WIDTH / cell), rows = Math.floor(HEIGHT / cell)
  const key = (x: number, y: number) => y * columns + x
  const pos = (n: number) => ({ x: (n % columns) * cell + cell / 2, y: Math.floor(n / columns) * cell + cell / 2 })
  const index = (p: Vec) => key(Math.min(columns - 2, Math.max(1, Math.floor(p.x / cell))), Math.min(rows - 2, Math.max(1, Math.floor(p.y / cell))))
  const start = index(from)
  let end = index(to)
  // An interaction point may be clear while its coarse grid cell overlaps a nearby wall.
  // Approach through the nearest clear cell, then use normal movement/E within range.
  if (mapCollides(map, pos(end), 22)) {
    const candidates = Array.from({ length: columns * rows }, (_, n) => n).filter(n => {
      const p = pos(n)
      return p.x >= 40 && p.x <= WIDTH - 40 && p.y >= 50 && p.y <= HEIGHT - 40 &&
        Math.hypot(p.x - to.x, p.y - to.y) < 64 && !mapCollides(map, p, 22)
    }).sort((a, b) => Math.hypot(pos(a).x - to.x, pos(a).y - to.y) - Math.hypot(pos(b).x - to.x, pos(b).y - to.y))
    end = candidates[0] ?? end
  }
  const parents = new Map<number, number>([[start, -1]]), queue = [start]
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
  it.each(['story', 'normal', 'hard'] as const)('%s：通过移动、采集、炼制与战斗，依次打通28章', difficulty => {
    let state = initialState()
    state.settings.difficulty = difficulty
    const timings: number[] = []
    const resources: { chapter: number; hp: number; gold: number; heal: number; mana: number }[] = []
    let healsUsed = 0, manaUsed = 0
    for (const chapter of chapters) {
      state.chapter = chapter.id; state.progress[chapter.id] = blankProgress(chapter.id)
      const world = new CombatWorld(chapter, {
        state: () => state,
        collect: () => { state.progress[chapter.id].herbs++; state.inventory.herb++ },
        kill: boss => {
          if (boss) state = registerBossVictory(state)
          else { state.progress[chapter.id].kills++; state.inventory.crystal++; state.totalKills++; state.gold += 8 + chapter.id * 2; state.xp += 10 }
        },
        heal: () => { if (!state.inventory.heal) return false; state.inventory.heal--; healsUsed++; return true },
        mana: () => { if (!state.inventory.mana) return false; state.inventory.mana--; manaUsed++; return true },
        camp: () => {}, notify: () => {},
        eventAction: action => { state = advanceEvent(state, action).state },
        storyEvent: (eventId, checkpoint) => {
          const p = eventProgress(state, chapter.id, eventId), e = findEvent(chapter.id, eventId)!
          if (!p.started) state = advanceEvent(state, { type: 'begin', eventId }).state
          else if (e.kind === 'preparation') {
            if (checkpoint === 4 && p.stage === 2) state = advanceEvent(state, { type: 'strategy', choice: 'steady', eventId }).state
            else if (checkpoint === 4 && p.stage >= 3 && p.stage <= 5)
              state = advanceEvent(state, { type: 'contain', operation: preparationProtocols.steady[p.stage - 3], stage: p.stage, attempts: p.attempts, eventId }).state
            else if (checkpoint === undefined && p.stage === 6) state = advanceEvent(state, { type: 'deliver', eventId }).state
          }
          else if (e.kind === 'bond') {
            if (checkpoint === 1 && p.stage === 1) state = advanceEvent(state, { type: 'strategy', choice: 'steady', eventId }).state
            else if (checkpoint === undefined && p.stage === 2) state = advanceEvent(state, { type: 'deliver', eventId }).state
          }
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
          else if (e.kind === 'siege' && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'alliance' && p.stage === 1) state = advanceEvent(state, { type: 'strategy', choice: 'steady', eventId }).state
          else if (e.kind === 'alliance' && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'lineage' && p.stage === 2 && checkpoint === 3) state = advanceEvent(state, { type: 'lead', destination: 'danta', eventId }).state
          else if (e.kind === 'lineage' && p.stage === 3) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'expedition' && p.stage === 1 && world.runtime().expedition?.failed) state = advanceEvent(state, { type: 'restart', eventId }).state
          else if (e.kind === 'expedition' && p.stage === 2) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'prison' && p.stage === 4 && world.runtime().prisonEscort?.arrived) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'tomb' && p.stage >= 1 && p.stage <= 3 && world.runtime().tomb?.failed) state = advanceEvent(state, { type: 'restart', eventId }).state
          else if (e.kind === 'tomb' && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'illusion') {
            if (checkpoint === p.stage && p.stage >= 1 && p.stage <= 3) state = advanceEvent(state, { type: 'reflect', choice: e.reflections![p.stage - 1].answer, stage: p.stage, eventId }).state
            else if (checkpoint === undefined && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          }
          else if (e.kind === 'purification' && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'defense' && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          else if (e.kind === 'vault') {
            if (checkpoint === 4 && p.stage === 4) state = advanceEvent(state, { type: 'inscribe', symbol: (['lotus', 'fallen', 'star'] as const)[p.score], step: p.score, eventId }).state
            else if (checkpoint === undefined && p.stage === 6) state = advanceEvent(state, { type: 'deliver', eventId }).state
          }
          else if (e.kind === 'inheritance') {
            const marker = pulseMarker(world.elapsed * 1000)
            if (checkpoint === 0 && p.stage === 0) state = advanceEvent(state, { type: 'test', eventId }).state
            else if (checkpoint === 0 && p.stage >= 1 && p.stage <= 3 && Math.abs(marker - mindTargets(e)[p.stage - 1]) < .08)
              state = advanceEvent(state, { type: 'pulse', marker, stage: p.stage, eventId }).state
            else if (checkpoint === undefined && p.stage === 4) state = advanceEvent(state, { type: 'deliver', eventId }).state
          }
          else if (e.kind === 'danfinal') {
            const marker = pulseMarker(world.elapsed * 1000)
            if (checkpoint === 0 && p.stage === 0) state = advanceEvent(state, { type: 'test', eventId }).state
            else if (checkpoint === 0 && p.stage >= 1 && p.stage <= 3 && Math.abs(marker - danFinalTargets[p.stage - 1]) < .08)
              state = advanceEvent(state, { type: 'pulse', marker, stage: p.stage, eventId }).state
            else if (checkpoint === undefined && p.stage === 6) state = advanceEvent(state, { type: 'deliver', eventId }).state
          }
          else if (['flame', 'starfire'].includes(e.kind)) {
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
      const visitedMaps = new Set([world.map.id])
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
          if (event.kind === 'siege') {
            target = !ep.started || ep.stage === 4 ? event.npc : event.checkpoints![ep.stage]
            const guards = event.checkpoints?.[ep.stage]?.guards
            const threat = ep.started && living.find(enemy => enemy.spawnId && guards?.includes(enemy.spawnId))
            if (threat) target = threat
          }
          if (event.kind === 'alliance') {
            target = !ep.started || [1, 4].includes(ep.stage) ? event.npc : event.checkpoints![ep.stage === 0 ? 0 : ep.stage - 1]
            const guards = event.checkpoints?.[ep.stage - 1]?.guards
            const threat = ep.choice === 'steady' && living.find(enemy => enemy.spawnId && guards?.includes(enemy.spawnId))
            if (threat) target = threat
          }
          if (event.kind === 'lineage') {
            const index = ep.stage === 0 ? 0 : ep.stage === 1 ? ep.score & 1 ? 2 : 1 : 3
            target = !ep.started || ep.stage === 3 ? event.npc : event.checkpoints![index]
            const guards = event.checkpoints?.[index]?.guards
            const threat = ep.stage === 1 && living.find(enemy => enemy.spawnId && guards?.includes(enemy.spawnId))
            if (threat) target = threat
          }
          if (event.kind === 'expedition') {
            const index = ep.stage === 0 ? 0 : [1, 2, 3].find(i => !(ep.score & (1 << (i - 1)))) ?? 0
            target = !ep.started || ep.stage === 2 || world.runtime().expedition?.failed ? event.npc : event.checkpoints![index]
            const guards = event.checkpoints?.[index]?.guards
            const threat = ep.stage === 1 && !world.runtime().expedition?.failed && living.find(enemy => enemy.spawnId && guards?.includes(enemy.spawnId))
            if (threat) target = threat
          }
          if (event.kind === 'danfinal') target = !ep.started || ep.stage === 6 ? event.npc : event.checkpoints![ep.stage <= 3 ? 0 : 1]
          if (event.kind === 'starfire') {
            target = !ep.started || ep.stage === 5 ? event.npc : event.checkpoints![ep.stage === 0 ? 0 : 1]
            if (world.starRun) {
              const z = world.map.starTrial!, cooling = [...z.cooling].sort((a, b) => dist(a, world.player) - dist(b, world.player))[0]
              target = world.starRun.heat > 50 || (world.starCooling() && world.starRun.heat > 10) ? cooling : z.center
            }
          }
          if (event.kind === 'prison') {
            target = !ep.started || ep.stage === 4 ? event.npc : event.checkpoints![ep.stage]
            const guards = event.checkpoints?.[ep.stage]?.guards
            const threat = ep.stage < 4 ? living.find(enemy => enemy.spawnId && guards?.includes(enemy.spawnId)) : living[0]
            if (threat) target = threat
            else if (world.prisonEscort && dist(world.player, world.prisonEscort) > 140) target = world.prisonEscort
          }
          if (event.kind === 'tomb') {
            target = !ep.started || ep.stage === 4 || world.runtime().tomb?.failed ? event.npc : event.checkpoints![ep.stage]
            const guards = event.checkpoints?.[ep.stage]?.guards
            const threat = !world.runtime().tomb?.failed && living.find(enemy => enemy.spawnId && guards?.includes(enemy.spawnId))
            if (threat) target = threat
          }
          if (event.kind === 'inheritance') target = !ep.started || ep.stage === 4 ? event.npc : event.checkpoints![0]
          if (event.kind === 'illusion') target = !ep.started || ep.stage === 4 ? event.npc : event.checkpoints![ep.stage]
          if (event.kind === 'purification') target = !ep.started || ep.stage === 4 ? event.npc : event.checkpoints![ep.stage]
          if (event.kind === 'defense') target = !ep.started || ep.stage === 4 ? event.npc : world.defenseEnemies()[0] ?? event.checkpoints![ep.stage]
          if (event.kind === 'vault') {
            target = !ep.started || ep.stage === 6 ? event.npc : event.checkpoints![ep.stage]
            if (ep.stage === 5 && living.length) target = living[0]
          }
          if (event.kind === 'bond') target = !ep.started || ep.stage === 2 ? event.npc : event.checkpoints![ep.stage]
        }
        const warning = [...(world.survival?.warnings ?? []), ...(world.flameRun?.warnings ?? []), ...(world.escapeRun?.warnings ?? []), ...(world.towerRun?.warnings ?? []), ...(world.danLightning?.warnings ?? []), ...(world.starRun?.warnings ?? []), ...(world.purificationRun?.warnings ?? [])].find(w => dist(w, world.player) < w.radius + 25)
        const threat = living.find(e => e.windup > 0 && [e.target, ...(e.secondary ?? [])].some(t => dist(t, world.player) < e.radius + 25))
        let input = { x: 0, y: 0 }
        if (warning) {
          const direction = world.player.x < 850 ? 1 : -1
          input = world.towerRun || world.flameRun?.phase === 3 ? { x: 0, y: world.player.y < warning.y ? -1 : 1 } : { x: direction, y: 0 }
          if (world.starRun || world.purificationRun) {
            // Choose a visible escape direction that avoids locked warnings and stays near the current goal.
            const z = world.starRun ? world.map.starTrial! : world.map.purificationZones![world.purificationRun!.stage - 1]
            const warnings = world.starRun?.warnings ?? world.purificationRun!.warnings
            const options = Array.from({ length: 8 }, (_, i) => {
              const x = Math.cos(i * Math.PI / 4), y = Math.sin(i * Math.PI / 4)
              const point = { x: world.player.x + x * 140, y: world.player.y + y * 140 }
              const score = -dist(point, target) - (dist(point, z.center) > z.radius ? 250 : 0)
                - warnings.filter(w => dist(w, point) < w.radius + 22).length * 1000
                - (mapCollides(world.map, point, 22) ? 2000 : 0)
              return { x, y, score }
            }).sort((a, b) => b.score - a.score)
            input = { x: options[0].x, y: options[0].y }
          }
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
        if (!visitedMaps.has(world.map.id)) { visitedMaps.add(world.map.id); path = []; previousTarget = { x: -999, y: -999 } }
        if (frame % 10 === 0) expect(() => validateState(state), `第${chapter.id}章第${frame}帧必须可存档`).not.toThrow()
      }
      expect(state.progress[chapter.id].boss, `第${chapter.id}章未打通：hp=${world.player.hp}, kills=${state.progress[chapter.id].kills}, herbs=${state.progress[chapter.id].herbs}, position=${world.player.x},${world.player.y}, event=${JSON.stringify(eventProgress(state))}, star=${JSON.stringify(world.runtime().starChallenge)}`).toBe(true)
      if (chapter.id === 20) expect(eventProgress(state).attempts, '丹界指定药材应在单次45秒内完成').toBe(1)
      if (chapter.id === 23) expect(eventProgress(state).attempts, '天墓三层应各在单次时限内完成').toBe(3)
      if (chapter.id === 28) expect([...visitedMaps], '终战必须真实进入三个战场').toEqual(['continent-final-battlefield', 'final-blood-realm', 'final-emperor-flame-realm'])
      state = finishChapter(state)
      if (chapter.id === 2) {
        state = replayEarlyTraining(state, true, undefined, true, true, true, true)
        expect(state.earlyTraining.practice.attempts).toBe(1)
      }
      for (const { event } of [...bondEvents, ...preparationEvents].filter(item => item.chapter === chapter.id)) {
        const id = event.id
        let revisitPath: Vec[] = [], revisitTarget: Vec = { x: -999, y: -999 }
        for (let tick = 0; tick < 3600 && !eventDone(state, chapter.id, id); tick++) {
          const p = eventProgress(state, chapter.id, id), target = event.kind === 'preparation'
            ? !p.started || p.stage === 6 ? event.npc : p.stage === 0 ? event.checkpoints![0]
              : p.stage === 1 ? event.checkpoints![[1, 2, 3].find(index => !(p.score & (1 << (index - 1))))!] : event.checkpoints![4]
            : !p.started || p.stage === 2 ? event.npc : event.checkpoints![p.stage]
          if (tick % 20 === 0 || !revisitPath.length || dist(target, revisitTarget) > 45) {
            revisitPath = route(world.player, target, world.collisionMap()); revisitTarget = { ...target }
          }
          while (revisitPath.length > 1 && dist(revisitPath[0], world.player) < 14) revisitPath.shift()
          const point = revisitPath[0] ?? target, dx = point.x - world.player.x, dy = point.y - world.player.y, length = Math.hypot(dx, dy)
          world.step(length > 4 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 })
          if (tick % 10 === 0) {
            world.action('attack', { x: 0, y: 0 })
            if (world.player.hp < world.runtime().maxHp * .5) world.action('heal', { x: 0, y: 0 })
            world.action('interact', { x: 0, y: 0 }); expect(() => validateState(state)).not.toThrow()
          }
        }
        expect(eventDone(state, chapter.id, id), `${event.title}需合法回访输入完成：progress=${JSON.stringify(eventProgress(state, chapter.id, id))},position=${world.player.x},${world.player.y}`).toBe(true)
      }
      expect(validateState(state)).toEqual(state)
      expect(world.player.hp, `${difficulty}/${chapter.id}回访后必须存活`).toBeGreaterThan(0)
      expect(state.completed.length).toBe(chapter.id)
      timings.push(Math.round(frame / 60))
      resources.push({ chapter: chapter.id, hp: Math.round(world.player.hp), gold: state.gold, heal: state.inventory.heal, mana: state.inventory.mana })
    }
    expect(state.completed.length).toBe(28)
    expect(state.earlyTraining.practice.phase).toBe(4)
    expect(state.earlyTraining.bracelet).toEqual({ stage: 6, gift: 'xuner' })
    expect(state.earlyTraining.growth.stage).toBe(3)
    expect(state.earlyTraining.hall).toEqual({ stage: 9, scroll: 'borrowed-second' })
    expect(state.earlyTraining.teaching.stage).toBe(5)
    console.log(`28章纯逻辑输入回放（${difficulty}，非人工通关）：${timings.join(', ')} 秒`)
    const reportDirectory = process.env.DOUPO_REPLAY_REPORT_DIR
    if (reportDirectory) {
      mkdirSync(reportDirectory, { recursive: true })
      writeFileSync(resolve(reportDirectory, `${difficulty}.json`), JSON.stringify({
        version: state.contentVersion, difficulty, simulation: 'fixed-step rule replay; not manual or device play',
        completed: state.completed.length, deaths: 0, equipmentUpgrades: { attack: state.attackUpgrade, armor: state.armorUpgrade },
        healsUsed, manaUsed, mainChapterSeconds: timings, resources,
      }, null, 2) + '\n')
    }
  }, 30_000)
})
