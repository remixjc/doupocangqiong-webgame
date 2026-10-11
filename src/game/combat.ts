import type { Action, Chapter, GameState, Runtime } from '../core/model'
import { chapterReady, damage, playerStats, skillInfo, skillUnlocked } from '../core/rules'
import { mapForChapter, mapCollides, MAP_WIDTH, MAP_HEIGHT } from '../content/maps'
import { eventForChapter, eventsForChapter } from '../content/events'
import { eventProgress, type EventAction } from '../core/events'

export interface Vec { x: number; y: number }
export interface Obstacle { x: number; y: number; w: number; h: number }
export interface Fighter extends Vec {
  id: number; hp: number; maxHp: number; type: 'brute' | 'hunter' | 'mage' | 'boss'
  timer: number; windup: number; target: Vec; radius: number; burn: number; burnTick: number
  secondary?: Vec[]
}
export interface Herb extends Vec { available: boolean; respawn: number }
export interface Effect extends Vec { radius: number; time: number; maxTime: number; color: number; kind: 'ring' | 'slash' }
export interface Floating extends Vec { text: string; time: number; color: string }
export interface Input { x: number; y: number; aim?: Vec }
export interface CombatCallbacks {
  state: () => GameState; collect: () => void; kill: (boss: boolean) => void
  heal: () => boolean; mana?: () => boolean; camp: () => void; notify: (text: string) => void
  sound?: (kind: 'attack' | 'skill' | 'dodge' | 'hurt' | 'collect' | 'victory') => void
  storyEvent?: (id: string, checkpoint?: number) => void
  eventAction?: (action: EventAction) => void
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
    for (const enemy of this.map.enemies.slice(0, Math.max(3, chapter.objectives.kills))) this.spawn(enemy.type, enemy.x, enemy.y)
  }
  spawn(type: Fighter['type'], x: number, y: number) {
    const d = this.cb.state().settings.difficulty
    const scale = d === 'story' ? 0.72 : d === 'hard' ? 1.25 : 1
    const hp = Math.round((type === 'boss' ? 280 + this.chapter.id * 46 : 48 + this.chapter.id * 6) * scale)
    this.enemies.push({ id: this.nextId++, x, y, hp, maxHp: hp, type, timer: type === 'boss' ? 1.8 : 1,
      windup: 0, target: { x, y }, radius: 0, burn: 0, burnTick: 0 })
  }
  private move(p: Vec, vx: number, vy: number) {
    const nx = clamp(p.x + vx, 40, WIDTH - 40)
    const ny = clamp(p.y + vy, 45, HEIGHT - 40)
    const map = this.collisionMap()
    if (!mapCollides(map, { x: nx, y: p.y })) p.x = nx
    if (!mapCollides(map, { x: p.x, y: ny })) p.y = ny
  }
  private effect(x: number, y: number, radius: number, color: number, kind: Effect['kind'] = 'ring') {
    this.effects.push({ x, y, radius, color, kind, time: .36, maxTime: .36 })
  }
  private hurtEnemy(e: Fighter, amount: number, interrupt = false, applyBurn = true) {
    if (e.hp <= 0) return
    e.hp = Math.max(0, e.hp - amount)
    this.floats.push({ x: e.x, y: e.y - 40, text: String(amount), time: .65, color: '#f4deb4' })
    if (interrupt && e.type !== 'boss') { e.windup = 0; e.timer = 1.4 }
    if (applyBurn && this.cb.state().flame === 'lotus') e.burn = 3
    if (e.hp === 0) {
      this.effect(e.x, e.y, e.type === 'boss' ? 110 : 40, 0xd4bb87)
      this.cb.kill(e.type === 'boss')
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
      if (near === 'event') this.cb.storyEvent?.(this.nearEvent()!.id)
      else if (near === 'checkpoint') {
        const event = eventsForChapter(this.chapter.id).find(e => e.checkpoints?.some(point => distance(p, point) < 75))!
        const index = event.checkpoints!.findIndex(point => distance(p, point) < 75)
        if (event.kind === 'cave' && index === 1) {
          if (!eventProgress(s, this.chapter.id, event.id).started) this.cb.notify('先到洞口与小医仙交谈，再探索机关。')
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
        if (s.progress[s.chapter].boss) this.cb.notify('本章试炼已通过，返回左下营地结算。')
        else if (!chapterReady(s)) this.cb.notify('先完成左侧本章历练与剧情事件，再开启试炼。')
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
      if (s.completed.includes(16) && !s.completed.includes(22)) { this.cb.notify('药老暂时离队，无法支援。'); return }
      if (s.completed.length < 2) { this.cb.notify('完成前两章后解锁药老支援。'); return }
      this.cooldowns.support = 25
      p.qi = Math.min(playerStats(s).maxQi, p.qi + 45)
      p.invincible = 1.4
      this.effect(p.x, p.y, 180, 0x9bd7cb)
      this.cb.notify('药老支援 · 斗气恢复与短暂护体')
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
      this.hurtEnemy(e, damage(amount, 1, this.chapter.id * 2), action === 'strike')
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
    if (p.hp <= 0) return
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
    for (const e of [...this.enemies]) {
      if (e.hp <= 0) continue
      if (e.burn > 0) {
        e.burn -= dt; e.burnTick += dt
        if (e.burnTick >= .8) { e.burnTick = 0; this.hurtEnemy(e, Math.round(stats.attack * .2), false, false) }
      }
      if (e.hp <= 0) continue
      const dist = distance(e, p)
      if (e.type !== 'boss' && distance(p, this.map.camp) < this.map.safeRadius) { e.windup = 0; e.timer = Math.max(e.timer, 1); continue }
      if (dist > (e.type === 'boss' ? 1100 : 370)) continue
      if (e.windup > 0) {
        e.windup -= dt
        if (e.windup <= 0) {
          for (const point of [e.target, ...(e.secondary ?? [])]) {
            if (distance(point, p) < e.radius + 16) this.hurtPlayer(12 + this.chapter.id * 2.4 + (e.type === 'boss' ? 13 : 0))
            this.effect(point.x, point.y, e.radius, 0xcf6452)
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
        e.target = ranged || e.type === 'boss' ? { x: p.x, y: p.y } : { x: e.x, y: e.y }
        e.radius = e.type === 'boss' ? (this.chapter.pattern === 'storm' ? 150 : this.chapter.pattern === 'dash' ? 100 : 135) : ranged ? 85 : 70
        const phase = e.hp / e.maxHp
        e.secondary = e.type === 'boss' && ['storm', 'volley'].includes(this.chapter.pattern) && phase < .7
          ? [{ x: clamp(p.x + 200, 65, WIDTH - 65), y: p.y }, ...(phase < .35 ? [{ x: clamp(p.x - 200, 65, WIDTH - 65), y: clamp(p.y + 140, 65, HEIGHT - 65) }] : [])] : []
      } else if (dist > (ranged ? 240 : 70)) {
        const speed = e.type === 'hunter' ? 135 : e.type === 'boss' ? 95 : 80
        this.move(e, (p.x - e.x) / dist * dt * speed, (p.y - e.y) / dist * dt * speed)
      }
    }
  }
  nearEvent() {
    return eventsForChapter(this.chapter.id).filter(e => distance(this.player, e.npc) < 75).sort((a, b) => distance(this.player, a.npc) - distance(this.player, b.npc))[0]
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
    return { x: Math.round(this.player.x), y: Math.round(this.player.y), hp: Math.round(this.player.hp), maxHp: stats.maxHp, qi: Math.round(this.player.qi),
      maxQi: stats.maxQi, stamina: Math.round(this.player.stamina), cooldowns: { ...this.cooldowns },
      near, prompt: near === 'event' ? `E · 与${this.nearEvent()!.speaker}交谈` : near === 'checkpoint' ? 'E · 查看线索 / 操作机关 / 交互路标' : near === 'camp' ? 'E · 营地休整 / 章节结算' : near === 'herb' ? 'E · 采集灵草' : near === 'gate' ? (this.cb.state().progress[this.chapter.id].boss ? '试炼已通过 · 返回营地结算' : 'E · 开启章节试炼') : '',
      bossHp: boss?.hp ?? 0, bossMaxHp: boss?.maxHp ?? 0, bossName: this.chapter.boss, dead: this.player.hp <= 0 }
  }
}
