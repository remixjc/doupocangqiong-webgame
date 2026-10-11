import { describe, expect, it } from 'vitest'
import { acceptsGameplayKey, keyboardSurface } from '../src/game/keyboard'

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
})
