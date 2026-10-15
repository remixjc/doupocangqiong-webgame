import { describe, expect, it, vi } from 'vitest'
import AdventureScene from '../src/game/AdventureScene'
import { chapterById } from '../src/content/chapters'
import { mapForChapter, type MapDefinition } from '../src/content/maps'

// Execute the real environment drawing/ownership code. This display facade
// counts allocated objects and drawing commands, not GPU memory or browser FPS.
vi.mock('phaser', () => ({
  default: { Scene: class {
    children = { list: [] as object[] }
    objects: { kind: string; text?: string; x?: number; y?: number; dead: boolean; commands: unknown[][]; destroy: () => void }[] = []
    add = {
      graphics: () => this.object('graphics'),
      text: (x: number, y: number, text: string) => Object.assign(this.object('text'), { x, y, text }),
      container: (_x: number, _y: number, children: { destroy: () => void }[]) => {
        const container = this.object('container')
        this.children.list = this.children.list.filter(child => !children.includes(child as typeof children[number]))
        const destroy = container.destroy
        container.destroy = () => { children.forEach(child => child.destroy()); destroy() }
        return container
      },
    }
    object(kind: string) {
      const entry = { kind, dead: false, commands: [] as unknown[][], destroy: () => {
        entry.dead = true
        this.children.list = this.children.list.filter(child => child !== proxy)
      } }
      const proxy = new Proxy(entry, { get(target, key) {
        if (key in target) return Reflect.get(target, key)
        return (...args: unknown[]) => { entry.commands.push([key, ...args]); return proxy }
      } })
      this.objects.push(proxy); this.children.list.push(proxy)
      return proxy
    }
  } },
}))

interface DrawFacade {
  world: { map: MapDefinition; chapter: ReturnType<typeof chapterById> }
  objects: { kind: string; text?: string; x?: number; y?: number; dead: boolean; commands: unknown[][] }[]
  children: { list: object[] }
  syncEnvironment: () => void
}
const labels = ['初赛 · 25 / 55 / 45', '复赛 · 65 / 40 / 70', '决赛 · 35 / 75 / 50']
function prepare(map: MapDefinition) {
  const scene = new AdventureScene(vi.fn()) as unknown as DrawFacade
  scene.world = { chapter: chapterById(9), map }
  scene.syncEnvironment()
  return scene
}

describe('炼药大会场地只绘制一套赛台', () => {
  it.each([0, 1, 2, 4])('%i条道路仍各有一个赛台和标签，正好三个', count => {
    const original = mapForChapter(9)
    const map = { ...original, paths: Array.from({ length: count }, (_, i) => original.paths[i % original.paths.length]) }
    const scene = prepare(map)
    const texts = scene.objects.filter(object => labels.includes(object.text ?? ''))
    expect(texts.map(text => [text.x, text.y, text.text])).toEqual(
      labels.map((label, i) => [[580, 850, 1100][i], 470, label]))
    const commands = scene.objects.flatMap(object => object.commands)
    for (const x of [580, 850, 1100]) {
      expect(commands.filter(command => JSON.stringify(command) === JSON.stringify(['strokeCircle', x, 400, 70]))).toHaveLength(1)
      expect(commands.filter(command => JSON.stringify(command) === JSON.stringify(['fillCircle', x, 400, 50]))).toHaveLength(1)
    }
  })

  it('实际28张地图往返：重复同步不分配，切图销毁旧场地及文字，回到大会仍只有一套', () => {
    const scene = prepare(mapForChapter(9))
    for (const id of [...Array.from({ length: 28 }, (_, i) => i + 1), 9]) {
      const previous = scene.objects.filter(object => !object.dead)
      const changed = scene.world.map.id !== mapForChapter(id).id
      scene.world = { chapter: chapterById(id), map: mapForChapter(id) }
      scene.syncEnvironment()
      if (changed) expect(previous.every(object => object.dead)).toBe(true)
      const allocated = scene.objects.length
      scene.syncEnvironment()
      expect(scene.objects).toHaveLength(allocated)
      expect(scene.children.list).toHaveLength(1)
      const currentLabels = scene.objects.filter(object => !object.dead && labels.includes(object.text ?? ''))
      expect(currentLabels.map(object => object.text)).toEqual(id === 9 ? labels : [])
    }
  })
})
