import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PrimaryButton, SecondaryButton } from '../src/ui/Buttons'

const hooks = vi.hoisted(() => ({ current: null as null | Harness }))
interface Harness {
  cursor: number
  cells: unknown[]
  effects: (() => void)[]
  begin(): void
  flush(): void
  state<T>(initial: T): [T, (value: T | ((old: T) => T)) => void]
  ref<T>(initial: T): { current: T }
  effect(callback: () => void, dependencies: unknown[]): void
}
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: <T,>(value: T) => hooks.current!.state(value),
  useRef: <T,>(value: T) => hooks.current!.ref(value),
  useEffect: (callback: () => void, dependencies: unknown[]) => hooks.current!.effect(callback, dependencies),
}))
import { useReturningScene } from '../src/ui/use-returning-scene'
import { useSceneRoutes } from '../src/ui/use-scene-routes'
function harness(): Harness {
  return {
    cursor: 0, cells: [], effects: [],
    begin() { this.cursor = 0; this.effects = []; hooks.current = this },
    flush() { for (const callback of this.effects) callback(); this.effects = [] },
    state<T>(initial: T) {
      const index = this.cursor++
      if (!(index in this.cells)) this.cells[index] = initial
      return [this.cells[index] as T, value => {
        const old = this.cells[index] as T
        this.cells[index] = typeof value === 'function' ? (value as (old: T) => T)(old) : value
      }]
    },
    ref<T>(initial: T) {
      const index = this.cursor++
      if (!(index in this.cells)) this.cells[index] = { current: initial }
      return this.cells[index] as { current: T }
    },
    effect(callback, dependencies) {
      const index = this.cursor++, previous = this.cells[index] as unknown[] | undefined
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) this.effects.push(callback)
      this.cells[index] = dependencies
    },
  }
}
function pair(count = 53) {
  const oldHarness = harness(), currentHarness = harness()
  let old: ReturnType<typeof useReturningScene>[], current: ReturnType<typeof useSceneRoutes>
  const oldFocus: number[] = [], currentFocus: number[] = []
  const render = () => {
    oldHarness.begin(); old = Array.from({ length: count }, () => useReturningScene())
    currentHarness.begin(); current = useSceneRoutes(count)
    for (let i = 0; i < count; i++) {
      old[i][2].current = { focus: () => { oldFocus.push(i) } } as HTMLButtonElement
      const ref = current.button(i, '入口').props.ref
      ref.current = { focus: () => { currentFocus.push(i) } }
      expect(!!current.active[i]).toBe(old[i][0])
    }
    oldHarness.flush(); currentHarness.flush()
    expect(currentFocus).toEqual(oldFocus)
  }
  render()
  return {
    render, oldFocus, currentFocus,
    set(i: number, value: boolean) { old[i][1](value); current.set(i, value) },
    back(i: number) { old[i][3](); current.back(i)() },
    button(i: number) { return { old: <SecondaryButton ref={old[i][2]} onClick={() => old[i][1](true)}>入口</SecondaryButton>, current: current.button(i, '入口') } },
    primary(i: number) { return { old: <PrimaryButton ref={old[i][2]} onClick={() => old[i][1](true)}>入口</PrimaryButton>,
      current: <PrimaryButton ref={current.entry(i)} onClick={() => current.set(i, true)}>入口</PrimaryButton> } },
  }
}
afterEach(() => { hooks.current = null })
describe('准备路线独立旗标与返回焦点', () => {
  it('准备单53个原入口分别打开与返回，原人物场景按钮类型/props次序/原生markup相等', () => {
    const p = pair()
    for (let i=0;i<53;i++) {
      const buttons=p.button(i)
      expect(buttons.current.type).toBe(buttons.old.type)
      expect(Object.keys(buttons.current.props)).toEqual(Object.keys(buttons.old.props))
      expect(renderToStaticMarkup(buttons.current)).toBe(renderToStaticMarkup(buttons.old))
      buttons.old.props.onClick!({} as never); buttons.current.props.onClick()
      p.render(); p.back(i); p.render()
    }
    expect(p.currentFocus).toEqual(Array.from({ length: 53 }, (_, i) => i))
  })
  it('多个旗标保持独立；同次返回沿原hook顺序依次回焦，重开不丢引用', () => {
    const p=pair(), refs=[0,17,50].map(i=>p.button(i).current.props.ref)
    for(const i of [50,17,0])p.set(i,true)
    p.render()
    for(const i of [50,17,0])p.back(i)
    p.render(); expect(p.currentFocus).toEqual([0,17,50])
    for(const [n,i] of [0,17,50].entries())expect(p.button(i).current.props.ref).toBe(refs[n])
  })
  it('转到步行只关闭当前路线，不申请返回焦点或清掉另一独立旗标', () => {
    const p=pair();p.set(13,true);p.set(14,true);p.render()
    p.set(13,false);p.render();expect(p.currentFocus).toEqual([])
    p.back(14);p.render();expect(p.currentFocus).toEqual([14])
  })
  it('重复打开和重复关闭保持原结果，未挂载入口安全跳过回焦', () => {
    const p=pair();p.set(21,true);p.render();p.set(21,true);p.render()
    p.back(21);p.render();p.set(21,false);p.render();expect(p.currentFocus).toEqual([21])
    const env=harness();env.begin();let r=useSceneRoutes(51);env.flush()
    r.set(2,true);env.begin();r=useSceneRoutes(51);env.flush()
    r.back(2)();env.begin();r=useSceneRoutes(51)
    expect(()=>env.flush()).not.toThrow();expect(!!r.active[2]).toBe(false)
  })
  it('步行23个入口保留主按钮、独立引用和返回；连续转场不会申请旧入口焦点', () => {
    const p = pair(23)
    for (let i = 0; i < 23; i++) {
      const buttons = p.primary(i), ref = buttons.current.props.ref
      expect(buttons.current.type).toBe(buttons.old.type)
      expect(Object.keys(buttons.current.props)).toEqual(Object.keys(buttons.old.props))
      expect(renderToStaticMarkup(buttons.current)).toBe(renderToStaticMarkup(buttons.old))
      buttons.old.props.onClick!({} as never); buttons.current.props.onClick!({} as never)
      p.render(); expect(p.primary(i).current.props.ref).toBe(ref)
      p.back(i); p.render()
    }
    expect(p.currentFocus).toEqual(Array.from({ length: 23 }, (_, i) => i))
    for (let i = 1; i < 22; i++) {
      p.set(i, true); p.render(); p.set(i, false); p.set(i + 1, true); p.render()
    }
    expect(p.currentFocus).toEqual(Array.from({ length: 23 }, (_, i) => i))
    p.back(22); p.render()
    expect(p.currentFocus.at(-1)).toBe(22)
  })
})
