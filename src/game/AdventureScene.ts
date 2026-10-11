import Phaser from 'phaser'
import { gameStore } from '../core/store'
import { chapterById } from '../content/chapters'
import { CombatWorld, HEIGHT, WIDTH, type Input } from './combat'
import { eventsForChapter } from '../content/events'
import { eventProgress } from '../core/events'
import type { Action } from '../core/model'
import { playSound } from './audio'
import { FixedClock } from './clock'

const palette = {
  city: [0x263831, 0x70816a, 0xb69a6e], forest: [0x213b33, 0x46735b, 0x8eb190],
  desert: [0x665943, 0x958164, 0xd9b884], temple: [0x303936, 0x6a7770, 0xc0baa1],
  void: [0x252b42, 0x5b5884, 0xb3a3d1], fire: [0x493238, 0x7e514c, 0xd39b79],
}
export default class AdventureScene extends Phaser.Scene {
  world!: CombatWorld
  private ink!: Phaser.GameObjects.Graphics
  private floats!: Phaser.GameObjects.Text[]
  private heldKeys = new Set<string>()
  private clock = new FixedClock()
  private runtimeTimer = 0
  private aim: { x: number; y: number } | undefined
  private lostFocus = false
  constructor() { super('adventure') }
  create() {
    const chapter = chapterById(gameStore.getSnapshot().state.chapter)
    this.world = new CombatWorld(chapter, {
      state: () => gameStore.getSnapshot().state,
      collect: () => gameStore.collect(), kill: boss => gameStore.kill(boss), rankPractice: () => gameStore.rankPractice(),
      heal: () => {
        if (gameStore.getSnapshot().state.inventory.heal < 1) { gameStore.notify('恢复丹不足，返回营地炼制或购买。'); return false }
        gameStore.update(s => { s.inventory.heal-- })
        return true
      },
      mana: () => {
        if (gameStore.getSnapshot().state.inventory.mana < 1) { gameStore.notify('回气丹不足。'); return false }
        gameStore.update(s => { s.inventory.mana-- })
        return true
      },
      camp: () => gameStore.onInteract?.(), notify: message => gameStore.notify(message), sound: playSound,
      storyEvent: (id, checkpoint) => gameStore.onStoryEvent?.(id, checkpoint), eventAction: action => { gameStore.event(action) },
    })
    this.drawEnvironment()
    this.ink = this.add.graphics()
    this.floats = Array.from({ length: 30 }, () => this.add.text(0, 0, '', {
      fontFamily: 'Microsoft YaHei, sans-serif', fontSize: '18px', fontStyle: 'bold', stroke: '#162525', strokeThickness: 4,
    }).setOrigin(.5).setDepth(10))
    const keydown = (event: KeyboardEvent) => {
      if (gameStore.paused || event.ctrlKey || event.altKey || event.metaKey) return
      if (event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return
      if (!document.hidden) this.lostFocus = false
      const key = event.key.toLowerCase()
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault()
      this.heldKeys.add(key)
      if (event.repeat) return
      const map: Record<string, Action> = { j: 'attack', ' ': 'dodge', '1': 'strike', '2': 'wave', '3': 'lotus', q: 'heal', f: 'mana', e: 'interact', r: 'support' }
      const action = map[key]
      if (action) gameStore.action(action)
    }
    const keyup = (event: KeyboardEvent) => {
      this.heldKeys.delete(event.key.toLowerCase())
    }
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!document.hidden) this.lostFocus = false
      if (pointer.event instanceof MouseEvent && pointer.event.button === 0) {
        this.aim = { x: pointer.worldX, y: pointer.worldY }
        gameStore.action('attack')
      }
    })
    const blur = () => { this.lostFocus = true; this.heldKeys.clear(); gameStore.move = { x: 0, y: 0 }; gameStore.actions.length = 0 }
    const focus = () => { this.lostFocus = false }
    window.addEventListener('blur', blur); window.addEventListener('focus', focus)
    const releaseInput = () => {
      window.removeEventListener('blur', blur); window.removeEventListener('focus', focus)
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup)
      this.heldKeys.clear()
    }
    this.events.once('shutdown', releaseInput)
    this.events.once('destroy', releaseInput)
    gameStore.runtime(this.world.runtime())
  }
  private drawEnvironment() {
    const { camp, gate, obstacles, style } = this.world.map
    const c = style === 'cave' ? [0x222d2b, 0x52645b, 0xb3a785] : style === 'thunder-path' ? [0x263139, 0x566575, 0xacc7cd]
      : style === 'star-pavilion' ? [0x243735, 0x547b6d, 0xb9c3a1] : ['fire-cavern', 'fire-tower'].includes(style) ? [0x3a3030, 0x78614e, 0xd39b74] : palette[this.world.chapter.theme]
    const bg = this.add.graphics()
    bg.fillStyle(c[0]); bg.fillRect(0, 0, WIDTH, HEIGHT)
    if (style === 'sect') {
      bg.lineStyle(2, 0xc2b99b, .18)
      for (let y = 130; y < 360; y += 24) bg.lineBetween(1000, y, 1210, y)
    } else if (style === 'alliance') {
      for (const x of [670, 750]) {
        bg.lineStyle(3, 0xb69b75, .7); bg.lineBetween(x, 90, x, 190)
        bg.fillStyle(0x9e6f51, .65); bg.fillTriangle(x, 95, x + 45, 125, x, 150)
      }
    } else if (style === 'thunder-path') {
      bg.lineStyle(4, 0xabcbd7, .22); bg.lineBetween(775, 75, 745, 135); bg.lineBetween(745, 135, 785, 135); bg.lineBetween(785, 135, 750, 200)
    } else if (style === 'star-pavilion') {
      bg.lineStyle(2, 0xb9c3a1, .16); bg.strokeCircle(1080, 220, 105); bg.strokeCircle(1080, 220, 120)
      for (let index = 0; index < 8; index++) { const angle = index * Math.PI / 4; bg.fillStyle(0xcdd0b2, .45); bg.fillCircle(1080 + Math.cos(angle) * 120, 220 + Math.sin(angle) * 120, 4) }
    }
    // All art is native vector drawing, seeded by chapter for repeatable maps.
    let seed = this.world.chapter.id * 117 + 42
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
    for (let i = 0; i < 420; i++) {
      const x = rand() * WIDTH, y = rand() * HEIGHT
      bg.fillStyle(i % 2 ? c[1] : 0x0b1c1b, .08 + rand() * .14)
      bg.fillEllipse(x, y, 3 + rand() * 12, 2 + rand() * 5)
    }
    if (this.world.chapter.theme === 'desert') {
      for (let i = 0; i < 14; i++) {
        bg.lineStyle(2, 0xdac08c, .12)
        bg.beginPath(); bg.arc(rand() * WIDTH, rand() * HEIGHT, 110 + rand() * 160, Math.PI * .12, Math.PI * .88); bg.strokePath()
      }
    }
    if (this.world.chapter.theme === 'void') {
      for (let i = 0; i < 120; i++) { bg.fillStyle(0xc7bedf, .1 + rand() * .3); bg.fillCircle(rand() * WIDTH, rand() * HEIGHT, 1 + rand()) }
      bg.lineStyle(1, c[2], .12); bg.strokeCircle(650, 410, 300); bg.strokeCircle(650, 410, 335)
    }
    if (this.world.chapter.theme === 'fire') {
      for (let i = 0; i < 15; i++) {
        const x = rand() * WIDTH, y = rand() * HEIGHT
        bg.fillStyle(0xd78154, .11); bg.fillEllipse(x, y, 80 + rand() * 130, 25 + rand() * 55)
        bg.lineStyle(2, 0xf2b879, .12); bg.lineBetween(x, y, x + 100, y + 38)
      }
    }
    if (style === 'courtyard' || style === 'market' || style === 'guild' || style === 'desert-town' || style === 'tournament' || style === 'duel' || style === 'auction') {
      bg.lineStyle(1, c[2], .08)
      for (let x = 40; x < WIDTH; x += 40) bg.lineBetween(x, 40, x, HEIGHT - 40)
      for (let y = 40; y < HEIGHT; y += 40) bg.lineBetween(40, y, WIDTH - 40, y)
    }
    for (const points of this.world.map.paths) {
    const path = new Phaser.Curves.Path(points[0].x, points[0].y)
    for (const point of points.slice(1)) path.lineTo(point.x, point.y)
    bg.lineStyle(85, c[1], .16); path.draw(bg)
    bg.lineStyle(55, c[2], .1); path.draw(bg)
    for (let i = 0; i < 95; i++) {
      const t = rand(), point = path.getPoint(t), x = point.x + (rand() - .5) * 50, y = point.y + (rand() - .5) * 50
      bg.fillStyle(c[2], .12); bg.fillEllipse(x, y, 12 + rand() * 14, 7)
    }
    if (style === 'tournament') {
      for (const [i, x] of [580, 850, 1100].entries()) {
        bg.lineStyle(3, [0x88beaa, 0xc7b483, 0xcda0a4][i], .5); bg.strokeCircle(x, 400, 70)
        bg.fillStyle(0x182824, .5); bg.fillCircle(x, 400, 50)
        this.add.text(x, 470, ['初赛 · 25 / 55 / 45', '复赛 · 65 / 40 / 70', '决赛 · 35 / 75 / 50'][i],
          { fontSize: '14px', color: '#cebd98', fontFamily: 'serif' }).setOrigin(.5)
      }
    }
    }
    for (let i = 0; i < (style === 'cave' ? 10 : 48); i++) {
      const x = rand() * WIDTH, y = rand() > .5 ? rand() * 120 + 30 : 710 + rand() * 60
      this.tree(bg, x, y, .7 + rand() * .8, c)
    }
    for (const o of obstacles) {
      bg.fillStyle(0x0a1715, .28); bg.fillEllipse(o.x + o.w * .55, o.y + o.h, o.w + 35, o.h * .65)
      bg.fillStyle(c[1], .95); bg.fillRoundedRect(o.x, o.y, o.w, o.h, 18)
      bg.fillStyle(c[2], .14); bg.fillTriangle(o.x + 10, o.y + 12, o.x + o.w - 15, o.y + 8, o.x + 25, o.y + o.h * .5)
      if (style !== 'cave' && this.world.chapter.theme === 'forest') this.tree(bg, o.x + o.w * .7, o.y + 25, .9, c)
      if (style === 'cave') {
        bg.lineStyle(2, 0xc5b991, .25)
        bg.lineBetween(o.x + o.w * .25, o.y + 8, o.x + o.w * .6, o.y + o.h * .45)
        bg.lineBetween(o.x + o.w * .6, o.y + o.h * .45, o.x + o.w * .4, o.y + o.h - 8)
      } else if (style === 'desert-town') {
        bg.fillStyle(0xc5ab7e, .5); bg.fillRect(o.x - 6, o.y - 8, o.w + 12, 22)
        bg.fillStyle(0x413c32); bg.fillRoundedRect(o.x + o.w / 2 - 17, o.y + 28, 34, 45, 10)
      } else if (style === 'market' || style === 'auction') {
        bg.fillStyle(0x987b56); bg.fillRect(o.x, o.y, o.w, 30)
        for (let x = o.x; x < o.x + o.w; x += 24) {
          bg.fillStyle(Math.floor((x - o.x) / 24) % 2 ? 0x587975 : 0xb4a17b)
          bg.fillRect(x, o.y, Math.min(24, o.x + o.w - x), 30)
        }
        bg.fillStyle(0xd0b889, .7); bg.fillCircle(o.x + 30, o.y + 55, 10); bg.fillCircle(o.x + 65, o.y + 55, 10)
      } else if (this.world.chapter.theme === 'city' || this.world.chapter.theme === 'temple') {
        bg.fillStyle(0x172622); bg.fillTriangle(o.x - 15, o.y + 8, o.x + o.w / 2, o.y - 45, o.x + o.w + 15, o.y + 8)
        bg.lineStyle(2, c[2], .6); bg.lineBetween(o.x - 15, o.y + 8, o.x + o.w + 15, o.y + 8)
        bg.fillStyle(c[2], .65); bg.fillRect(o.x + o.w / 2 - 9, o.y + 15, 18, 26)
      }
    }
    // A small roofed camp, ink silhouettes and a bronze trial platform.
    bg.fillStyle(0x0a1717, .4); bg.fillEllipse(camp.x, camp.y + 35, 150, 60)
    bg.fillStyle(0x423c2f); bg.fillRect(camp.x - 47, camp.y - 45, 94, 60)
    bg.fillStyle(0x171f21); bg.fillTriangle(camp.x - 72, camp.y - 38, camp.x, camp.y - 85, camp.x + 72, camp.y - 38)
    bg.lineStyle(3, c[2], .6); bg.lineBetween(camp.x - 72, camp.y - 38, camp.x + 72, camp.y - 38)
    bg.fillStyle(0xc6a372, .8); bg.fillRect(camp.x - 12, camp.y - 25, 24, 33)
    bg.lineStyle(3, c[2], .5); bg.strokeCircle(gate.x, gate.y, 54)
    bg.fillStyle(0x182423); bg.fillRoundedRect(gate.x - 18, gate.y - 55, 36, 55, 6)
    bg.lineStyle(1, c[2], .85); bg.strokeRoundedRect(gate.x - 18, gate.y - 55, 36, 55, 6)
    this.add.text(camp.x, camp.y + 50, '营 地', { fontSize: '16px', color: '#d8c4a0', fontFamily: 'serif' }).setOrigin(.5)
    this.add.text(gate.x, gate.y + 65, this.world.map.gateLabel ?? '试 炼 碑', { fontSize: '16px', color: '#d8c4a0', fontFamily: 'serif' }).setOrigin(.5)
    this.add.text(gate.x, gate.y - 29, this.world.map.trialMode === 'assessment' ? '审' : this.world.map.trialMode === 'attunement' ? '火' : '试', { fontSize: '19px', color: '#c6b588', fontFamily: 'serif' }).setOrigin(.5)
    this.add.text(50, 35, this.world.chapter.location, { fontSize: '20px', color: '#cbd1b7', fontFamily: 'serif' }).setAlpha(.8)
    for (const point of this.world.map.landmarks) this.add.text(point.x, point.y, point.label, { fontSize: '16px', color: '#cbd1b7' }).setOrigin(.5)
    for (const event of eventsForChapter(this.world.chapter.id)) {
      this.add.text(event.npc.x, event.npc.y - 55, event.speaker, { fontSize: '17px', color: '#b5ded4' }).setOrigin(.5)
      if (event.dummy) this.add.text(event.dummy.x, event.dummy.y + 35, '木桩 · 1 斗技 / 空格闪避', { fontSize: '14px', color: '#d8c4a0' }).setOrigin(.5)
      event.checkpoints?.forEach((point, index) => this.add.text(point.x, point.y + 35, `${index + 1} · ${point.label}`, { fontSize: '15px', color: '#d8c4a0' }).setOrigin(.5))
    }
    bg.lineStyle(2, c[2], .15); bg.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56)
  }
  private tree(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, c: number[]) {
    if (this.world.chapter.theme === 'void' || this.world.chapter.theme === 'fire') {
      g.fillStyle(c[1], .65); g.fillTriangle(x - 18 * scale, y, x + 3 * scale, y - 60 * scale, x + 24 * scale, y)
      g.fillStyle(c[2], .3); g.fillTriangle(x + 3 * scale, y - 60 * scale, x + 24 * scale, y, x + 3 * scale, y - 4 * scale)
      return
    }
    if (this.world.chapter.theme === 'city' || this.world.chapter.theme === 'temple') {
      g.fillStyle(0x142622, .45); g.fillEllipse(x, y + 6, 45 * scale, 17 * scale)
      g.fillStyle(c[1], .9); g.fillRect(x - 7 * scale, y - 60 * scale, 14 * scale, 60 * scale)
      g.fillStyle(c[2], .45); g.fillRect(x - 16 * scale, y - 65 * scale, 32 * scale, 9 * scale)
      g.fillStyle(0x172622); g.fillTriangle(x - 24 * scale, y - 66 * scale, x, y - 83 * scale, x + 24 * scale, y - 66 * scale)
      return
    }
    if (this.world.chapter.theme === 'desert') {
      g.lineStyle(7 * scale, c[1], .85); g.lineBetween(x, y, x, y - 45 * scale)
      g.lineBetween(x, y - 25 * scale, x + 18 * scale, y - 35 * scale); return
    }
    g.fillStyle(0x091b19, .28); g.fillEllipse(x + 8, y + 5, 90 * scale, 30 * scale)
    g.fillStyle(0x3d3b2d); g.fillRect(x - 3 * scale, y - 40 * scale, 6 * scale, 47 * scale)
    for (let i = 0; i < 3; i++) {
      g.fillStyle(i % 2 ? c[1] : 0x244c40, .85)
      const yy = y - i * 24 * scale, ww = (45 - i * 10) * scale
      g.fillTriangle(x - ww, yy, x, yy - 64 * scale, x + ww, yy)
    }
  }
  update(_time: number, delta: number) {
    if (!this.world) return
    const paused = gameStore.paused || this.lostFocus || document.hidden
    if (paused) { this.clock.reset(); this.heldKeys.clear(); gameStore.actions.length = 0; this.drawActors(); return }
    const input: Input = {
      x: (Number(this.heldKeys.has('d') || this.heldKeys.has('arrowright')) - Number(this.heldKeys.has('a') || this.heldKeys.has('arrowleft'))) + gameStore.move.x,
      y: (Number(this.heldKeys.has('s') || this.heldKeys.has('arrowdown')) - Number(this.heldKeys.has('w') || this.heldKeys.has('arrowup'))) + gameStore.move.y,
      aim: this.aim,
    }
    for (const action of gameStore.actions.splice(0)) this.world.action(action, input)
    if (this.heldKeys.has('j') && this.world.attackCooldown <= 0) this.world.action('attack', input)
    this.aim = undefined
    this.clock.advance(delta, () => this.world.step(input))
    this.runtimeTimer += delta
    if (this.runtimeTimer >= 100) { gameStore.runtime(this.world.runtime()); this.runtimeTimer = 0 }
    this.drawActors()
  }
  private drawActors() {
    const g = this.ink
    g.clear()
    const w = this.world, p = w.player
    const { gate } = w.map
    if (w.map.duelArena) {
      const a = w.map.duelArena, active = w.enemies.some(e => e.duel && e.hp > 0)
      g.fillStyle(0x90bab0, .035); g.fillRect(a.x, a.y, a.w, a.h)
      g.lineStyle(active ? 4 : 2, active ? 0xa3ded2 : 0xafbcaa, active ? .8 : .4); g.strokeRect(a.x, a.y, a.w, a.h)
      g.lineStyle(1, 0xacbba5, .25); g.strokeCircle(a.x + a.w / 2, a.y + a.h / 2, 180)
    }
    if (w.map.escapeRoute) {
      const event = eventsForChapter(w.chapter.id).find(e => e.kind === 'escape')!
      const shelterRadius = w.map.thunderRoute ? 110 : 90
      for (const point of event.checkpoints!.slice(1, 3)) {
        g.fillStyle(0x80c7b0, .07); g.fillCircle(point.x, point.y, shelterRadius)
        g.lineStyle(2, 0x92caba, .45); g.strokeCircle(point.x, point.y, shelterRadius)
      }
      for (const warning of w.escapeRun?.warnings ?? []) {
        g.fillStyle(0xa194bf, .16); g.fillCircle(warning.x, warning.y, warning.radius)
        g.lineStyle(3, 0xc8b3da, .8); g.strokeCircle(warning.x, warning.y, warning.radius)
        if (w.map.thunderRoute) {
          g.lineStyle(2, 0xd1e7f3, .9)
          g.lineBetween(warning.x + 5, warning.y - 20, warning.x - 8, warning.y)
          g.lineBetween(warning.x - 8, warning.y, warning.x + 8, warning.y)
          g.lineBetween(warning.x + 8, warning.y, warning.x - 5, warning.y + 20)
        }
      }
    }
    if (w.squad) {
      const e = eventsForChapter(w.chapter.id).find(e => e.kind === 'squad')!
      for (const point of e.checkpoints!.slice(1)) {
        g.fillStyle(0x81c7ba, .08); g.fillCircle(point.x, point.y, 65)
        g.lineStyle(3, w.channeling() ? 0xc8daa0 : 0x92cabd, .5); g.strokeCircle(point.x, point.y, 65)
      }
      this.actor(g, w.squad.x, w.squad.y, w.squad.hp > 0 ? 0x7f9aa9 : 0x775c58, .95, false)
      g.fillStyle(0x0b1718); g.fillRect(w.squad.x - 25, w.squad.y - 52, 50, 6)
      g.fillStyle(0x86c9b1); g.fillRect(w.squad.x - 25, w.squad.y - 52, 50 * w.squad.hp / w.squad.maxHp, 6)
      if (w.squad.holding) { g.lineStyle(2, 0xa5d9ca, .6); g.strokeCircle(w.squad.x, w.squad.y, 30) }
    }
    if (w.huntTeam) {
      this.actor(g, w.huntTeam.x, w.huntTeam.y, w.huntTeam.hp > 0 ? 0x929b75 : 0x775c58, .95, false)
      g.fillStyle(0x0b1718); g.fillRect(w.huntTeam.x - 25, w.huntTeam.y - 52, 50, 6)
      g.fillStyle(0xb8c58d); g.fillRect(w.huntTeam.x - 25, w.huntTeam.y - 52, 50 * w.huntTeam.hp / w.huntTeam.maxHp, 6)
    }
    if (w.map.siegeDurations) {
      const e = eventsForChapter(w.chapter.id).find(event => event.kind === 'siege')!
      const stage = eventProgress(gameStore.getSnapshot().state, w.chapter.id, e.id).stage
      e.checkpoints!.slice(1).forEach((point, index) => {
        const passed = stage > index + 1, active = w.siegeRun?.stage === index + 1
        g.fillStyle(passed ? 0x85c9b1 : 0xb0bfd6, .1); g.fillCircle(point.x, point.y, 65)
        g.lineStyle(active ? 3 : 1, passed ? 0x85c9b1 : 0xc5d5eb, .7); g.strokeCircle(point.x, point.y, 65)
        if (active && w.siegeRun!.channel > 0) {
          g.lineStyle(5, 0xdfcfa4, .8)
          g.beginPath(); g.arc(point.x, point.y, 69, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * w.siegeRun!.channel / w.map.siegeDurations![index]); g.strokePath()
        }
      })
    }
    if (w.map.towerFloors) {
      const stage = eventProgress(gameStore.getSnapshot().state, w.chapter.id).stage
      for (const [index, floor] of w.map.towerFloors.entries()) {
        const active = w.towerRun?.phase === index + 1, passed = stage > index + 1
        g.fillStyle(passed ? 0x85c9b1 : active ? 0xd08259 : 0x9b7463, .08); g.fillCircle(floor.center.x, floor.center.y, floor.radius)
        g.lineStyle(active ? 3 : 1, passed ? 0x85c9b1 : 0xdaab80, .6); g.strokeCircle(floor.center.x, floor.center.y, floor.radius)
        g.fillStyle(0x82cdb5, .13); g.fillCircle(floor.cooling.x, floor.cooling.y, 50)
        g.lineStyle(2, 0x8bdcc4, .6); g.strokeCircle(floor.cooling.x, floor.cooling.y, 50)
      }
      for (const warning of w.towerRun?.warnings ?? []) {
        g.fillStyle(0xda805d, .16); g.fillCircle(warning.x, warning.y, warning.radius)
        g.lineStyle(3, 0xf2ac87, .8); g.strokeCircle(warning.x, warning.y, warning.radius)
      }
    }
    if (w.map.heatZone) {
      const z = w.map.heatZone
      g.fillStyle(0xcb6e45, .06); g.fillRect(z.x, z.y, z.w, z.h)
      g.lineStyle(2, 0xd89871, .4); g.strokeRect(z.x, z.y, z.w, z.h)
      for (const point of z.cooling) {
        g.fillStyle(0x82cdb5, .14); g.fillCircle(point.x, point.y, 70)
        g.lineStyle(2, 0x8bdbc3, .7); g.strokeCircle(point.x, point.y, 70)
      }
      for (const warning of w.flameRun?.warnings ?? []) {
        const color = w.flameRun!.phase === 3 ? 0xd88761 : 0x87cbae
        g.fillStyle(color, .2); g.fillCircle(warning.x, warning.y, warning.radius)
        g.lineStyle(3, color); g.strokeCircle(warning.x, warning.y, warning.radius)
      }
    }
    if (w.map.survivalZone) {
      const z = w.map.survivalZone
      g.fillStyle(0x9068b1, .12); g.fillRect(z.x, z.y, z.w, z.h)
      g.lineStyle(2, 0xb78bca, .5); g.strokeRect(z.x, z.y, z.w, z.h)
      g.fillStyle(0x6e4c85, .7); g.fillEllipse(1120, 135, 90, 44); g.fillTriangle(1145, 135, 1175, 105, 1190, 130)
      for (const warning of w.survival?.warnings ?? []) {
        g.fillStyle(0xa367c4, .2); g.fillCircle(warning.x, warning.y, warning.radius)
        g.lineStyle(3, 0xd6a2e7); g.strokeCircle(warning.x, warning.y, warning.radius)
      }
    }
    if (w.barrierClosed()) {
      const door = w.map.eventBarrier!.obstacle
      g.fillStyle(0x746c58); g.fillRect(door.x, door.y, door.w, door.h)
      g.lineStyle(3, 0xe8c98c); g.strokeRect(door.x, door.y, door.w, door.h)
      for (let i = 0; i < 3; i++) { g.fillStyle(0xd9bf84); g.fillCircle(door.x + door.w / 2, door.y + 22 + i * 28, 6) }
    }
    for (const event of eventsForChapter(w.chapter.id)) {
      const progress = eventProgress(gameStore.getSnapshot().state, w.chapter.id, event.id)
      if (event.kind === 'stone') {
        g.fillStyle(0x939d8f); g.fillRoundedRect(event.npc.x - 23, event.npc.y - 35, 46, 55, 6)
        g.lineStyle(3, progress.stage === 4 ? 0x8ee4b3 : 0xe8c98c); g.strokeRoundedRect(event.npc.x - 23, event.npc.y - 35, 46, 55, 6)
      } else {
        const npc = event.kind === 'escort' && w.escort ? w.escort : event.npc
        this.actor(g, npc.x, npc.y, event.kind === 'escort' && w.escort?.hp === 0 ? 0x775c58 : 0x729d96, 1, false)
      }
      const npc = event.kind === 'escort' && w.escort ? w.escort : event.npc
      g.lineStyle(2, 0x9bd7cb, .5); g.strokeCircle(npc.x, npc.y, 35)
      if (event.kind === 'escort' && w.escort) {
        g.fillStyle(0x101d19); g.fillRect(npc.x - 25, npc.y - 55, 50, 6)
        g.fillStyle(0x8fd2b1); g.fillRect(npc.x - 25, npc.y - 55, 50 * w.escort.hp / w.escort.maxHp, 6)
      }
      if (event.dummy) {
        g.fillStyle(progress.stage > 0 ? 0xcdb786 : 0x9d7757); g.fillRect(event.dummy.x - 9, event.dummy.y - 32, 18, 50)
        g.fillRect(event.dummy.x - 27, event.dummy.y - 19, 54, 9)
        g.lineStyle(2, 0xe8c98c, .5); g.strokeCircle(event.dummy.x, event.dummy.y, 28)
      }
      event.checkpoints?.forEach((point, index) => {
        const step = event.kind === 'competition' ? progress.stage - 1 : event.kind === 'tournament' ? (progress.stage === 0 ? 0 : progress.stage <= 12 ? Math.floor((progress.stage - 1) / 4) + 1 : 4) : event.kind === 'survival' ? (progress.stage === 0 ? 0 : progress.stage === 2 ? 1 : progress.stage === 3 ? 2 : -1) : progress.stage
        const active = progress.started && index === step && (event.kind !== 'competition' || progress.choice === 'premium')
        g.fillStyle(index < step ? 0x739e8e : 0x6a6557); g.fillRoundedRect(point.x - 14, point.y - 28, 28, 42, 4)
        if (event.kind === 'cave' && index === 2) {
          g.fillStyle(progress.stage >= 3 ? 0x58695c : 0xb39152); g.fillRect(point.x - 24, point.y - 16, 48, 32)
          g.lineStyle(2, 0xebce92); g.strokeRect(point.x - 24, point.y - 16, 48, 32)
        }
        if ((event.kind === 'certification' && index === 1) || (event.kind === 'tournament' && index > 0)) {
          g.fillStyle(0x8c7556); g.fillRoundedRect(point.x - 28, point.y - 20, 56, 45, 12)
          g.lineStyle(4, 0xd1b382); g.strokeEllipse(point.x, point.y - 20, 56, 18)
          g.fillStyle(progress.stage >= 2 && progress.stage <= 4 ? 0xf0ac68 : 0xad8355); g.fillTriangle(point.x - 18, point.y + 32, point.x, point.y + 3, point.x + 18, point.y + 32)
        }
        if (event.kind === 'rescue' && index > 0) {
          const released = progress.started && progress.stage > index
          this.actor(g, point.x, point.y, released ? 0x729d96 : 0x9c8559, .85, false)
          if (!released) {
            g.lineStyle(3, w.guardsRemaining(event.id, index) > 0 ? 0xbe8163 : 0xaab28c)
            g.strokeRect(point.x - 27, point.y - 45, 54, 66)
            for (let x = -15; x < 25; x += 15) g.lineBetween(point.x + x, point.y - 45, point.x + x, point.y + 21)
          }
        }
        g.lineStyle(active ? 4 : 1, active ? 0xf0d498 : 0x9da688, .8); g.strokeCircle(point.x, point.y, active ? 34 : 24)
      })
    }
    const reduced = gameStore.getSnapshot().state.settings.reducedMotion
    for (const h of w.herbs) if (h.available) {
      const glow = reduced ? .22 : .2 + .1 * Math.sin(w.elapsed * 3 + h.x)
      g.fillStyle(0x8ce7ae, glow); g.fillCircle(h.x, h.y, 21)
      g.lineStyle(2, 0xa7dba5); g.lineBetween(h.x, h.y + 6, h.x, h.y - 13)
      g.fillStyle(0x91c993); g.fillEllipse(h.x - 6, h.y - 4, 12, 6); g.fillEllipse(h.x + 6, h.y - 10, 12, 7)
    }
    g.lineStyle(1, 0xe3bb7c, reduced ? .35 : .3 + Math.sin(w.elapsed * 2) * .1); g.strokeCircle(gate.x, gate.y, reduced ? 45 : 45 + Math.sin(w.elapsed * 2) * 3)
    for (const e of w.enemies) {
      if (e.hp <= 0) continue
      if (e.patrol) {
        g.fillStyle(e.alert >= 1 ? 0xcf7452 : 0xd4b776, e.alert >= 1 ? .08 : .035); g.fillCircle(e.x, e.y, e.patrol.detectionRadius)
        g.lineStyle(1, e.alert >= 1 ? 0xe29471 : 0xc4b888, .3); g.strokeCircle(e.x, e.y, e.patrol.detectionRadius)
        g.fillStyle(0x1d2420); g.fillRect(e.x - 24, e.y - 59, 48, 5)
        g.fillStyle(e.alert >= 1 ? 0xe28b68 : 0xdac18a); g.fillRect(e.x - 24, e.y - 59, e.alert * 48, 5)
      }
      if (e.windup > 0) {
        for (const target of [e.target, ...(e.secondary ?? [])]) {
          g.fillStyle(0xc75b45, .16); g.fillCircle(target.x, target.y, e.radius)
          g.lineStyle(2.5, 0xf4a17a, .8); g.strokeCircle(target.x, target.y, e.radius)
          g.lineStyle(4, 0xecaa75, .7); g.beginPath(); g.arc(target.x, target.y, e.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - e.windup)); g.strokePath()
        }
        if (e.type === 'boss') { g.lineStyle(e.duel?.move === 'thrust' ? 5 : 1, e.duel ? 0xa1d8cc : 0xe8aa7b, .5); g.lineBetween(e.x, e.y, e.target.x, e.target.y) }
      }
      const size = e.type === 'boss' ? 1.65 : 1
      const color = e.duel ? 0x88a8a1 : e.type === 'boss' ? 0x9f5f54 : e.type === 'mage' ? 0x776489 : e.type === 'hunter' ? 0x927750 : 0x7b8061
      this.actor(g, e.x, e.y, color, size, false)
      if (e.ranking && e.windup > 0) { g.fillStyle(0x83c7dc, .12); g.fillCircle(e.x, e.y, 45); g.lineStyle(3, 0x9bd5e0, .8); g.strokeCircle(e.x, e.y, 45) }
      if (e.sect && e.windup > 0) { g.fillStyle(0xc0d1e7, .12); g.fillCircle(e.x, e.y, 52); g.lineStyle(3, 0xc0d1e7, .8); g.strokeCircle(e.x, e.y, 52) }
      if (e.burn > 0) { g.lineStyle(2, 0x6de4bc, .8); g.strokeCircle(e.x, e.y, 23 * size) }
      g.fillStyle(0x0b1718, .8); g.fillRoundedRect(e.x - 23 * size, e.y - 48 * size, 46 * size, 5, 2)
      g.fillStyle(e.type === 'boss' ? 0xd38d75 : 0xc8b38d); g.fillRoundedRect(e.x - 23 * size, e.y - 48 * size, 46 * size * e.hp / e.maxHp, 5, 2)
    }
    const flame = gameStore.getSnapshot().state.flame
    const color = flame === 'lotus' ? 0x6de4bc : flame === 'star' ? 0xb59af5 : flame === 'pure' ? 0xf4c1d3 : 0xeac18c
    if (p.invincible > 0) { g.lineStyle(2, color, .6); g.strokeCircle(p.x, p.y, 30) }
    this.actor(g, p.x, p.y, p.hit > 0 ? 0xad6a58 : 0x293d41, 1.05, true)
    g.lineStyle(3, 0xd1c5ac, .9)
    g.lineBetween(p.x + Math.cos(p.facing) * 14, p.y + Math.sin(p.facing) * 14, p.x + Math.cos(p.facing) * 43, p.y + Math.sin(p.facing) * 43)
    for (const effect of w.effects) {
      const f = effect.time / effect.maxTime
      g.lineStyle(3 + f * 4, effect.color, f * .9)
      if (effect.kind === 'ring') {
        g.fillStyle(effect.color, f * .1); g.fillCircle(effect.x, effect.y, effect.radius * (reduced ? .9 : 1 - f * .35))
        g.strokeCircle(effect.x, effect.y, effect.radius * (reduced ? .9 : 1 - f * .35))
      } else {
        g.beginPath(); g.arc(effect.x, effect.y, effect.radius * (1 - f * .2), p.facing - 1, p.facing + 1); g.strokePath()
      }
    }
    for (let i = 0; i < this.floats.length; i++) {
      const text = this.floats[i], f = w.floats[i]
      if (!f) { text.setVisible(false); continue }
      text.setVisible(true).setText(f.text).setPosition(f.x, f.y).setColor(f.color).setAlpha(Math.min(1, f.time * 2))
    }
  }
  private actor(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, scale: number, player: boolean) {
    g.fillStyle(0x061515, .35); g.fillEllipse(x + 2, y + 13 * scale, 35 * scale, 14 * scale)
    g.fillStyle(color); g.fillTriangle(x - 16 * scale, y + 12 * scale, x, y - 23 * scale, x + 16 * scale, y + 12 * scale)
    g.fillRoundedRect(x - 9 * scale, y - 21 * scale, 18 * scale, 25 * scale, 4)
    g.fillStyle(player ? 0xe3c5a0 : 0xc2ac8c); g.fillCircle(x, y - 28 * scale, 8 * scale)
    g.fillStyle(0x172426); g.fillEllipse(x, y - 34 * scale, 18 * scale, 9 * scale)
    g.lineStyle(2 * scale, player ? 0xc4a67d : 0x453f38); g.lineBetween(x - 9 * scale, y - 1 * scale, x + 9 * scale, y - 1 * scale)
    if (player) {
      g.lineStyle(2, 0x314747); g.lineBetween(x - 3, y - 37, x - 16, y - 28)
      g.fillStyle(0x142324); g.fillRoundedRect(x - 18, y - 22, 7, 32, 2)
    }
  }
}
