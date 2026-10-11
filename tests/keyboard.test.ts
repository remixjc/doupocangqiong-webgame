import { describe, expect, it } from 'vitest'
import { acceptsGameplayKey, keyboardSurface, BufferedMovement } from '../src/game/keyboard'
import { FixedClock } from '../src/game/clock'

describe('键盘焦点与游戏快捷键', () => {
  it('按钮保留Enter/空格原生激活，场景保留空格闪避', () => {
    for (const key of [' ', 'Spacebar', 'Enter']) {
      expect(acceptsGameplayKey({ key }, 'control', false, false)).toBe(false)
      expect(acceptsGameplayKey({ key }, 'scene', false, false)).toBe(true)
    }
    for (const key of ['j', 'w', 'ArrowLeft', '1', 'e']) {
      expect(acceptsGameplayKey({ key }, 'control', false, false)).toBe(true)
    }
  })
  it('表单、暂停、后台与系统组合键不向游戏传递输入', () => {
    for (const key of [' ', 'j', '1', 'ArrowDown']) {
      expect(acceptsGameplayKey({ key }, 'field', false, false)).toBe(false)
      expect(acceptsGameplayKey({ key }, 'scene', true, false)).toBe(false)
      expect(acceptsGameplayKey({ key }, 'scene', false, true)).toBe(false)
      for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
        expect(acceptsGameplayKey({ key, [modifier]: true }, 'scene', false, false)).toBe(false)
      }
    }
  })
  it('嵌套图标/标签按祖先分类，输入祖先优先，没有元素时仍可操作场景', () => {
    const target = (field: boolean, control: boolean) => ({
      closest: (selector: string) => selector.startsWith('input') ? field ? {} as Element : null : control ? {} as Element : null,
    })
    expect(keyboardSurface(target(true, true))).toBe('field')
    expect(keyboardSurface(target(false, true))).toBe('control')
    expect(keyboardSurface(target(false, false))).toBe('scene')
    expect(keyboardSurface(null)).toBe('scene')
  })
  it('两帧之间已松开的移动点按保留到一次物理步，零步帧不吞输入，多步帧不重复', () => {
    const movement = new BufferedMovement(), clock = new FixedClock(), held = new Set<string>(), directions: { x: number; y: number }[] = []
    movement.record('ArrowRight')
    const step = () => { directions.push(movement.read(held)); movement.clear() }
    clock.advance(5, step)
    expect(directions).toEqual([]); expect(movement.read(held)).toEqual({ x: 1, y: 0 })
    clock.advance(45, step)
    expect(directions[0]).toEqual({ x: 1, y: 0 })
    expect(directions.slice(1).every(value => value.x === 0 && value.y === 0)).toBe(true)
  })
  it('持续按住、触控相加和同时反向仍原样；暂停/失焦清缓冲后没有迟来的移动', () => {
    const movement = new BufferedMovement(), held = new Set(['w'])
    movement.record('w'); movement.record('ArrowRight')
    expect(movement.read(held)).toEqual({ x: 1, y: -1 })
    movement.clear(); expect(movement.read(held)).toEqual({ x: 0, y: -1 })
    held.clear(); movement.record('a'); movement.record('d')
    expect(movement.read(held)).toEqual({ x: 0, y: 0 })
    movement.record('e'); movement.record('j'); movement.clear()
    expect(movement.read(held)).toEqual({ x: 0, y: 0 })
  })
})
