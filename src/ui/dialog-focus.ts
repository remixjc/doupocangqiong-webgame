function available(element: HTMLElement) {
  return element.isConnected && !element.matches(':disabled')
    && !element.closest('[hidden],[inert]') && element.getClientRects().length > 0
}

/** Re-read controls after each event: story steps and import previews may replace buttons. */
export function bindDialogFocus(dialog: HTMLElement, documentTarget: Document, fallback: () => HTMLElement | null) {
  const previous = documentTarget.activeElement as HTMLElement | null
  const oldTabIndex = dialog.getAttribute('tabindex')
  if (oldTabIndex === null) dialog.setAttribute('tabindex', '-1')
  const controls = () => [...dialog.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]')]
    .filter(element => element.tabIndex >= 0 && available(element))
  let disposed = false
  const first = () => (controls()[0] ?? dialog).focus()
  const keepInside = () => {
    if (!dialog.contains(documentTarget.activeElement)) first()
  }
  const trap = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const nodes = controls(), current = documentTarget.activeElement as HTMLElement | null
    if (!nodes.length) { event.preventDefault(); dialog.focus(); return }
    const index = current ? nodes.indexOf(current) : -1
    if (index < 0 || event.shiftKey && index === 0 || !event.shiftKey && index === nodes.length - 1) {
      event.preventDefault()
      nodes[event.shiftKey ? nodes.length - 1 : 0].focus()
    }
  }
  first()
  documentTarget.addEventListener('keydown', trap)
  documentTarget.addEventListener('focusin', keepInside)
  return () => {
    if (disposed) return
    disposed = true
    documentTarget.removeEventListener('keydown', trap)
    documentTarget.removeEventListener('focusin', keepInside)
    if (oldTabIndex === null) dialog.removeAttribute('tabindex')
    const restore = previous && previous.tabIndex >= 0 && available(previous) ? previous : fallback()
    if (restore && available(restore)) restore.focus()
  }
}
