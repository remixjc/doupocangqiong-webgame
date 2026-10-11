import { describe, expect, it, vi } from 'vitest'
import type Phaser from 'phaser'
import { ActorMotion, type ActorSample } from '../src/game/actor-motion'
import { drawActor } from '../src/game/draw-actor'
import { CombatWorld } from '../src/game/combat'
import { chapters } from '../src/content/chapters'
import { initialState } from '../src/core/model'

describe('程序人物动作', () => {
  it('按真实位移摆动，同一模拟时刻冻结，停下或传送后回待机', () => {
    const motion = new ActorMotion(), actor = { x: 0, y: 0 }
    expect(motion.pose(actor, 0, false).mode).toBe('idle')
    actor.x = 8
    const walking = motion.pose(actor, 1 / 60, false)
    expect(walking.mode).toBe('move')
    expect(Math.abs(walking.stride)).toBeGreaterThan(0)
    for (let i = 0; i < 600; i++) expect(motion.pose(actor, 1 / 60, false)).toEqual(walking)
    expect(motion.pose(actor, 2 / 60, false).mode).toBe('idle')
    actor.x = 600
    expect(motion.pose(actor, 3 / 60, false).mode).toBe('idle')
    actor.x = 608
    expect(motion.pose(actor, 4 / 60, false).mode).toBe('move')
    expect(motion.pose(actor, 0, false).mode).toBe('idle')
  })

  it('出招只作用于玩家，受击/闪避/死亡优先，招式时间使用模拟时间', () => {
    const motion = new ActorMotion(), player: ActorSample = { x: 0, y: 0, hp: 100, facing: Math.PI }
    motion.cue('attack', 1)
    expect(motion.pose(player, 1.14, false, true)).toMatchObject({ mode: 'attack', side: -1, reach: 12 })
    expect(motion.pose({ x: 0, y: 0 }, 1.14, false).mode).toBe('idle')
    expect(motion.pose(player, 1.3, false, true).mode).toBe('idle')
    motion.cue('skill', 2)
    expect(motion.pose(player, 2.14, false, true).reach).toBeCloseTo(16)
    player.roll = .2
    expect(motion.pose(player, 2.14, false, true)).toMatchObject({ mode: 'dodge', squash: .65 })
    player.hit = .1
    expect(motion.pose(player, 2.14, false, true).mode).toBe('hurt')
    player.hp = 0
    expect(motion.pose(player, 2.14, false, true).mode).toBe('dead')
  })

  it('减弱动态保留静态动作信号，消除摆动、偏移、压缩和挥动', () => {
    const motion = new ActorMotion()
    motion.cue('skill', 0)
    for (const sample of [
      { x: 0, y: 0 }, { x: 0, y: 0, roll: .2 },
      { x: 0, y: 0, hit: .1 }, { x: 0, y: 0, windup: .5 },
    ]) {
      expect(motion.pose(sample, .14, true, true)).toMatchObject({
        bob: 0, stride: 0, leanX: 0, leanY: 0, squash: 1, sweep: 0,
      })
    }
    expect(motion.pose({ x: 0, y: 0 }, .14, true, true)).toMatchObject({ mode: 'skill', reach: 16 })
    expect(motion.pose({ x: 0, y: 0, windup: .5 }, .14, true).mode).toBe('windup')
  })

  it('不同实体的移动轨迹互不干扰，冻结采样对象不被修改', () => {
    const motion = new ActorMotion(), first = { x: 0, y: 0 }, second = Object.freeze({ x: 10, y: 20, hp: 50 })
    motion.pose(first, 0, false); motion.pose(second, 0, false)
    first.x = 4
    expect(motion.pose(first, 1, false).mode).toBe('move')
    expect(motion.pose(second, 1, false).mode).toBe('idle')
    expect(second).toEqual({ x: 10, y: 20, hp: 50 })
  })

  it('敌人和护送对象沿真实移动朝向，蓄力面向锁定目标', () => {
    const motion = new ActorMotion(), actor = { x: 100, y: 100, windup: 0, target: { x: 200, y: 100 } }
    motion.pose(actor, 0, false)
    actor.x = 96
    expect(motion.pose(actor, 1 / 60, false)).toMatchObject({ mode: 'move', side: -1 })
    actor.windup = .7
    expect(motion.pose(actor, 2 / 60, false)).toMatchObject({ mode: 'windup', side: 1, reach: -6 })
  })

  it('有效普攻才触发出招提示，冷却拒绝不延长表现；采样不改变世界', () => {
    const motion = new ActorMotion(), state = initialState()
    let cues = 0
    const world = new CombatWorld(chapters[0], {
      state: () => state, collect: () => {}, kill: () => {}, heal: () => false,
      camp: () => {}, notify: () => {}, sound: kind => {
        if (kind === 'attack' || kind === 'skill') { motion.cue(kind, world.elapsed); cues++ }
      },
    })
    const input = { x: 0, y: 0 }
    world.action('attack', input)
    for (let i = 0; i < 20; i++) world.step(input)
    world.action('attack', input)
    expect(cues).toBe(1)
    expect(motion.pose(world.player, world.elapsed, false, true).mode).toBe('idle')
    const before = JSON.stringify({ player: world.player, enemies: world.enemies, state, effects: world.effects })
    for (let i = 0; i < 60; i++) {
      motion.pose(world.player, world.elapsed, false, true)
      world.enemies.forEach(enemy => motion.pose(enemy, world.elapsed, false))
    }
    expect(JSON.stringify({ player: world.player, enemies: world.enemies, state, effects: world.effects })).toBe(before)
  })

  it('闪避与受击绘制保留脚下锚点，减弱动态仍有静态识别标记', () => {
    const ink = {
      fillStyle: vi.fn(), fillEllipse: vi.fn(), lineStyle: vi.fn(), lineBetween: vi.fn(),
      fillTriangle: vi.fn(), fillRoundedRect: vi.fn(), fillCircle: vi.fn(), strokeEllipse: vi.fn(),
    }
    const motion = new ActorMotion()
    const pose = motion.pose({ x: 200, y: 300, roll: .2 }, .1, true, true)
    drawActor(ink as unknown as Phaser.GameObjects.Graphics, 200, 300, 0x293d41, 1, true, pose)
    expect(ink.fillEllipse).toHaveBeenNthCalledWith(1, 202, 313, 35, 14)
    expect(ink.strokeEllipse).toHaveBeenCalledWith(200, 312, 44, 18)
    expect(ink.fillTriangle).toHaveBeenCalledWith(184, 312, 200, 277, 216, 312)
  })
})
