import type { GameState } from '../core/model'
import { serializeSave } from '../core/save-serialize'

interface DownloadLink {
  href: string
  download: string
  hidden: boolean | string
  click(): void
  remove(): void
}
interface DownloadHost {
  createUrl(blob: Blob): string
  revokeUrl(url: string): void
  createLink(): DownloadLink
  attach(link: DownloadLink): void
  defer(cleanup: () => void): void
}
const browserHost: DownloadHost = {
  createUrl: blob => URL.createObjectURL(blob),
  revokeUrl: url => URL.revokeObjectURL(url),
  createLink: () => document.createElement('a'),
  attach: link => document.body.appendChild(link as HTMLAnchorElement),
  defer: cleanup => { window.setTimeout(cleanup, 1000) },
}

/** Export the live persistent state without reading or writing IndexedDB. */
export function downloadSaveBackup(state: GameState, host: DownloadHost = browserHost): void {
  const blob = new Blob([serializeSave(state)], { type: 'application/json' })
  const url = host.createUrl(blob)
  let link: DownloadLink | undefined, released = false
  const release = () => { if (!released) { released = true; host.revokeUrl(url) } }
  try {
    link = host.createLink()
    link.href = url; link.download = `异火之路-第${state.chapter}章-${Date.now()}.json`; link.hidden = true
    host.attach(link)
    link.click()
    host.defer(release)
  } catch (error) {
    release()
    throw error
  } finally { link?.remove() }
}
