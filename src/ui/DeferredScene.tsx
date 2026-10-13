import { StatusParagraph } from './NativeRegions'
import { Suspense, type ComponentType, type ReactNode } from 'react'
import type { GameState } from '../core/model'
export default function DeferredScene({ message, children }: { message: string; children: ReactNode }) {
  return <Suspense fallback={<StatusParagraph>{message}</StatusParagraph>}>{children}</Suspense>
}

export function deferredRoute<P extends { state: GameState; onBack: () => void }>(Scene: ComponentType<P>, message: string, state: GameState, onBack: () => void, props: Omit<P, 'state' | 'onBack'>) {
  return <DeferredScene message={message}><Scene {...{ ...props, state, onBack } as P} /></DeferredScene>
}
