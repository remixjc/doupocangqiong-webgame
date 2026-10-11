/** Visibility can change without blur; release input immediately in either case. */
export function bindFocusLifecycle(
  windowTarget: EventTarget, documentTarget: EventTarget & { readonly hidden: boolean },
  release: () => void, resume: () => void,
) {
  let disposed = false
  const focus = () => { if (!documentTarget.hidden) resume() }
  const visibility = () => { if (documentTarget.hidden) release(); else focus() }
  windowTarget.addEventListener('blur', release)
  windowTarget.addEventListener('focus', focus)
  documentTarget.addEventListener('visibilitychange', visibility)
  return () => {
    if (disposed) return
    disposed = true
    windowTarget.removeEventListener('blur', release)
    windowTarget.removeEventListener('focus', focus)
    documentTarget.removeEventListener('visibilitychange', visibility)
    release()
  }
}
