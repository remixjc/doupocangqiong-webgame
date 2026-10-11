/** Menus freeze simulation. Redraw once, or when a persistent event changes. */
export class PauseDrawGate {
  private paused = false
  private revision: unknown
  shouldDraw(paused: boolean, revision: unknown) {
    const draw = !paused || !this.paused || this.revision !== revision
    this.paused = paused
    this.revision = revision
    return draw
  }
}

interface TextNode {
  setVisible(value: boolean): unknown
  setText(value: string): unknown
  setPosition(x: number, y: number): unknown
  setColor(value: string): unknown
  setAlpha(value: number): unknown
}
interface Label { text: string; color: string; x: number; y: number; time: number }
interface Presented { visible: boolean; text?: string; color?: string; x?: number; y?: number; alpha?: number }
const presented = new WeakMap<TextNode, Presented>()

/** Fixed pool: reuse text textures and only apply changed properties. */
export function presentFloat(node: TextNode, label?: Label) {
  const cached = presented.get(node)
  if (!label) {
    if (cached?.visible) { node.setVisible(false); cached.visible = false }
    return
  }
  const previous = cached ?? { visible: false }
  const alpha = Math.min(1, label.time * 2)
  if (!previous.visible) node.setVisible(true)
  if (previous.text !== label.text) node.setText(label.text)
  if (previous.color !== label.color) node.setColor(label.color)
  if (previous.x !== label.x || previous.y !== label.y) node.setPosition(label.x, label.y)
  if (previous.alpha !== alpha) node.setAlpha(alpha)
  previous.visible = true; previous.text = label.text; previous.color = label.color
  previous.x = label.x; previous.y = label.y; previous.alpha = alpha
  if (!cached) presented.set(node, previous)
}
