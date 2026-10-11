import { describe, expect, it } from 'vitest'
import { bindDialogFocus } from '../src/ui/dialog-focus'

class FocusDocument extends EventTarget {
  activeElement: FocusNode | null = null
}
class FocusNode {
  isConnected = true
  disabled = false
  hidden = false
  tabIndex = 0
  visible = true
  children: FocusNode[] = []
  attributes = new Map<string, string>()
  focusCount = 0
  constructor(private doc: FocusDocument) {}
  matches() { return this.disabled }
  closest() { return this.hidden ? this : null }
  getClientRects() { return this.visible ? [{}] : [] }
  contains(element: FocusNode | null): boolean { return element === this || this.children.some(child => child.contains(element)) }
  querySelectorAll() { return this.children }
  getAttribute(key: string) { return this.attributes.get(key) ?? null }
  setAttribute(key: string, value: string) { this.attributes.set(key, value) }
  removeAttribute(key: string) { this.attributes.delete(key) }
  focus() {
    this.doc.activeElement = this; this.focusCount++
    this.doc.dispatchEvent(new Event('focusin'))
  }
}
function fixture() {
  const doc = new FocusDocument()
  const previous = new FocusNode(doc), dialog = new FocusNode(doc), fallback = new FocusNode(doc)
  const first = new FocusNode(doc), middle = new FocusNode(doc), last = new FocusNode(doc)
  dialog.children = [first, middle, last]; previous.focus()
  const bind = () => bindDialogFocus(dialog as unknown as HTMLElement, doc as unknown as Document, () => fallback as unknown as HTMLElement)
  const tab = (shiftKey = false) => {
    const event = new Event('keydown', { cancelable: true })
    Object.defineProperties(event, { key: { value: 'Tab' }, shiftKey: { value: shiftKey } })
    doc.dispatchEvent(event)
    return event.defaultPrevented
  }
  return { doc, previous, dialog, fallback, first, middle, last, bind, tab }
}

describe('动态对话框焦点生命周期', () => {
  it('初始首个有效控件，正反向边界循环，中间正常Tab不拦截', () => {
    const f = fixture(), dispose = f.bind()
    expect(f.doc.activeElement).toBe(f.first)
    expect(f.tab(true)).toBe(true); expect(f.doc.activeElement).toBe(f.last)
    expect(f.tab()).toBe(true); expect(f.doc.activeElement).toBe(f.first)
    f.middle.focus(); expect(f.tab()).toBe(false)
    dispose(); expect(f.doc.activeElement).toBe(f.previous)
  })
  it('过滤隐藏、禁用、负tabIndex和无布局框的控件', () => {
    const f = fixture()
    const disabled = new FocusNode(f.doc), hidden = new FocusNode(f.doc), negative = new FocusNode(f.doc), invisible = new FocusNode(f.doc)
    disabled.disabled = true; hidden.hidden = true; negative.tabIndex = -1; invisible.visible = false
    f.dialog.children.unshift(disabled, hidden, negative, invisible)
    const dispose = f.bind()
    expect(f.doc.activeElement).toBe(f.first)
    f.tab(true); expect(f.doc.activeElement).toBe(f.last)
    dispose()
  })
  it('焦点跑到窗口外会返回，当前控件被动态移除后Tab重新定位', () => {
    const f = fixture(), dispose = f.bind()
    f.previous.focus(); expect(f.doc.activeElement).toBe(f.first)
    f.dialog.children = [f.middle, f.last]
    expect(f.tab()).toBe(true); expect(f.doc.activeElement).toBe(f.middle)
    f.dialog.children = [f.last]
    expect(f.tab(true)).toBe(true); expect(f.doc.activeElement).toBe(f.last)
    dispose()
  })
  it('无可用控件时聚焦窗口自身，重新加入按钮后Tab可进入', () => {
    const f = fixture(); f.dialog.children = []
    const dispose = f.bind()
    expect(f.doc.activeElement).toBe(f.dialog)
    expect(f.dialog.getAttribute('tabindex')).toBe('-1')
    expect(f.tab()).toBe(true)
    f.dialog.children = [f.last]
    expect(f.tab()).toBe(true); expect(f.doc.activeElement).toBe(f.last)
    dispose(); expect(f.dialog.getAttribute('tabindex')).toBeNull()
  })
  it.each(['isConnected', 'disabled', 'hidden', 'visible'] as const)('旧控件不可用（%s）时回到场景备用焦点', property => {
    const f = fixture(), dispose = f.bind()
    f.previous[property] = property === 'disabled' || property === 'hidden'
    dispose()
    expect(f.doc.activeElement).toBe(f.fallback)
  })
  it('重复清理不重新抢焦点，保留已有tabindex，20轮装卸无残留拦截', () => {
    const f = fixture(); f.dialog.setAttribute('tabindex', '0')
    for (let i = 0; i < 20; i++) {
      const dispose = f.bind()
      dispose()
      const count = f.previous.focusCount
      dispose(); expect(f.previous.focusCount).toBe(count)
      f.fallback.focus(); expect(f.doc.activeElement).toBe(f.fallback)
      expect(f.tab()).toBe(false)
      f.previous.focus()
    }
    expect(f.dialog.getAttribute('tabindex')).toBe('0')
  })
  it('不可聚焦的页面背景不是有效恢复点', () => {
    const f = fixture(); f.previous.tabIndex = -1
    const dispose = f.bind()
    dispose(); expect(f.doc.activeElement).toBe(f.fallback)
  })
})
