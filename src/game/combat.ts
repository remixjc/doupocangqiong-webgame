import type { Action, Chapter, GameState, Runtime } from '../core/model'
import { chapterReady, damage, playerStats, skillInfo, skillUnlocked } from '../core/rules'
import { hasLineOfSight, mapForChapter, mapCollides, MAP_WIDTH, MAP_HEIGHT, type PatrolDefinition } from '../content/maps'
import { eventForChapter, eventsForChapter } from '../content/events'
import { eventProgress, type EventAction } from '../core/events'
import { teacherSupport } from '../core/companions'

export interface Vec { x: number; y: number }
export interface Obstacle { x: number; y: number; w: number; h: number }
export interface Fighter extends Vec {
  id: number; hp: number; maxHp: number; type: 'brute' | 'hunter' | 'mage' | 'boss'
  spawnId?: string
  patrol?: PatrolDefinition
  patrolIndex: number
  alert: number
  timer: number; windup: number; target: Vec; radius: number; burn: number; burnTick: number
  secondary?: Vec[]
  duel?: { phase: number; move: 'thrust' | 'fan' | 'cyclone'; sequence: number; origin: Vec; dashTime: number; recovery: number }
  ranking?: { phase: number; recovery: number; practice: boolean; sequence: number }
  sect?: { phase: number; recovery: number; sequence: number }
}
export interface Herb extends Vec { available: boolean; respawn: number }
export interface Effect extends Vec { radius: number; time: number; maxTime: number; color: number; kind: 'ring' | 'slash' }
export interface Floating extends Vec { text: string; time: number; color: string }
export interface Input { x: number; y: number; aim?: Vec }
export interface EscortRun extends Vec { hp: number; maxHp: number; stage: number; waiting: boolean }
export interface SurvivalRun { elapsed: number; nextWave: number; warnings: (Vec & { time: number; radius: number })[] }
export interface FlameRun extends SurvivalRun { phase: number; heat: number; failed: boolean; wave: number }
export interface EscapeRun extends SurvivalRun { stage: number; wave: number }
export interface SquadRun extends EscortRun { holding: boolean; channel: number }
export interface CombatCallbacks {
  state: () => GameState; collect: () => void; kill: (boss: boolean) => void
  heal: () => boolean; mana?: () => boolean; camp: () => void; notify: (text: string) => void
  sound?: (kind: 'attack' | 'skill' | 'dodge' | 'hurt' | 'collect' | 'victory') => void
  storyEvent?: (id: string, checkpoint?: number) => void
  eventAction?: (action: EventAction) => void
  rankPractice?: () => void
}
export const WIDTH = MAP_WIDTH, HEIGHT = MAP_HEIGHT
function distance(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y) }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

export class CombatWorld {
  readonly map
  player = { x: 0, y: 0, hp: 180, qi: 100, stamina: 100, facing: 0, invincible: 0, roll: 0, hit: 0 }
  enemies: Fighter[] = []
  herbs: Herb[] = []
  effects: Effect[] = []
  floats: Floating[] = []
  cooldowns: Runtime['cooldowns'] = { strike: 0, wave: 0, lotus: 0, dodge: 0, heal: 0, support: 0 }
  attackCooldown = 0
  elapsed = 0
  escort?: EscortRun
  survival?: SurvivalRun
  flameRun?: FlameRun
  escapeRun?: EscapeRun
  squad?: SquadRun
  huntTeam?: EscortRun
  towerRun?: FlameRun
  siegeRun?: { stage: number; channel: number }
  expeditionRun?: { attempt: number; elapsed: number; failed: boolean }
  danLightning?: SurvivalRun
  starRun?: FlameRun
  prisonEscort?: EscortRun
  tombRun?: { stage: number; attempt: number; elapsed: number; failed: boolean }
  private nextId = 1
  private lastHit = -10
  private bossSpawned = false
  private rollDirection: Vec = { x: 1, y: 0 }
  barrierClosed() {
    const barrier = this.map.eventBarrier
    return !!barrier && eventProgress(this.cb.state(), this.chapter.id, barrier.eventId).stage < barrier.unlockedStage
  }
  collisionMap() {
    return this.barrierClosed() ? { ...this.map, obstacles: [...this.map.obstacles, this.map.eventBarrier!.obstacle] } : this.map
  }
  constructor(readonly chapter: Chapter, private cb: CombatCallbacks) {
    this.map = mapForChapter(chapter.id)
    Object.assign(this.player, this.map.spawn)
    this.herbs = this.map.herbs.map(h => ({ ...h, available: true, respawn: 0 }))
    const stats = playerStats(cb.state())
    this.player.hp = stats.maxHp
    this.player.qi = stats.maxQi
    for (const enemy of this.map.enemies.slice(0, this.map.siegeDurations || this.map.expeditionDuration || this.map.prisonPursuit || this.map.tombDurations ? this.map.enemies.length : Math.max(3, chapter.objectives.kills))) {
      const cleared = enemy.id && eventsForChapter(chapter.id).some(event => {
        const p = eventProgress(cb.state(), chapter.id, event.id)
        if (['lineage', 'expedition'].includes(event.kind)) return p.started && event.checkpoints?.some((point, index) =>
          index > 0 && (p.score & (1 << (index - 1))) !== 0 && point.guards?.includes(enemy.id!))
        return p.started && event.checkpoints?.some((point, index) => index < (event.kind === 'alliance' ? p.stage - 1 : p.stage) && point.guards?.includes(enemy.id!))
      })
      if (!cleared) this.spawn(enemy.type, enemy.x, enemy.y, enemy.id, enemy.patrol)
    }
    this.syncMountainRuns()
    this.syncFlameRun()
    this.syncEscapeRun()
    this.syncSquad()
    this.syncHuntTeam()
    this.syncTower()
    this.syncSiege()
    this.syncExpedition()
    this.syncDanLightning()
    this.syncStar()
    this.syncPrison()
    this.syncTomb()
    const retreat = eventsForChapter(chapter.id).find(e => e.kind === 'escape')
    const retreatProgress = retreat && eventProgress(cb.state(), chapter.id, retreat.id)
    if (retreat && retreatProgress?.started && retreatProgress.stage >= 1 && retreatProgress.stage <= 3)
      Object.assign(this.player, retreat.checkpoints![retreatProgress.stage - 1])
    const squadEvent = eventsForChapter(chapter.id).find(e => e.kind === 'squad')
    const squadProgress = squadEvent && eventProgress(cb.state(), chapter.id, squadEvent.id)
    if (squadEvent && squadProgress?.started && [1, 2].includes(squadProgress.stage))
      Object.assign(this.player, squadEvent.checkpoints![squadProgress.stage - 1])
    const huntEvent = eventsForChapter(chapter.id).find(e => e.kind === 'hunt')
    const huntProgress = huntEvent && eventProgress(cb.state(), chapter.id, huntEvent.id)
    if (huntEvent && huntProgress?.started && huntProgress.stage >= 1 && huntProgress.stage <= 3)
      Object.assign(this.player, huntEvent.checkpoints![huntProgress.stage - 1])
    const towerEvent = eventsForChapter(chapter.id).find(e => e.kind === 'tower')
    const towerProgress = towerEvent && eventProgress(cb.state(), chapter.id, towerEvent.id)
    if (towerEvent && towerProgress?.started && towerProgress.stage >= 1 && towerProgress.stage <= 3)
      Object.assign(this.player, towerEvent.checkpoints![towerProgress.stage - 1])
    const siegeEvent = eventsForChapter(chapter.id).find(e => e.kind === 'siege')
    const siegeProgress = siegeEvent && eventProgress(cb.state(), chapter.id, siegeEvent.id)
    if (siegeEvent && siegeProgress?.started && siegeProgress.stage >= 1 && siegeProgress.stage <= 4)
      Object.assign(this.player, siegeEvent.checkpoints![siegeProgress.stage - 1])
    const expedition = eventsForChapter(chapter.id).find(e => e.kind === 'expedition')
    if (expedition && eventProgress(cb.state(), chapter.id, expedition.id).stage === 1)
      Object.assign(this.player, expedition.checkpoints![0])
    if (this.danLightning) Object.assign(this.player, this.map.lightningTrial!.center)
    if (this.starRun) Object.assign(this.player, this.map.starTrial!.cooling[0])
    const prison = eventsForChapter(chapter.id).find(e => e.kind === 'prison'), prisonProgress = prison && eventProgress(cb.state(), chapter.id, prison.id)
    if (prison && prisonProgress?.started && prisonProgress.stage >= 1 && prisonProgress.stage <= 4)
      Object.assign(this.player, prison.checkpoints![prisonProgress.stage - 1])
    const tomb = eventsForChapter(chapter.id).find(e => e.kind === 'tomb')
    if (tomb && this.tombRun) Object.assign(this.player, tomb.checkpoints![this.tombRun.stage - 1])
  }
  private syncTomb() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'tomb'), p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage < 1 || p.stage > 3) this.tombRun = undefined
    else if (!this.tombRun || this.tombRun.stage !== p.stage || this.tombRun.attempt !== p.attempts)
      this.tombRun = { stage: p.stage, attempt: p.attempts, elapsed: 0, failed: false }
  }
  private stepTomb(dt: number) {
    this.syncTomb()
    const run = this.tombRun
    if (!run || run.failed) return
    run.elapsed += dt
    if (run.elapsed >= this.map.tombDurations![run.stage - 1]) {
      run.failed = true
      this.cb.notify('本层天墓探索超时，不能读取当前路标。已完成层保留，免费休整/刷新重建，或回薰儿处重试当前层。')
    }
  }
  private syncPrison() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'prison'), p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage !== 4) this.prisonEscort = undefined
    else if (!this.prisonEscort) {
      this.prisonEscort = { ...e!.checkpoints![3], hp: 200, maxHp: 200, stage: 4, waiting: false }
      for (const enemy of this.map.prisonPursuit!) this.spawn(enemy.type, enemy.x, enemy.y, enemy.id)
      this.cb.notify('药老已离开囚牢，追击者出现。保护他沿原路撤离，超过180距离会等待。')
    }
  }
  prisonArrived() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'prison')
    return !!e && !!this.prisonEscort && this.prisonEscort.hp > 0 && this.player.hp > 0 && distance(this.prisonEscort, e.npc) < 65
  }
  private stepPrison(dt: number) {
    this.syncPrison()
    const ally = this.prisonEscort, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'prison')
    if (!ally || !e || ally.hp <= 0) return
    ally.waiting = distance(this.player, ally) > 180
    const dist = distance(ally, e.npc)
    if (!ally.waiting && dist > 8) this.move(ally, (e.npc.x - ally.x) / dist * Math.min(dist, dt * 120),
      (e.npc.y - ally.y) / dist * Math.min(dist, dt * 120))
  }
  private syncStar() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'starfire')
    const p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage < 2 || p.stage > 4) this.starRun = undefined
    else if (!this.starRun || this.starRun.phase !== p.stage)
      this.starRun = { phase: p.stage, heat: this.starRun?.heat ?? 0, elapsed: 0, nextWave: 0, warnings: [], wave: 0, failed: false }
  }
  starCooling() { return !!this.map.starTrial?.cooling.some(p => distance(p, this.player) < 55) }
  inStarZone() {
    const z = this.map.starTrial
    return !!z && distance(this.player, z.center) < z.radius
  }
  starStable() { return !!this.starRun && this.inStarZone() && !this.starCooling() && this.starRun.heat <= 65 && !this.starRun.failed && this.player.hp > 0 }
  private stepStar(dt: number) {
    this.syncStar()
    const run = this.starRun, z = this.map.starTrial, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'starfire')
    if (!run || !z || !e || run.failed) return
    run.heat = clamp(run.heat + dt * (this.starCooling() ? -32 : this.inStarZone() ? z.pressure[run.phase - 2] : -8), 0, 100)
    for (const warning of run.warnings) {
      warning.time -= dt
      if (warning.time <= 0) {
        if (distance(this.player, warning) < warning.radius + 16 && this.player.invincible <= 0) {
          this.hurtPlayer(55); run.heat = clamp(run.heat + 15, 0, 100)
        }
        this.effect(warning.x, warning.y, warning.radius, 0xac8fd7)
      }
    }
    run.warnings = run.warnings.filter(w => w.time > 0)
    if (this.player.hp <= 0) return
    if (run.heat >= 100) {
      run.failed = true; run.warnings = []
      this.cb.notify('星火压力满格，本段失控。已完成阶段保留，免费休整或刷新回镇心石重试当前阶段。')
      return
    }
    if (this.starStable()) run.elapsed += dt
    if (run.elapsed >= z.durations[run.phase - 2]) {
      this.cb.eventAction?.({ type: 'stabilize', stage: run.phase, eventId: e.id }); this.syncStar(); return
    }
    run.nextWave -= dt
    if (run.nextWave <= 0) {
      run.nextWave = run.phase === 4 ? 1.9 : 2.4
      if (run.phase === 3) {
        run.warnings.push(...Array.from({ length: 6 }, (_, i) => {
          const angle = i * Math.PI / 3 + (run.wave % 2 ? Math.PI / 6 : 0)
          return { x: z.center.x + Math.cos(angle) * 125, y: z.center.y + Math.sin(angle) * 125, radius: 45, time: 1.1 }
        }))
      } else {
        const offsets = run.phase === 4 ? [[0, 0], [-125, 0], [125, 0], [0, -125], [0, 125]] : [[0, 0]]
        run.warnings.push(...offsets.map(([x, y]) => ({ x: clamp(this.player.x + x, 65, WIDTH - 65),
          y: clamp(this.player.y + y, 65, HEIGHT - 65), radius: run.phase === 4 ? 50 : 65, time: 1 })))
      }
      run.wave++
    }
  }
  private syncDanLightning() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'danfinal')
    const p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage !== 5) this.danLightning = undefined
    else if (!this.danLightning) this.danLightning = { elapsed: 0, nextWave: 0, warnings: [] }
  }
  inDanLightningZone() {
    const z = this.map.lightningTrial
    return !!z && distance(this.player, z.center) < z.radius
  }
  private stepDanLightning(dt: number) {
    this.syncDanLightning()
    const run = this.danLightning, z = this.map.lightningTrial
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'danfinal')
    if (!run || !z || !e) return
    if (this.inDanLightningZone()) run.elapsed += dt
    for (const warning of run.warnings) {
      warning.time -= dt
      if (warning.time <= 0) {
        if (distance(this.player, warning) < warning.radius + 16) this.hurtPlayer(65)
        this.effect(warning.x, warning.y, warning.radius, 0xc8b1e6)
      }
    }
    run.warnings = run.warnings.filter(w => w.time > 0)
    if (this.player.hp <= 0) return
    if (run.elapsed >= z.duration) {
      this.cb.eventAction?.({ type: 'survive', eventId: e.id }); this.syncDanLightning(); return
    }
    run.nextWave -= dt
    if (run.nextWave <= 0) {
      const phase = Math.min(3, 1 + Math.floor(run.elapsed / 6))
      run.nextWave = [2.4, 2, 1.8][phase - 1]
      const offsets = phase === 1 ? [[0, 0]] : phase === 2 ? [[-75, 0], [75, 0]]
        : [[0, 0], [-130, 0], [130, 0], [0, -130], [0, 130]]
      run.warnings.push(...offsets.map(([x, y]) => ({
        x: clamp(this.player.x + x, 65, WIDTH - 65), y: clamp(this.player.y + y, 65, HEIGHT - 65),
        radius: [70, 60, 50][phase - 1], time: 1,
      })))
    }
  }
  private syncExpedition() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'expedition'), p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage !== 1) this.expeditionRun = undefined
    else if (!this.expeditionRun || this.expeditionRun.attempt !== p.attempts)
      this.expeditionRun = { attempt: p.attempts, elapsed: 0, failed: false }
  }
  private stepExpedition(dt: number) {
    this.syncExpedition()
    const run = this.expeditionRun
    if (!run || run.failed) return
    run.elapsed += dt
    if (run.elapsed >= this.map.expeditionDuration!) {
      run.failed = true
      this.cb.notify('丹界收集超时，已取得节点保留。免费休整/刷新或回执事重试，当前未采节点重新计时。')
    }
  }
  private syncSiege() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'siege'), p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage < 1 || p.stage > 3) this.siegeRun = undefined
    else if (!this.siegeRun || this.siegeRun.stage !== p.stage) this.siegeRun = { stage: p.stage, channel: 0 }
  }
  siegeChanneling() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'siege'), run = this.siegeRun
    return !!e && !!run && this.player.hp > 0 && distance(this.player, e.checkpoints![run.stage]) < 65 && this.guardsRemaining(e.id, run.stage) === 0
  }
  private chargeSiege(dt: number) {
    this.syncSiege()
    const run = this.siegeRun, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'siege')
    if (!run || !e) return
    if (!this.siegeChanneling() || this.lastHit === this.elapsed) { run.channel = 0; return }
    run.channel += dt
    if (run.channel >= this.map.siegeDurations![run.stage - 1]) {
      this.cb.eventAction?.({ type: 'breach', stage: run.stage, eventId: e.id })
      this.syncSiege()
    }
  }
  private syncTower() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'tower'), p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage < 1 || p.stage > 3) this.towerRun = undefined
    else if (!this.towerRun || this.towerRun.phase !== p.stage)
      this.towerRun = { phase: p.stage, elapsed: 0, heat: 0, failed: false, nextWave: 0, warnings: [], wave: 0 }
  }
  towerCooling() {
    const run = this.towerRun, floor = run && this.map.towerFloors?.[run.phase - 1]
    return !!floor && distance(this.player, floor.cooling) < 50
  }
  inTowerFloor() {
    const run = this.towerRun, floor = run && this.map.towerFloors?.[run.phase - 1]
    return !!floor && distance(this.player, floor.center) < floor.radius && !this.towerCooling()
  }
  private stepTower(dt: number) {
    this.syncTower()
    const run = this.towerRun, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'tower')
    if (!run || !e || run.failed) return
    const floor = this.map.towerFloors![run.phase - 1], inZone = this.inTowerFloor()
    run.heat = clamp(run.heat + dt * (this.towerCooling() ? -32 : inZone ? floor.pressure : -6), 0, 100)
    if (inZone) run.elapsed += dt
    for (const warning of run.warnings) {
      warning.time -= dt
      if (warning.time <= 0) {
        if (distance(this.player, warning) < warning.radius + 16 && this.player.invincible <= 0) {
          this.hurtPlayer(55); run.heat = clamp(run.heat + 15, 0, 100)
        }
        this.effect(warning.x, warning.y, warning.radius, 0xd18b76)
      }
    }
    run.warnings = run.warnings.filter(w => w.time > 0)
    if (this.player.hp <= 0) return
    if (run.heat >= 100) {
      run.failed = true; run.warnings = []
      this.cb.notify('心炎热量满格，本层失控。已完成楼层保留，休整后从安全台阶重试。')
      return
    }
    if (run.elapsed >= floor.duration) {
      this.cb.eventAction?.({ type: 'descend', stage: run.phase, eventId: e.id }); return
    }
    if (!inZone) return
    run.nextWave -= dt
    if (run.nextWave <= 0) {
      run.wave++; run.nextWave = run.phase === 1 ? 2.6 : run.phase === 2 ? 2.2 : 1.9
      if (run.phase === 2) run.warnings.push(...[-55, 55].map(x => ({ x: floor.center.x + x, y: floor.center.y + (run.wave % 2 ? 35 : -35), radius: 55, time: .9 })))
      else {
        run.warnings.push({ x: this.player.x, y: this.player.y, radius: run.phase === 1 ? 48 : 55, time: .9 })
        if (run.phase === 3) run.warnings.push({ ...floor.center, radius: 55, time: 1.1 })
      }
    }
  }
  private syncHuntTeam() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'hunt'), p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage >= 4) this.huntTeam = undefined
    else if (!this.huntTeam) this.huntTeam = { ...(p.stage === 0 ? e!.npc : e!.checkpoints![p.stage - 1]),
      hp: 180, maxHp: 180, stage: p.stage, waiting: false }
    else this.huntTeam.stage = p.stage
  }
  private stepHuntTeam(dt: number) {
    this.syncHuntTeam()
    const team = this.huntTeam, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'hunt')
    if (!team || !e || team.hp <= 0) return
    team.waiting = distance(this.player, team) > 180
    const target = team.stage < 3 ? e.checkpoints![team.stage] : e.npc, dist = distance(team, target)
    if (!team.waiting && dist > 8) this.move(team, (target.x - team.x) / dist * Math.min(dist, dt * 125), (target.y - team.y) / dist * Math.min(dist, dt * 125))
  }
  private huntCheckpoint(eventId: string, index: number) {
    const e = eventsForChapter(this.chapter.id).find(e => e.id === eventId)!, p = eventProgress(this.cb.state(), this.chapter.id, eventId)
    this.syncHuntTeam()
    if (!p.started) { this.cb.notify('先向胡嘉接取火能猎捕。'); return }
    if (index !== p.stage || index > 2) { this.cb.notify('按集合、西路、东路的顺序共同推进。'); return }
    if (this.guardsRemaining(eventId, index)) { this.cb.notify('先清理本路投影守卫，才能领取火能。'); return }
    if (!this.huntTeam || this.huntTeam.hp <= 0) { this.cb.notify('猎捕队友受伤，休整后从最近节点重试。'); return }
    if (distance(this.huntTeam, e.checkpoints![index]) >= 65) { this.cb.notify('队友尚未到达，靠近队伍让他继续前进。'); return }
    this.cb.eventAction?.({ type: 'seal', index, eventId })
  }
  private syncSquad() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'squad')
    const p = e && eventProgress(this.cb.state(), this.chapter.id, e.id)
    if (!p?.started || p.stage >= 3) this.squad = undefined
    else if (!this.squad) {
      const point = p.stage === 0 ? e!.npc : e!.checkpoints![p.stage - 1]
      this.squad = { ...point, hp: 140, maxHp: 140, stage: p.stage, holding: p.stage === 2, waiting: false, channel: 0 }
    } else { this.squad.stage = p.stage; this.squad.holding = p.stage === 2 }
  }
  private stepSquad(dt: number) {
    this.syncSquad()
    const squad = this.squad, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'squad')
    if (!squad || !e || squad.hp <= 0 || squad.holding) return
    squad.waiting = distance(this.player, squad) > 180
    const target = e.checkpoints![squad.stage], dist = distance(squad, target)
    if (!squad.waiting && dist > 8) this.move(squad, (target.x - squad.x) / dist * Math.min(dist, dt * 125), (target.y - squad.y) / dist * Math.min(dist, dt * 125))
  }
  channeling() {
    const squad = this.squad, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'squad')
    return !!squad?.holding && squad.hp > 0 && !!e && distance(squad, e.checkpoints![1]) < 65 && distance(this.player, e.checkpoints![2]) < 65
  }
  private chargeSquad(dt: number) {
    const squad = this.squad, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'squad')
    if (!squad || !e) return
    squad.channel = this.channeling() ? squad.channel + dt : 0
    if (squad.channel >= 3 && this.player.hp > 0) this.cb.eventAction?.({ type: 'formation', eventId: e.id })
  }
  private squadCheckpoint(eventId: string, index: number) {
    const e = eventsForChapter(this.chapter.id).find(e => e.id === eventId)!, p = eventProgress(this.cb.state(), this.chapter.id, eventId)
    this.syncSquad()
    if (!p.started) { this.cb.notify('先与若琳接取协作试炼。'); return }
    if (!this.squad || this.squad.hp <= 0) { this.cb.notify(p.stage >= 3 ? '双阵已完成，返回若琳处登记。' : '试炼同伴受伤，请休整后从安全节点重试。'); return }
    if (p.stage === 2 && index === 2) { this.cb.notify('持续站在东阵3秒，同伴须存活并守住西阵；离开会中断共鸣。'); return }
    if (index !== p.stage || index > 1) { this.cb.notify('按集合点、西阵、东阵的顺序配合。'); return }
    if (distance(this.squad, e.checkpoints![index]) >= 65) { this.cb.notify('同伴尚未到达，靠近同伴让他继续前进。'); return }
    this.cb.eventAction?.({ type: 'seal', index, eventId })
  }
  private syncEscapeRun() {
    const event = eventsForChapter(this.chapter.id).find(e => e.kind === 'escape')
    const p = event && eventProgress(this.cb.state(), this.chapter.id, event.id)
    if (!p?.started || ![1, 2].includes(p.stage)) this.escapeRun = undefined
    else if (!this.escapeRun || this.escapeRun.stage !== p.stage)
      this.escapeRun = { stage: p.stage, elapsed: 0, nextWave: 0, warnings: [], wave: 0 }
  }
  sheltered() {
    const e = eventsForChapter(this.chapter.id).find(e => e.kind === 'escape')
    return !!this.escapeRun && !!e && distance(this.player, e.checkpoints![this.escapeRun.stage]) < (this.map.thunderRoute ? 110 : 90)
  }
  private stepEscape(dt: number) {
    this.syncEscapeRun()
    const run = this.escapeRun, e = eventsForChapter(this.chapter.id).find(e => e.kind === 'escape')
    if (!run || !e) return
    if (this.sheltered()) run.elapsed += dt
    for (const warning of run.warnings) {
      warning.time -= dt
      if (warning.time <= 0) {
        if (distance(this.player, warning) < warning.radius + 16) this.hurtPlayer(60)
        this.effect(warning.x, warning.y, warning.radius, 0x9fa9c9)
      }
    }
    run.warnings = run.warnings.filter(w => w.time > 0)
    if (this.player.hp <= 0) return
    if (run.elapsed >= (this.map.escapeDurations?.[run.stage - 1] ?? 6)) { this.cb.eventAction?.({ type: 'evade', stage: run.stage, eventId: e.id }); return }
    run.nextWave -= dt
    if (run.nextWave <= 0) {
      if (this.map.thunderRoute) {
        run.nextWave = run.stage === 1 ? 2.4 : 2
        const offsets = run.stage === 1 ? (run.wave % 2 ? [[0, -125], [0, 125]] : [[-125, 0], [125, 0]])
          : run.wave % 2 ? [[-100, -100], [100, 100], [-100, 100], [100, -100]] : [[-130, 0], [130, 0], [0, -130], [0, 130]]
        run.warnings.push(...[[0, 0], ...offsets].map(([x, y]) => ({
          x: clamp(this.player.x + x, 65, WIDTH - 65), y: clamp(this.player.y + y, 65, HEIGHT - 65),
          radius: run.stage === 1 ? 45 : 50, time: run.stage === 1 ? 1.1 : .95,
        })))
        run.wave++; return
      }
      run.nextWave = run.stage === 1 ? 2.4 : 2.2
      run.warnings.push({ x: this.player.x, y: this.player.y, radius: run.stage === 1 ? 80 : 65, time: run.stage === 1 ? 1 : .9 })
      if (run.stage === 2) run.warnings.push({ x: this.player.x, y: clamp(this.player.y + 130, 50, HEIGHT - 50), radius: 65, time: .9 })
    }
  }
  private syncFlameRun() {
    const event = eventsForChapter(this.chapter.id).find(e => e.kind === 'flame')
    const p = event && eventProgress(this.cb.state(), this.chapter.id, event.id)
    if (!p?.started || p.stage < 2 || p.stage > 4) this.flameRun = undefined
    else if (!this.flameRun) this.flameRun = { phase: p.stage, heat: 0, failed: false, elapsed: 0, nextWave: 0, warnings: [], wave: 0 }
    else if (this.flameRun.phase !== p.stage) this.flameRun = { ...this.flameRun, phase: p.stage, failed: false, elapsed: 0, nextWave: 0, warnings: [], wave: 0 }
  }
  inHeatZone() {
    const z = this.map.heatZone, p = this.player
    return !!z && p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h
  }
  cooling() { return !!this.map.heatZone?.cooling.some(point => distance(point, this.player) < 70) }
  private stepFlame(dt: number) {
    this.syncFlameRun()
    const run = this.flameRun, event = eventsForChapter(this.chapter.id).find(e => e.kind === 'flame')
    if (!run || !event || run.failed) return
    const inZone = this.inHeatZone()
    run.heat = clamp(run.heat + dt * (!inZone ? -8 : this.cooling() ? -28 : 6), 0, 100)
    if (!inZone) return
    if (run.heat >= 100) {
      run.failed = true; run.warnings = []
      this.cb.notify('火焰热量满格，控火失控。未扣材料；营地休整后从当前阶段重试。')
      return
    }
    run.elapsed += dt
    for (const warning of run.warnings) {
      warning.time -= dt
      if (warning.time <= 0) {
        if (distance(this.player, warning) < warning.radius + 16) this.hurtPlayer(55)
        this.effect(warning.x, warning.y, warning.radius, run.phase === 3 ? 0xd68c62 : 0x77cbb0)
      }
    }
    run.warnings = run.warnings.filter(w => w.time > 0)
    if (this.player.hp <= 0) return
    if (run.elapsed >= 12) { this.cb.eventAction?.({ type: 'stabilize', stage: run.phase, eventId: event.id }); return }
    if (run.elapsed >= run.nextWave) {
      run.nextWave = run.elapsed + (run.phase === 4 ? 2 : 2.4)
      if (run.phase === 3) {
        const y = run.wave % 2 === 0 ? 330 : 500
        run.warnings.push(...[650, 830, 1010, 1190].map(x => ({ x, y, time: 1.1, radius: 72 })))
      } else run.warnings.push({ x: this.player.x, y: this.player.y, time: run.phase === 4 ? .9 : 1, radius: run.phase === 4 ? 120 : 80 })
      run.wave++
    }
  }
  private syncMountainRuns() {
    const s = this.cb.state()
    for (const e of eventsForChapter(this.chapter.id)) {
      const p = eventProgress(s, this.chapter.id, e.id)
      if (e.kind === 'escort') {
        if (!p.started || p.stage === 3) this.escort = undefined
        else if (!this.escort) {
          const point = p.stage > 0 ? e.checkpoints![p.stage - 1] : e.npc
          this.escort = { ...point, hp: 120, maxHp: 120, stage: p.stage, waiting: false }
        } else this.escort.stage = p.stage
      }
      if (e.kind === 'survival') {
        if (!p.started || p.stage !== 1) this.survival = undefined
        else this.survival ??= { elapsed: 0, nextWave: 0, warnings: [] }
      }
    }
  }
  inSurvivalZone() {
    const z = this.map.survivalZone, p = this.player
    return !!z && p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h
  }
  private escortCheckpoint(index: number) {
    const event = eventsForChapter(this.chapter.id).find(e => e.kind === 'escort')!
    const progress = eventProgress(this.cb.state(), this.chapter.id, event.id), npc = this.escort
    if (!progress.started) { this.cb.notify('先与采药同伴交谈，接下保护任务。'); return }
    if (!npc || npc.hp <= 0) { this.cb.notify(progress.stage === 3 ? '采药同伴已经安全返营。' : '同伴受伤倒下，请营地休整后从安全节点重试。'); return }
    if (index !== progress.stage) { this.cb.notify('按路线顺序前往当前药圃或会合点。'); return }
    if (distance(npc, event.checkpoints![index]) > 65) { this.cb.notify('同伴尚未到达，靠近同伴让他继续前进。'); return }
    this.cb.eventAction?.({ type: 'seal', index, eventId: event.id })
  }
  private stepMountain(dt: number) {
    this.syncMountainRuns()
    const escortEvent = eventsForChapter(this.chapter.id).find(e => e.kind === 'escort')
    if (this.escort && this.escort.hp > 0 && escortEvent) {
      const npc = this.escort, target = escortEvent.checkpoints![npc.stage], dist = distance(npc, target)
      npc.waiting = distance(npc, this.player) > 180
      if (!npc.waiting && dist > 8) this.move(npc, (target.x - npc.x) / dist * Math.min(dist, dt * 125), (target.y - npc.y) / dist * Math.min(dist, dt * 125))
    }
    const run = this.survival, event = eventsForChapter(this.chapter.id).find(e => e.kind === 'survival')
    if (!run || !event || !this.inSurvivalZone()) return
    run.elapsed += dt
    for (const warning of run.warnings) {
      warning.time -= dt
      if (warning.time <= 0) {
        if (distance(this.player, warning) < warning.radius + 16) this.hurtPlayer(65)
        this.effect(warning.x, warning.y, warning.radius, 0x9e68b9)
      }
    }
    run.warnings = run.warnings.filter(w => w.time > 0)
    if (this.player.hp <= 0) return
    if (run.elapsed >= 24) { this.cb.eventAction?.({ type: 'survive', eventId: event.id }); return }
    if (run.elapsed >= run.nextWave) {
      run.nextWave = run.elapsed + 2.4
      run.warnings.push({ x: this.player.x, y: this.player.y, time: 1, radius: 85 })
    }
  }
  spawn(type: Fighter['type'], x: number, y: number, spawnId?: string, patrol?: PatrolDefinition) {
    const d = this.cb.state().settings.difficulty
    const scale = d === 'story' ? 0.72 : d === 'hard' ? 1.25 : 1
    const hp = Math.round((type === 'boss' ? 280 + this.chapter.id * 46 : 48 + this.chapter.id * 6) * scale)
    this.enemies.push({ id: this.nextId++, spawnId, patrol, patrolIndex: 0, alert: 0, x, y, hp, maxHp: hp, type, timer: type === 'boss' ? 1.8 : 1,
      windup: 0, target: { x, y }, radius: 0, burn: 0, burnTick: 0,
      ...(type === 'boss' && this.map.duelArena ? { duel: { phase: 1, move: 'thrust' as const, sequence: 0, origin: { x, y }, dashTime: 0, recovery: 0 } } : {}),
      ...(type === 'boss' && this.map.rankingArena ? { ranking: { phase: 1, recovery: 0, practice: this.cb.state().completed.includes(14), sequence: 0 } } : {}),
      ...(type === 'boss' && this.map.siegeDurations ? { sect: { phase: 1, recovery: 0, sequence: 0 } } : {}) })
  }
  guardsRemaining(eventId: string, index: number) {
    const guards = eventsForChapter(this.chapter.id).find(e => e.id === eventId)?.checkpoints?.[index]?.guards ?? []
    return this.enemies.filter(e => e.hp > 0 && e.spawnId && guards.includes(e.spawnId)).length
  }
  private move(p: Vec, vx: number, vy: number) {
    const arena = this.map.duelArena && this.enemies.some(e => e.duel && e.hp > 0) ? this.map.duelArena : undefined
    const nx = clamp(p.x + vx, arena ? arena.x + 22 : 40, arena ? arena.x + arena.w - 22 : WIDTH - 40)
    const ny = clamp(p.y + vy, arena ? arena.y + 22 : 45, arena ? arena.y + arena.h - 22 : HEIGHT - 40)
    const map = this.collisionMap()
    if (!mapCollides(map, { x: nx, y: p.y })) p.x = nx
    if (!mapCollides(map, { x: p.x, y: ny })) p.y = ny
  }
  private effect(x: number, y: number, radius: number, color: number, kind: Effect['kind'] = 'ring') {
    this.effects.push({ x, y, radius, color, kind, time: .36, maxTime: .36 })
  }
  private hurtEnemy(e: Fighter, amount: number, interrupt = false, applyBurn = true) {
    if (e.hp <= 0) return
    if (e.ranking) amount = Math.max(1, Math.round(amount * (e.windup > 0 ? .35 : e.ranking.recovery > 0 ? 1.25 : 1)))
    if (e.sect) amount = Math.max(1, Math.round(amount * (e.windup > 0 ? .55 : e.sect.recovery > 0 ? 1.3 : 1)))
    e.hp = Math.max(0, e.hp - amount)
    if (e.patrol) e.alert = 1
    this.floats.push({ x: e.x, y: e.y - 40, text: String(amount), time: .65, color: '#f4deb4' })
    if (interrupt && e.type !== 'boss') { e.windup = 0; e.timer = 1.4 }
    if (applyBurn && this.cb.state().flame === 'lotus') e.burn = 3
    if (e.hp === 0) {
      this.effect(e.x, e.y, e.type === 'boss' ? 110 : 40, 0xd4bb87)
      if (e.ranking?.practice) this.cb.rankPractice?.()
      else this.cb.kill(e.type === 'boss')
      if (e.type === 'boss') this.cb.sound?.('victory')
    }
  }
  private hurtPlayer(amount: number) {
    if (this.player.hp <= 0 || this.player.invincible > 0) return
    const s = this.cb.state()
    const scale = s.settings.difficulty === 'story' ? .48 : s.settings.difficulty === 'hard' ? 1.3 : 1
    const hit = damage(amount, scale, playerStats(s).defense)
    this.player.hp = Math.max(0, this.player.hp - hit)
    this.player.invincible = .5
    this.player.hit = .18
    this.lastHit = this.elapsed
    this.cb.sound?.('hurt')
    this.floats.push({ x: this.player.x, y: this.player.y - 48, text: `−${hit}`, time: .8, color: '#ef9583' })
  }
  private aim(input: Input): Vec {
    if (input.aim) return input.aim
    const event = eventForChapter(this.chapter.id), progress = eventProgress(this.cb.state(), this.chapter.id)
    if (event?.dummy && progress.started && progress.stage === 0 && distance(event.dummy, this.player) < 170) return event.dummy
    const nearest = this.enemies.filter(e => e.hp > 0).sort((a, b) => distance(a, this.player) - distance(b, this.player))[0]
    if (nearest && distance(nearest, this.player) < 440) return nearest
    return { x: this.player.x + Math.cos(this.player.facing) * 150, y: this.player.y + Math.sin(this.player.facing) * 150 }
  }
  action(action: Action, input: Input) {
    if (this.player.hp <= 0) return
    const p = this.player, s = this.cb.state()
    const target = this.aim(input)
    if (action !== 'interact') p.facing = Math.atan2(target.y - p.y, target.x - p.x)
    if (action === 'interact') {
      const near = this.near()
      if (near === 'event') {
        const event = this.nearEvent()!, progress = eventProgress(s, this.chapter.id, event.id)
        if (event.kind === 'prison' && progress.stage === 4 && !this.prisonArrived())
          this.cb.notify(this.prisonEscort?.hp === 0 ? '药老受伤倒下，免费休整后从囚牢重新撤离。' : '双方存活并返回会合点才能报告，靠近药老让他跟上。')
        else if (event.kind === 'escort' && progress.started && progress.stage < 3) {
          if (distance(p, event.checkpoints![progress.stage]) < 75) this.escortCheckpoint(progress.stage)
          else this.cb.notify(this.escort?.hp === 0 ? '同伴受伤倒下，请营地休整后重试。' : '带同伴前往当前药圃；距离太远时同伴会等你。')
        } else this.cb.storyEvent?.(event.id)
      }
      else if (near === 'checkpoint') {
        const event = eventsForChapter(this.chapter.id).find(e => e.checkpoints?.some(point => distance(p, point) < 75))!
        const index = event.checkpoints!.findIndex(point => distance(p, point) < 75)
        if (event.kind === 'inheritance') this.cb.storyEvent?.(event.id, index)
        else if (event.kind === 'danfinal') {
          const stage = eventProgress(s, this.chapter.id, event.id).stage
          if (index === 0) this.cb.storyEvent?.(event.id, index)
          else if (stage === 4) this.cb.eventAction?.({ type: 'seal', index, eventId: event.id })
          else this.cb.notify('控火通过后在丹雷台开始；生存18秒并躲避预警，E不能跳过丹雷。')
        }
        else if (event.kind === 'starfire' && index === 1) {
          if (!eventProgress(s, this.chapter.id, event.id).started) this.cb.notify('先与丹塔引路人接取星火稳固。')
          else if (eventProgress(s, this.chapter.id, event.id).stage === 1) this.cb.storyEvent?.(event.id, index)
          else this.cb.notify('核心内压力不超过65才计时；镇心石降压，E不能代替三段稳固。')
        }
        else if (event.kind === 'prison') {
          const stage = eventProgress(s, this.chapter.id, event.id).stage
          if (stage !== index) this.cb.notify('先确认退路，依序破除外廊、内封和囚牢；已完成节点不重复操作。')
          else if (this.guardsRemaining(event.id, index) > 0) this.cb.notify(`本节点还有${this.guardsRemaining(event.id, index)}名守卫，先清理再破禁。`)
          else { this.cb.eventAction?.({ type: 'seal', index, eventId: event.id }); this.syncPrison() }
        }
        else if (event.kind === 'tomb') {
          this.syncTomb()
          const stage = eventProgress(s, this.chapter.id, event.id).stage, run = this.tombRun
          if (index !== stage) this.cb.notify('从入口按外层、中层、深层顺序探索，已完成路标不重复读取。')
          else if (index > 0 && (!run || run.failed || run.elapsed >= this.map.tombDurations![stage - 1])) this.cb.notify('当前层已超时或尚未启动，免费休整或回薰儿处重试。')
          else if (this.guardsRemaining(event.id, index) > 0) this.cb.notify(`本层还有${this.guardsRemaining(event.id, index)}名守卫，清理后读取路标。`)
          else this.cb.eventAction?.({ type: 'seal', index, eventId: event.id })
        }
        else if (event.kind === 'squad') this.squadCheckpoint(event.id, index)
        else if (event.kind === 'hunt') this.huntCheckpoint(event.id, index)
        else if (event.kind === 'tower' && index > 0) this.cb.notify('进入当前层阵眼累计镇炎时间；镇心石降热但不计时，E不能代替镇炎。')
        else if (event.kind === 'siege' && index > 0) this.cb.notify(this.guardsRemaining(event.id, index) > 0
          ? `本阵守卫尚有${this.guardsRemaining(event.id, index)}名，先清理威胁。` : '在当前阵眼连续稳定斗气；离阵或受击会中断，E不能代替破阵计时。')
        else if (event.kind === 'escape' && [1, 2].includes(index)) this.cb.notify('继续在当前掩体附近稳住脚步，躲避追击；两处按顺序通过后才开放出口。')
        else if (event.kind === 'escape' && index === 3) {
          this.cb.eventAction?.({ type: 'seal', index, eventId: event.id })
          if (chapterReady(this.cb.state()) && !this.cb.state().progress[this.chapter.id].boss) { this.cb.kill(true); this.cb.sound?.('victory') }
        } else if (event.kind === 'alliance' && index > 0 && eventProgress(s, this.chapter.id, event.id).choice === 'steady' && this.guardsRemaining(event.id, index) > 0)
          this.cb.notify(`巡防驻点尚有${this.guardsRemaining(event.id, index)}名守卫，先清理威胁再登记。`)
        else if (event.kind === 'rescue' && this.guardsRemaining(event.id, index) > 0) this.cb.notify(`区域守卫尚有${this.guardsRemaining(event.id, index)}名，请先清理威胁再解救。`)
        else if (event.kind === 'lineage' && [1, 2].includes(index) && this.guardsRemaining(event.id, index) > 0)
          this.cb.notify(`记录附近还有${this.guardsRemaining(event.id, index)}名守卫，先清理投影再读取。`)
        else if (event.kind === 'lineage' && index === 3) {
          if (eventProgress(s, this.chapter.id, event.id).stage !== 2) this.cb.notify('先带回两份记录，再来校对下一程。')
          else this.cb.storyEvent?.(event.id, index)
        }
        else if (event.kind === 'expedition' && index > 0) {
          this.syncExpedition()
          const run = this.expeditionRun
          if (!run || run.failed || run.elapsed >= this.map.expeditionDuration!) this.cb.notify('当前收集未开始或已超时。回执事重试，或免费休整/刷新重建当前未采节点。')
          else if (this.guardsRemaining(event.id, index) > 0) this.cb.notify(`驻点还有${this.guardsRemaining(event.id, index)}名守卫，先清理威胁。`)
          else this.cb.eventAction?.({ type: 'seal', index, eventId: event.id })
        }
        else if (event.kind === 'escort') this.escortCheckpoint(index)
        else if (event.kind === 'survival' && index === 1) {
          this.cb.eventAction?.({ type: 'seal', index, eventId: event.id })
          if (chapterReady(this.cb.state()) && !this.cb.state().progress[this.chapter.id].boss) { this.cb.kill(true); this.cb.sound?.('victory') }
        } else if ((['cave', 'certification', 'flame', 'auction'].includes(event.kind) && index === 1) || (event.kind === 'tournament' && index > 0)) {
          if (!eventProgress(s, this.chapter.id, event.id).started) this.cb.notify(`先与${event.speaker}交谈，接下本章历练。`)
          else this.cb.storyEvent?.(event.id, index)
        }
        else this.cb.eventAction?.({ type: 'seal', index, eventId: event.id })
      } else if (near === 'herb') {
        const herb = this.herbs.find(h => h.available && distance(h, p) < 75)!
        herb.available = false; herb.respawn = 22
        this.cb.collect(); this.cb.sound?.('collect'); this.effect(herb.x, herb.y, 36, 0x8ee4b3)
      } else if (near === 'camp') {
        this.cb.camp()
      } else if (near === 'gate') {
        if (this.map.rankingArena && s.completed.includes(14)) {
          if (!this.bossSpawned) {
            this.spawn('boss', this.map.bossSpawn.x, this.map.bossSpawn.y); this.bossSpawned = true
            this.cb.notify('强榜复练已开始。真实获胜得1火能，首通奖励不重复。')
          } else this.cb.notify(this.enemies.some(e => e.ranking && e.hp > 0) ? '本轮复练正在进行。' : '本轮复练已经结束，休整后可再次挑战。')
        }
        else if (s.progress[s.chapter].boss) this.cb.notify('本章试炼已通过，返回左下营地结算。')
        else if (!chapterReady(s)) this.cb.notify('先完成左侧本章历练与剧情事件，再开启试炼。')
        else if (this.map.survivalZone || this.map.trialMode || this.map.escapeRoute) {
          this.cb.kill(true)
          this.cb.notify(this.map.trialMode === 'assessment' ? `${this.map.gateLabel ?? '资格'}审核通过，返回营地结算并继续旅程。` : this.map.trialMode === 'attunement' ? `收服已确认，返回营地正式结算取得${this.map.starTrial ? '三千焱炎火' : '青莲地心火'}。` : '已安全撤离，返回营地结算。')
        }
        else if (!this.bossSpawned) {
          this.spawn('boss', this.map.bossSpawn.x, this.map.bossSpawn.y); this.bossSpawned = true
          this.cb.notify(`${this.chapter.boss} · 注意脚下的攻击预警`)
        } else this.cb.notify('试炼正在进行。')
      } else this.cb.notify('靠近人物、立约点、药草、营地或试炼碑后交互。')
      return
    }
    if (action === 'dodge') {
      if (this.cooldowns.dodge > 0 || p.stamina < 28) return
      this.rollDirection = Math.hypot(input.x, input.y) > .1
        ? { x: input.x / Math.hypot(input.x, input.y), y: input.y / Math.hypot(input.x, input.y) }
        : { x: Math.cos(p.facing), y: Math.sin(p.facing) }
      p.stamina -= 28; p.roll = .22; p.invincible = .28; this.cooldowns.dodge = .7
      this.cb.sound?.('dodge')
      const event = eventForChapter(this.chapter.id), progress = eventProgress(s, this.chapter.id)
      if (event?.dummy && progress.started && progress.stage === 1 && distance(p, event.dummy) < 170) this.cb.eventAction?.({ type: 'dodge' })
      return
    }
    if (action === 'heal') {
      if (this.cooldowns.heal > 0 || p.hp >= playerStats(s).maxHp) return
      if (this.cb.heal()) {
        p.hp = Math.min(playerStats(s).maxHp, p.hp + playerStats(s).maxHp * .48)
        this.cooldowns.heal = 6; this.effect(p.x, p.y, 70, 0x8de1b7)
      }
      return
    }
    if (action === 'mana') {
      if (this.cooldowns.heal > 0 || p.qi >= playerStats(s).maxQi) return
      if (this.cb.mana?.()) {
        p.qi = Math.min(playerStats(s).maxQi, p.qi + 65)
        this.cooldowns.heal = 6; this.effect(p.x, p.y, 70, 0x87bdce)
      }
      return
    }
    if (action === 'support') {
      if (this.cooldowns.support > 0) return
      const support = teacherSupport(s)
      if (!support.available) { this.cb.notify(support.message); return }
      this.cooldowns.support = 25
      p.qi = Math.min(playerStats(s).maxQi, p.qi + 45)
      p.invincible = 1.4
      this.effect(p.x, p.y, 180, 0x9bd7cb)
      this.cb.notify(support.message)
      return
    }
    let amount = playerStats(s).attack, radius = 100, center: Vec = p, color = 0xdfc79a, cone = true
    if (action === 'attack') {
      if (this.attackCooldown > 0) return
      this.attackCooldown = .38
    } else {
      const skill = skillInfo.find(i => i.id === action)
      if (!skill) return
      if (!skillUnlocked(s, skill.id)) { this.cb.notify('此斗技尚未随剧情解锁。'); return }
      if (this.cooldowns[skill.id] > 0) return
      if (p.qi < skill.cost) { this.cb.notify('斗气不足，稍作走位等待恢复。'); return }
      p.qi -= skill.cost; this.cooldowns[skill.id] = skill.cooldown
      color = s.flame === 'lotus' ? 0x6de4bc : s.flame === 'star' ? 0xb59af5 : s.flame === 'pure' ? 0xf4c1d3 : 0xefb47d
      if (action === 'strike') { radius = 150; amount *= 2.5 }
      if (action === 'wave') { radius = 340; amount *= 2.8 }
      if (action === 'lotus') {
        radius = s.flame === 'pure' ? 250 : 190; amount *= 4.5; cone = false
        const d = Math.min(250, distance(p, target))
        center = { x: p.x + Math.cos(p.facing) * d, y: p.y + Math.sin(p.facing) * d }
      }
      if (s.flame === 'pure') amount *= 1.18
    }
    this.effect(center.x, center.y, radius, color, cone ? 'slash' : 'ring')
    this.cb.sound?.(action === 'attack' ? 'attack' : 'skill')
    const event = eventForChapter(this.chapter.id), progress = eventProgress(s, this.chapter.id)
    if (action === 'strike' && event?.dummy && progress.started && progress.stage === 0 && distance(p, event.dummy) <= radius + 20) {
      const angle = Math.atan2(event.dummy.y - p.y, event.dummy.x - p.x) - p.facing
      if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) <= 1.2) {
        this.cb.eventAction?.({ type: 'strike' })
        this.floats.push({ ...event.dummy, text: '八极崩 · 命中', time: 1, color: '#f4deb4' })
      }
    }
    for (const e of this.enemies) {
      if (e.hp <= 0 || distance(e, center) > radius + 20) continue
      const deltaAngle = Math.atan2(Math.sin(Math.atan2(e.y - p.y, e.x - p.x) - p.facing), Math.cos(Math.atan2(e.y - p.y, e.x - p.x) - p.facing))
      if (cone && Math.abs(deltaAngle) > (action === 'wave' ? .55 : 1.2)) continue
      this.hurtEnemy(e, damage(amount, e.duel && e.duel.recovery > 0 ? 1.15 : 1, this.chapter.id * 2), action === 'strike')
    }
  }
  private stepSect(e: Fighter, dt: number) {
    const sect = e.sect!, p = this.player
    sect.phase = e.hp / e.maxHp < .34 ? 3 : e.hp / e.maxHp < .67 ? 2 : 1
    if (sect.recovery > 0) { sect.recovery = Math.max(0, sect.recovery - dt); return }
    if (e.windup > 0) {
      e.windup -= dt
      if (e.windup <= 0) {
        for (const point of [e.target, ...(e.secondary ?? [])]) {
          if (distance(point, p) < e.radius + 16) this.hurtPlayer(78)
          this.effect(point.x, point.y, e.radius, 0xb7cbdf)
        }
        sect.recovery = sect.phase === 3 ? 1 : 1.4; e.timer = .6
      }
      return
    }
    e.timer -= dt
    if (e.timer > 0) return
    sect.sequence++; e.target = { x: p.x, y: p.y }
    const offsets = sect.phase === 1 ? [[-165, 0], [165, 0]] : sect.phase === 2
      ? [[-130, -130], [130, 130]] : [[-170, 0], [170, 0], [0, -170], [0, 170]]
    e.secondary = offsets.map(([x, y]) => ({ x: clamp(p.x + x, 65, WIDTH - 65), y: clamp(p.y + y, 65, HEIGHT - 65) }))
    e.radius = sect.phase === 3 ? 95 : 85; e.windup = sect.phase === 3 ? .85 : 1.15
  }
  private stepRanking(e: Fighter, dt: number) {
    const rank = e.ranking!, p = this.player
    rank.phase = e.hp / e.maxHp < .5 ? 2 : 1
    if (rank.recovery > 0) { rank.recovery = Math.max(0, rank.recovery - dt); return }
    if (e.windup > 0) {
      e.windup -= dt
      if (e.windup <= 0) {
        for (const point of [e.target, ...(e.secondary ?? [])]) {
          if (distance(point, p) < e.radius + 16) this.hurtPlayer(62)
          this.effect(point.x, point.y, e.radius, 0x86c9dc)
        }
        rank.recovery = rank.phase === 1 ? 1.2 : .9
        e.timer = .65
      }
      return
    }
    e.timer -= dt
    if (e.timer > 0) {
      const dist = distance(e, p)
      if (dist > 160) this.move(e, (p.x - e.x) / dist * dt * 100, (p.y - e.y) / dist * dt * 100)
      return
    }
    rank.sequence++
    e.target = { x: p.x, y: p.y }
    const diagonal = rank.sequence % 2 === 0
    const offsets = rank.phase === 1 ? [[-125, 0], [125, 0]] : diagonal ? [[-100, -100], [100, 100], [-100, 100], [100, -100]] : [[-135, 0], [135, 0], [0, -135], [0, 135]]
    e.secondary = offsets.map(([x, y]) => ({ x: clamp(p.x + x, 65, WIDTH - 65), y: clamp(p.y + y, 65, HEIGHT - 65) }))
    e.radius = rank.phase === 1 ? 58 : 62; e.windup = rank.phase === 1 ? 1.05 : .85
  }
  private stepDuel(e: Fighter, dt: number) {
    const duel = e.duel!, p = this.player
    duel.phase = e.hp / e.maxHp < .34 ? 3 : e.hp / e.maxHp < .67 ? 2 : 1
    if (duel.dashTime > 0) {
      const fraction = Math.min(1, dt / duel.dashTime)
      this.move(e, (e.target.x - e.x) * fraction, (e.target.y - e.y) * fraction)
      duel.dashTime = Math.max(0, duel.dashTime - dt)
      return
    }
    if (duel.recovery > 0) { duel.recovery = Math.max(0, duel.recovery - dt); return }
    if (e.windup > 0) {
      e.windup -= dt
      if (e.windup <= 0) {
        for (const point of [e.target, ...(e.secondary ?? [])]) {
          if (distance(point, p) < e.radius + 16) this.hurtPlayer(58)
          this.effect(point.x, point.y, e.radius, 0x9acbc4)
        }
        if (duel.move === 'thrust') duel.dashTime = .24
        duel.recovery = duel.move === 'cyclone' ? 1.25 : .85
        e.timer = duel.phase === 3 ? .55 : .8
      }
      return
    }
    e.timer -= dt
    if (e.timer > 0) {
      const d = distance(e, p)
      if (d > 150) this.move(e, (p.x - e.x) / d * dt * 105, (p.y - e.y) / d * dt * 105)
      return
    }
    duel.move = duel.phase === 1 ? 'thrust' : duel.phase === 2 ? (duel.sequence % 2 ? 'thrust' : 'fan') : (['cyclone', 'fan', 'thrust'] as const)[duel.sequence % 3]
    duel.sequence++; duel.origin = { x: e.x, y: e.y }
    const angle = Math.atan2(p.y - e.y, p.x - e.x), arena = this.map.duelArena!
    const bounded = (point: Vec) => ({ x: clamp(point.x, arena.x + 22, arena.x + arena.w - 22), y: clamp(point.y, arena.y + 22, arena.y + arena.h - 22) })
    if (duel.move === 'thrust') {
      const reach = clamp(distance(e, p), 100, 300)
      e.target = bounded({ x: e.x + Math.cos(angle) * reach, y: e.y + Math.sin(angle) * reach })
      e.secondary = [.33, .66].map(f => ({ x: e.x + (e.target.x - e.x) * f, y: e.y + (e.target.y - e.y) * f }))
      e.radius = 54; e.windup = .9
    } else if (duel.move === 'fan') {
      e.target = { x: p.x, y: p.y }
      e.secondary = [-110, 110].map(offset => bounded({ x: p.x - Math.sin(angle) * offset, y: p.y + Math.cos(angle) * offset }))
      e.radius = 68; e.windup = .85
    } else {
      e.target = { x: e.x, y: e.y }; e.secondary = []
      e.radius = 185; e.windup = 1.1
    }
  }
  step(input: Input, dt = 1 / 60) {
    this.elapsed += dt
    const p = this.player
    for (const key of Object.keys(this.cooldowns) as (keyof Runtime['cooldowns'])[]) this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt)
    this.attackCooldown = Math.max(0, this.attackCooldown - dt)
    p.invincible = Math.max(0, p.invincible - dt); p.hit = Math.max(0, p.hit - dt)
    this.effects = this.effects.filter(e => { e.time -= dt; return e.time > 0 })
    this.floats = this.floats.filter(f => { f.time -= dt; f.y -= dt * 26; return f.time > 0 })
    for (const h of this.herbs) if (!h.available) { h.respawn -= dt; if (h.respawn <= 0) h.available = true }
    if (p.hp <= 0) { if (this.siegeRun) this.siegeRun.channel = 0; return }
    const s = this.cb.state(), stats = playerStats(s)
    p.qi = Math.min(stats.maxQi, p.qi + dt * (s.flame === 'fallen' ? 11 : 6))
    p.stamina = Math.min(100, p.stamina + dt * 23)
    if (s.flame === 'star' && this.elapsed - this.lastHit > 3) p.hp = Math.min(stats.maxHp, p.hp + dt * stats.maxHp * .012)
    const length = Math.hypot(input.x, input.y)
    if (p.roll > 0) {
      p.roll -= dt
      this.move(p, this.rollDirection.x * dt * 670, this.rollDirection.y * dt * 670)
    } else if (length > .05) {
      this.move(p, input.x / Math.max(1, length) * dt * 235, input.y / Math.max(1, length) * dt * 235)
      p.facing = Math.atan2(input.y, input.x)
    }
    this.stepMountain(dt)
    this.stepFlame(dt)
    this.stepEscape(dt)
    this.stepSquad(dt)
    this.stepHuntTeam(dt)
    this.stepTower(dt)
    this.stepExpedition(dt)
    this.stepTomb(dt)
    this.stepPrison(dt)
    if (p.hp <= 0) return
    for (const e of [...this.enemies]) {
      if (e.hp <= 0) continue
      if (e.burn > 0) {
        e.burn -= dt; e.burnTick += dt
        if (e.burnTick >= .8) { e.burnTick = 0; this.hurtEnemy(e, Math.round(stats.attack * .2), false, false) }
      }
      if (e.hp <= 0) continue
      if (e.duel) { this.stepDuel(e, dt); continue }
      if (e.ranking) { this.stepRanking(e, dt); continue }
      if (e.sect) { this.stepSect(e, dt); continue }
      const ally = this.squad?.holding && this.squad.hp > 0 ? this.squad : this.huntTeam && this.huntTeam.hp > 0 ? this.huntTeam
        : this.prisonEscort && this.prisonEscort.hp > 0 ? this.prisonEscort : undefined
      const enemyTarget = ally && distance(e, ally) < distance(e, p) ? ally : p
      const dist = distance(e, enemyTarget)
      if (e.type !== 'boss' && distance(p, this.map.camp) < this.map.safeRadius) { e.windup = 0; e.timer = Math.max(e.timer, 1); e.alert = 0; continue }
      if (e.patrol && e.alert < 1) {
        const visible = dist < e.patrol.detectionRadius && hasLineOfSight(this.collisionMap(), e, p)
        e.alert = clamp(e.alert + dt * (visible ? .8 : -.45), 0, 1)
        if (e.alert < 1) {
          const target = e.patrol.route[e.patrolIndex], length = distance(e, target)
          if (length < 10) e.patrolIndex = (e.patrolIndex + 1) % e.patrol.route.length
          else this.move(e, (target.x - e.x) / length * dt * 80, (target.y - e.y) / length * dt * 80)
          e.windup = 0
          continue
        }
      }
      if (dist > (e.type === 'boss' ? 1100 : 370)) continue
      if (e.windup > 0) {
        e.windup -= dt
        if (e.windup <= 0) {
          for (const point of [e.target, ...(e.secondary ?? [])]) {
            if (distance(point, p) < e.radius + 16) this.hurtPlayer(12 + this.chapter.id * 2.4 + (e.type === 'boss' ? 13 : 0))
            this.effect(point.x, point.y, e.radius, 0xcf6452)
          }
          if (this.escort && this.escort.hp > 0 && [e.target, ...(e.secondary ?? [])].some(point => distance(point, this.escort!) < e.radius + 16)) {
            this.escort.hp = Math.max(0, this.escort.hp - damage(30, 1, 10))
            if (this.escort.hp === 0) this.cb.notify('采药同伴受伤倒下。已采药草保留，营地休整后从安全节点重试。')
          }
          if (this.squad?.holding && this.squad.hp > 0 && [e.target, ...(e.secondary ?? [])].some(point => distance(point, this.squad!) < e.radius + 16)) {
            this.squad.hp = Math.max(0, this.squad.hp - damage(30, 1, 10))
            if (this.squad.hp === 0) this.cb.notify('试炼同伴受伤，共鸣中断。休整可从已完成的集合节点重试。')
          }
          if (this.huntTeam && this.huntTeam.hp > 0 && [e.target, ...(e.secondary ?? [])].some(point => distance(point, this.huntTeam!) < e.radius + 16)) {
            this.huntTeam.hp = Math.max(0, this.huntTeam.hp - damage(30, 1, 10))
            if (this.huntTeam.hp === 0) this.cb.notify('猎捕队友受伤，当前路线中止。已领火能保留，休整后从最近集合节点重试。')
          }
          if (this.prisonEscort && this.prisonEscort.hp > 0 && [e.target, ...(e.secondary ?? [])].some(point => distance(point, this.prisonEscort!) < e.radius + 16)) {
            this.prisonEscort.hp = Math.max(0, this.prisonEscort.hp - damage(30, s.settings.difficulty === 'story' ? .7 : s.settings.difficulty === 'hard' ? 1.25 : 1, 10))
            if (this.prisonEscort.hp === 0) this.cb.notify('药老受伤倒下，撤离中断。已破禁节点保留，免费休整后从囚牢重试。')
          }
          if (e.type === 'boss' && this.chapter.pattern === 'dash') {
            e.x = clamp(e.target.x, 60, WIDTH - 60); e.y = clamp(e.target.y, 60, HEIGHT - 60)
          }
          if (e.type === 'boss' && this.chapter.pattern === 'storm' && this.enemies.filter(a => a.hp > 0).length < 5)
            this.spawn('hunter', clamp(e.x - 130, 70, WIDTH - 70), clamp(e.y + 90, 70, HEIGHT - 70))
          const phase = e.type === 'boss' ? (e.hp / e.maxHp < .35 ? .65 : e.hp / e.maxHp < .7 ? .82 : 1) : 1
          e.timer = (e.type === 'boss' ? 1.6 : 1.4) * phase
        }
        continue
      }
      e.timer -= dt
      const ranged = e.type === 'mage' || (e.type === 'boss' && ['volley', 'storm'].includes(this.chapter.pattern))
      if (e.timer <= 0 && (dist < 90 || ranged || e.type === 'boss')) {
        e.windup = e.type === 'boss' ? .95 : e.type === 'mage' ? .8 : .58
        e.target = ranged || e.type === 'boss' ? { x: enemyTarget.x, y: enemyTarget.y } : { x: e.x, y: e.y }
        e.radius = e.type === 'boss' ? (this.chapter.pattern === 'storm' ? 150 : this.chapter.pattern === 'dash' ? 100 : 135) : ranged ? 85 : 70
        const phase = e.hp / e.maxHp
        e.secondary = e.type === 'boss' && ['storm', 'volley'].includes(this.chapter.pattern) && phase < .7
          ? [{ x: clamp(p.x + 200, 65, WIDTH - 65), y: p.y }, ...(phase < .35 ? [{ x: clamp(p.x - 200, 65, WIDTH - 65), y: clamp(p.y + 140, 65, HEIGHT - 65) }] : [])] : []
      } else if (dist > (ranged ? 240 : 70)) {
        const speed = e.type === 'hunter' ? 135 : e.type === 'boss' ? 95 : 80
        this.move(e, (enemyTarget.x - e.x) / dist * dt * speed, (enemyTarget.y - e.y) / dist * dt * speed)
      }
    }
    this.chargeSquad(dt)
    this.chargeSiege(dt)
    if (p.hp > 0) this.stepDanLightning(dt)
    if (p.hp > 0) this.stepStar(dt)
  }
  nearEvent() {
    return eventsForChapter(this.chapter.id).map(e => e.kind === 'escort' && this.escort ? { ...e, npc: this.escort } : e)
      .filter(e => distance(this.player, e.npc) < 75).sort((a, b) => distance(this.player, a.npc) - distance(this.player, b.npc))[0]
  }
  near(): Runtime['near'] {
    const p = this.player
    if (this.nearEvent()) return 'event'
    if (eventsForChapter(this.chapter.id).some(e => e.checkpoints?.some(point => distance(p, point) < 75))) return 'checkpoint'
    if (distance(p, this.map.camp) < 110) return 'camp'
    if (this.herbs.some(h => h.available && distance(p, h) < 75)) return 'herb'
    if (distance(p, this.map.gate) < 115) return 'gate'
    return ''
  }
  runtime(): Runtime {
    const stats = playerStats(this.cb.state()), near = this.near()
    const boss = this.enemies.find(e => e.type === 'boss')
    const patrols = this.enemies.filter(e => e.hp > 0 && e.patrol), alert = Math.max(0, ...patrols.map(e => e.alert))
    return { x: Math.round(this.player.x), y: Math.round(this.player.y), hp: Math.round(this.player.hp), maxHp: stats.maxHp, qi: Math.round(this.player.qi),
      maxQi: stats.maxQi, stamina: Math.round(this.player.stamina), cooldowns: { ...this.cooldowns },
      near, prompt: near === 'event' ? `E · 与${this.nearEvent()!.speaker}交谈` : near === 'checkpoint' ? 'E · 查看线索 / 操作机关 / 交互路标' : near === 'camp' ? 'E · 营地休整 / 章节结算' : near === 'herb' ? 'E · 采集灵草' : near === 'gate' ? (this.map.rankingArena && this.cb.state().completed.includes(14) ? 'E · 开启强榜复练 · 胜利1火能' : this.cb.state().progress[this.chapter.id].boss ? '试炼已通过 · 返回营地结算' : this.map.trialMode === 'assessment' ? 'E · 提交公会审核' : this.map.trialMode === 'attunement' ? 'E · 确认火域收服' : 'E · 开启章节试炼') : '',
      bossHp: boss?.hp ?? 0, bossMaxHp: boss?.maxHp ?? 0, bossName: this.chapter.boss, dead: this.player.hp <= 0,
      escort: this.escort ? { hp: this.escort.hp, maxHp: this.escort.maxHp, failed: this.escort.hp <= 0, waiting: this.escort.waiting } : undefined,
      survival: this.survival ? { remaining: Math.max(0, Math.ceil(24 - this.survival.elapsed)), inZone: this.inSurvivalZone() } : undefined,
      patrol: patrols.length ? { alert: Math.round(alert * 100), alerted: alert >= 1, remaining: patrols.length } : undefined,
      heatChallenge: this.flameRun ? { phase: this.flameRun.phase, remaining: Math.max(0, Math.ceil(12 - this.flameRun.elapsed)), heat: Math.round(this.flameRun.heat), cooling: this.cooling(), inZone: this.inHeatZone(), failed: this.flameRun.failed } : undefined,
      duel: boss?.duel && boss.hp > 0 ? { phase: boss.duel.phase, move: { thrust: '踏风突进', fan: '三叠风刃', cyclone: '旋风回旋' }[boss.duel.move],
        warning: boss.windup > 0, recovery: boss.duel.recovery > 0 && boss.duel.dashTime <= 0 } : undefined,
      escape: this.escapeRun ? { stage: this.escapeRun.stage, remaining: Math.max(0, Math.ceil((this.map.escapeDurations?.[this.escapeRun.stage - 1] ?? 6) - this.escapeRun.elapsed)), sheltered: this.sheltered() } : undefined,
      huntTeam: this.huntTeam ? { hp: this.huntTeam.hp, maxHp: this.huntTeam.maxHp, failed: this.huntTeam.hp <= 0, waiting: this.huntTeam.waiting,
        arrived: this.huntTeam.hp > 0 && this.huntTeam.stage === 3 && distance(this.huntTeam, eventForChapter(this.chapter.id)!.npc) < 65 } : undefined,
      ranking: boss?.ranking && boss.hp > 0 ? { phase: boss.ranking.phase, shield: boss.windup > 0, recovery: boss.ranking.recovery > 0, practice: boss.ranking.practice } : undefined,
      tower: this.towerRun ? { floor: this.towerRun.phase, remaining: Math.max(0, Math.ceil(this.map.towerFloors![this.towerRun.phase - 1].duration - this.towerRun.elapsed)),
        heat: Math.round(this.towerRun.heat), failed: this.towerRun.failed, inZone: this.inTowerFloor(), cooling: this.towerCooling() } : undefined,
      siege: this.siegeRun ? { stage: this.siegeRun.stage, remaining: Math.max(0, Math.ceil(this.map.siegeDurations![this.siegeRun.stage - 1] - this.siegeRun.channel)),
        guards: this.guardsRemaining(eventForChapter(this.chapter.id)!.id, this.siegeRun.stage), channeling: this.siegeChanneling() } : undefined,
      sect: boss?.sect && boss.hp > 0 ? { phase: boss.sect.phase, shield: boss.windup > 0, recovery: boss.sect.recovery > 0 } : undefined,
      tomb: this.tombRun ? { stage: this.tombRun.stage, remaining: Math.max(0, Math.ceil(this.map.tombDurations![this.tombRun.stage - 1] - this.tombRun.elapsed)), failed: this.tombRun.failed } : undefined,
      prisonEscort: this.prisonEscort ? { hp: this.prisonEscort.hp, maxHp: this.prisonEscort.maxHp, waiting: this.prisonEscort.waiting,
        failed: this.prisonEscort.hp <= 0, arrived: this.prisonArrived() } : undefined,
      starChallenge: this.starRun ? { phase: this.starRun.phase, remaining: Math.max(0, Math.ceil(this.map.starTrial!.durations[this.starRun.phase - 2] - this.starRun.elapsed)),
        heat: Math.round(this.starRun.heat), inZone: this.inStarZone(), cooling: this.starCooling(), stable: this.starStable(), failed: this.starRun.failed } : undefined,
      danLightning: this.danLightning ? { remaining: Math.max(0, Math.ceil(this.map.lightningTrial!.duration - this.danLightning.elapsed)),
        inZone: this.inDanLightningZone(), phase: Math.min(3, 1 + Math.floor(this.danLightning.elapsed / 6)) } : undefined,
      expedition: this.expeditionRun ? { remaining: Math.max(0, Math.ceil(this.map.expeditionDuration! - this.expeditionRun.elapsed)),
        failed: this.expeditionRun.failed, collected: [1, 2, 4].filter(bit => eventProgress(this.cb.state()).score & bit).length } : undefined,
      squad: this.squad ? { hp: this.squad.hp, maxHp: this.squad.maxHp, holding: this.squad.holding, failed: this.squad.hp <= 0,
        waiting: this.squad.waiting, remaining: Math.max(0, Math.ceil(3 - this.squad.channel)), channeling: this.channeling() } : undefined }
  }
}
