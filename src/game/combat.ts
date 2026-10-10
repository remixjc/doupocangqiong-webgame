import type { Action, Chapter, GameState, Runtime } from '../core/model'
import { chapterReady, damage, playerStats, skillInfo, skillUnlocked } from '../core/rules'

export interface Vec { x: number; y: number }
export interface Obstacle { x: number; y: number; w: number; h: number }
export interface Fighter extends Vec {
  id: number; hp: number; maxHp: number; type: 'brute' | 'hunter' | 'mage' | 'boss'
  timer: number; windup: number; target: Vec; radius: number; burn: number; burnTick: number
}
export interface Herb extends Vec { available: boolean; respawn: number }
export interface Effect extends Vec { radius: number; time: number; maxTime: number; color: number; kind: 'ring' | 'slash' }
export interface Floating extends Vec { text: string; time: number; color: string }
export interface Input { x: number; y: number; aim?: Vec }
export interface CombatCallbacks {
  state: () => GameState; collect: () => void; kill: (boss: boolean) => void
  heal: () => boolean; mana?: () => boolean; camp: () => void; notify: (text: string) => void
}
export const WIDTH = 1280, HEIGHT = 800
export const camp = { x: 160, y: 640 }, gate = { x: 1090, y: 180 }
export const obstacles: Obstacle[] = [
  { x: 360, y: 140, w: 120, h: 80 }, { x: 540, y: 560, w: 90, h: 90 },
  { x: 860, y: 360, w: 130, h: 70 }, { x: 90, y: 350, w: 80, h: 80 },
]
export function collides(p: Vec, radius = 17): boolean {
  return obstacles.some(o => p.x > o.x - radius && p.x < o.x + o.w + radius
    && p.y > o.y - radius && p.y < o.y + o.h + radius)
}
function distance(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y) }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }

export class CombatWorld {
  player = { x: camp.x + 50, y: camp.y - 25, hp: 180, qi: 100, stamina: 100, facing: 0, invincible: 0, roll: 0, hit: 0 }
  enemies: Fighter[] = []
  herbs: Herb[] = [
    { x: 300, y: 550, available: true, respawn: 0 }, { x: 550, y: 300, available: true, respawn: 0 },
    { x: 740, y: 640, available: true, respawn: 0 }, { x: 1080, y: 500, available: true, respawn: 0 },
    { x: 850, y: 220, available: true, respawn: 0 }, { x: 250, y: 200, available: true, respawn: 0 },
  ]
  effects: Effect[] = []
  floats: Floating[] = []
  cooldowns: Runtime['cooldowns'] = { strike: 0, wave: 0, lotus: 0, dodge: 0, heal: 0, support: 0 }
  attackCooldown = 0
  elapsed = 0
  private nextId = 1
  private lastHit = -10
  private bossSpawned = false
  private rollDirection: Vec = { x: 1, y: 0 }
  constructor(readonly chapter: Chapter, private cb: CombatCallbacks) {
    const stats = playerStats(cb.state())
    this.player.hp = stats.maxHp
    this.player.qi = stats.maxQi
    this.spawn('brute', 550, 470)
    this.spawn('hunter', 740, 360)
    this.spawn('mage', 1020, 610)
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
    if (!collides({ x: nx, y: p.y })) p.x = nx
    if (!collides({ x: p.x, y: ny })) p.y = ny
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
    this.floats.push({ x: this.player.x, y: this.player.y - 48, text: `−${hit}`, time: .8, color: '#ef9583' })
  }
  private aim(input: Input): Vec {
    if (input.aim) return input.aim
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
      if (near === 'herb') {
        const herb = this.herbs.find(h => h.available && distance(h, p) < 75)!
        herb.available = false; herb.respawn = 22
        this.cb.collect(); this.effect(herb.x, herb.y, 36, 0x8ee4b3)
      } else if (near === 'camp') {
        this.cb.camp()
      } else if (near === 'gate') {
        if (s.progress[s.chapter].boss) this.cb.notify('本章试炼已通过，返回左下营地结算。')
        else if (!chapterReady(s)) this.cb.notify('先完成采集、普通战和炼药目标，再开启试炼。')
        else if (!this.bossSpawned) {
          this.spawn('boss', gate.x - 70, gate.y + 80); this.bossSpawned = true
          this.cb.notify(`${this.chapter.boss} · 注意脚下的攻击预警`)
        } else this.cb.notify('试炼正在进行。')
      } else this.cb.notify('靠近药草、营地或右上方试炼碑后交互。')
      return
    }
    if (action === 'dodge') {
      if (this.cooldowns.dodge > 0 || p.stamina < 28) return
      this.rollDirection = Math.hypot(input.x, input.y) > .1
        ? { x: input.x / Math.hypot(input.x, input.y), y: input.y / Math.hypot(input.x, input.y) }
        : { x: Math.cos(p.facing), y: Math.sin(p.facing) }
      p.stamina -= 28; p.roll = .22; p.invincible = .28; this.cooldowns.dodge = .7
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
      if (dist > (e.type === 'boss' ? 1100 : 370)) continue
      if (e.windup > 0) {
        e.windup -= dt
        if (e.windup <= 0) {
          if (distance(e.target, p) < e.radius + 16) this.hurtPlayer(12 + this.chapter.id * 2.4 + (e.type === 'boss' ? 13 : 0))
          this.effect(e.target.x, e.target.y, e.radius, 0xcf6452)
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
      } else if (dist > (ranged ? 240 : 70)) {
        const speed = e.type === 'hunter' ? 135 : e.type === 'boss' ? 95 : 80
        this.move(e, (p.x - e.x) / dist * dt * speed, (p.y - e.y) / dist * dt * speed)
      }
    }
  }
  near(): Runtime['near'] {
    const p = this.player
    if (distance(p, camp) < 110) return 'camp'
    if (this.herbs.some(h => h.available && distance(p, h) < 75)) return 'herb'
    if (distance(p, gate) < 115) return 'gate'
    return ''
  }
  runtime(): Runtime {
    const stats = playerStats(this.cb.state()), near = this.near()
    const boss = this.enemies.find(e => e.type === 'boss')
    return { hp: Math.round(this.player.hp), maxHp: stats.maxHp, qi: Math.round(this.player.qi),
      maxQi: stats.maxQi, stamina: Math.round(this.player.stamina), cooldowns: { ...this.cooldowns },
      near, prompt: near === 'camp' ? 'E · 营地休整 / 章节结算' : near === 'herb' ? 'E · 采集灵草' : near === 'gate' ? 'E · 开启章节试炼' : '',
      bossHp: boss?.hp ?? 0, bossMaxHp: boss?.maxHp ?? 0, bossName: this.chapter.boss, dead: this.player.hp <= 0 }
  }
}
